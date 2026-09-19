# -*- coding: utf-8 -*-
"""
football_api.py
================
Integração com a football-data.org (https://www.football-data.org/).

Documentação oficial: https://docs.football-data.org/general/v4/index.html

Ao contrário da API-Football, o plano gratuito da football-data.org dá
acesso aos jogos da época ATUAL das principais ligas europeias e do
Brasileirão — é por isso que trocámos de fornecedor.

Funções expostas:
- buscar_jogos_do_dia(data): retorna lista de partidas do dia nas ligas monitoradas.
- buscar_medias_gols(time_id, liga_id): retorna médias de gols marcados/sofridos
  com base nas últimas N partidas finalizadas do time (qualquer competição).

Todas as chamadas usam retry com backoff exponencial simples e tratam
erros de rede, timeout e respostas HTTP não esperadas.
"""

import time
import logging
import requests

import config

logger = logging.getLogger("bot_apostas.football_api")


def _headers():
    return {
        "X-Auth-Token": config.FOOTBALL_DATA_API_KEY,
    }


def _request_com_retry(endpoint: str, params: dict) -> dict:
    """
    Executa uma requisição GET com retries. Lança exceção se todas falharem.
    """
    url = f"{config.FOOTBALL_DATA_BASE_URL}/{endpoint}"
    ultima_excecao = None

    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            resp = requests.get(
                url,
                headers=_headers(),
                params=params,
                timeout=config.HTTP_TIMEOUT_SEGUNDOS,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as exc:
            ultima_excecao = exc
            logger.warning(
                "Tentativa %s/%s falhou para %s: %s",
                tentativa, config.HTTP_MAX_TENTATIVAS, endpoint, exc
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Todas as tentativas falharam para %s. Erro: %s", endpoint, ultima_excecao)
    raise ConnectionError(f"Falha ao acessar a football-data.org ({endpoint}): {ultima_excecao}")


def buscar_jogos_do_dia(data_iso: str) -> list:
    """
    Busca, numa única chamada, todas as partidas do dia (formato 'YYYY-MM-DD')
    nas ligas monitoradas. Retorna uma lista de dicionários simplificados com
    os dados essenciais.
    """
    jogos_encontrados = []

    for nome_liga, codigo_liga in config.LIGAS_MONITORADAS.items():
        try:
            dados = _request_com_retry(f"competitions/{codigo_liga}/matches", {
                "dateFrom": data_iso,
                "dateTo": data_iso,
            })
        except ConnectionError as exc:
            logger.error("Ignorando liga '%s' por falha de API: %s", nome_liga, exc)
            continue

        erros = dados.get("errors")
        if erros:
            logger.error(
                "football-data.org devolveu erro para a liga '%s': %s", nome_liga, erros
            )
            continue

        for item in dados.get("matches", []):
            try:
                jogos_encontrados.append({
                    "fixture_id": item["id"],
                    "liga": nome_liga,
                    "liga_id": codigo_liga,
                    "data_hora": item["utcDate"],
                    "time_mandante": item["homeTeam"]["name"],
                    "time_mandante_id": item["homeTeam"]["id"],
                    "time_visitante": item["awayTeam"]["name"],
                    "time_visitante_id": item["awayTeam"]["id"],
                })
            except KeyError as exc:
                logger.warning("Registro de partida incompleto, ignorando: %s", exc)
                continue

    logger.info("Total de %d jogos encontrados para %s.", len(jogos_encontrados), data_iso)
    return jogos_encontrados


def buscar_medias_gols(time_id: int, liga_id: str = None) -> dict:
    """
    Calcula, a partir das últimas N partidas finalizadas (config.JANELA_JOGOS_HISTORICO,
    em qualquer competição), a média de gols marcados e sofridos por um time.

    Retorna: {"media_marcados": float, "media_sofridos": float, "jogos_analisados": int}
    """
    try:
        dados = _request_com_retry(f"teams/{time_id}/matches", {
            "status": "FINISHED",
            "limit": config.JANELA_JOGOS_HISTORICO,
        })
    except ConnectionError as exc:
        logger.warning(
            "Falha ao buscar histórico do time %s: %s — usando médias neutras.", time_id, exc
        )
        return {"media_marcados": 1.2, "media_sofridos": 1.2, "jogos_analisados": 0}

    jogos = dados.get("matches", [])
    if not jogos:
        logger.warning("Sem histórico suficiente para o time %s — usando médias neutras.", time_id)
        return {"media_marcados": 1.2, "media_sofridos": 1.2, "jogos_analisados": 0}

    total_marcados = 0
    total_sofridos = 0

    for jogo in jogos:
        placar = jogo.get("score", {}).get("fullTime", {})
        gols_casa = placar.get("home") or 0
        gols_fora = placar.get("away") or 0
        mandante_id = jogo["homeTeam"]["id"]

        if mandante_id == time_id:
            total_marcados += gols_casa
            total_sofridos += gols_fora
        else:
            total_marcados += gols_fora
            total_sofridos += gols_casa

    n = len(jogos)
    return {
        "media_marcados": round(total_marcados / n, 3),
        "media_sofridos": round(total_sofridos / n, 3),
        "jogos_analisados": n,
    }
