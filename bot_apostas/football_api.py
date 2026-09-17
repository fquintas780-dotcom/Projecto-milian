# -*- coding: utf-8 -*-
"""
football_api.py
================
Integração com a API-Football (api-sports.io / RapidAPI).

Documentação oficial: https://www.api-football.com/documentation-v3

Funções expostas:
- buscar_jogos_do_dia(data): retorna lista de partidas do dia nas ligas monitoradas.
- buscar_medias_gols(time_id, liga_id, temporada): retorna médias de gols
  marcados/sofridos (mandante e visitante) com base nas últimas N partidas.

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
        "x-apisports-key": config.FOOTBALL_API_KEY,
    }


def _request_com_retry(endpoint: str, params: dict) -> dict:
    """
    Executa uma requisição GET com retries. Lança exceção se todas falharem.
    """
    url = f"{config.FOOTBALL_API_BASE_URL}/{endpoint}"
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
    raise ConnectionError(f"Falha ao acessar a API de futebol ({endpoint}): {ultima_excecao}")


def buscar_jogos_do_dia(data_iso: str) -> list:
    """
    Busca todas as partidas do dia (formato 'YYYY-MM-DD') nas ligas monitoradas.
    Retorna uma lista de dicionários simplificados com os dados essenciais.
    """
    jogos_encontrados = []

    for nome_liga, liga_id in config.LIGAS_MONITORADAS.items():
        try:
            dados = _request_com_retry("fixtures", {
                "date": data_iso,
                "league": liga_id,
                "season": _temporada_atual(),
            })
        except ConnectionError as exc:
            logger.error("Ignorando liga '%s' por falha de API: %s", nome_liga, exc)
            continue

        for item in dados.get("response", []):
            try:
                jogos_encontrados.append({
                    "fixture_id": item["fixture"]["id"],
                    "liga": nome_liga,
                    "liga_id": liga_id,
                    "data_hora": item["fixture"]["date"],
                    "time_mandante": item["teams"]["home"]["name"],
                    "time_mandante_id": item["teams"]["home"]["id"],
                    "time_visitante": item["teams"]["away"]["name"],
                    "time_visitante_id": item["teams"]["away"]["id"],
                })
            except KeyError as exc:
                logger.warning("Registro de partida incompleto, ignorando: %s", exc)
                continue

    logger.info("Total de %d jogos encontrados para %s.", len(jogos_encontrados), data_iso)
    return jogos_encontrados


def buscar_medias_gols(time_id: int, liga_id: int, temporada: int = None) -> dict:
    """
    Calcula, a partir das últimas N partidas (config.JANELA_JOGOS_HISTORICO),
    a média de gols marcados e sofridos por um time, separando mandante/visitante
    quando possível.

    Retorna: {"media_marcados": float, "media_sofridos": float, "jogos_analisados": int}
    """
    temporada = temporada or _temporada_atual()

    dados = _request_com_retry("fixtures", {
        "team": time_id,
        "league": liga_id,
        "season": temporada,
        "last": config.JANELA_JOGOS_HISTORICO,
    })

    jogos = dados.get("response", [])
    if not jogos:
        logger.warning("Sem histórico suficiente para o time %s — usando médias neutras.", time_id)
        return {"media_marcados": 1.2, "media_sofridos": 1.2, "jogos_analisados": 0}

    total_marcados = 0
    total_sofridos = 0

    for jogo in jogos:
        gols_casa = jogo["goals"]["home"] or 0
        gols_fora = jogo["goals"]["away"] or 0
        mandante_id = jogo["teams"]["home"]["id"]

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


def _temporada_atual() -> int:
    """
    Retorna o ano da temporada corrente. A API-Football geralmente usa o ano
    de início da temporada europeia (ex.: 2025 para a temporada 2025/2026).
    Ajuste esta lógica conforme a liga/calendário que você monitora.
    """
    from datetime import datetime
    hoje = datetime.utcnow()
    # Temporadas europeias começam por volta de agosto — antes disso, use o ano anterior.
    return hoje.year if hoje.month >= 7 else hoje.year - 1
