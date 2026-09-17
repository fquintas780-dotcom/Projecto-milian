# -*- coding: utf-8 -*-
"""
odds_api.py
============
Integração com The Odds API (https://the-odds-api.com/).

Documentação: https://the-odds-api.com/liveapi/guides/v4/

Responsável por buscar as odds atualizadas (mercados 1X2, over/under) das
casas de apostas para um dado esporte/liga, e casar essas odds com os
fixtures retornados pela API de futebol (por nomes dos times, já que os
IDs entre as duas APIs não são compatíveis).
"""

import time
import logging
import requests

import config

logger = logging.getLogger("bot_apostas.odds_api")

# Mapeamento de "sport_key" da Odds API por liga monitorada.
# Consulte https://api.the-odds-api.com/v4/sports para a lista completa e atualizada.
SPORT_KEYS = {
    "Premier League": "soccer_epl",
    "La Liga": "soccer_spain_la_liga",
    "Serie A": "soccer_italy_serie_a",
    "Bundesliga": "soccer_germany_bundesliga",
    "Ligue 1": "soccer_france_ligue_one",
    "Brasileirão": "soccer_brazil_campeonato",
}


def _request_com_retry(url: str, params: dict) -> list:
    ultima_excecao = None
    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            resp = requests.get(url, params=params, timeout=config.HTTP_TIMEOUT_SEGUNDOS)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as exc:
            ultima_excecao = exc
            logger.warning(
                "Tentativa %s/%s falhou ao buscar odds: %s",
                tentativa, config.HTTP_MAX_TENTATIVAS, exc
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Falha definitiva ao buscar odds: %s", ultima_excecao)
    raise ConnectionError(f"Falha ao acessar The Odds API: {ultima_excecao}")


def buscar_odds_liga(nome_liga: str) -> list:
    """
    Busca odds (mercados h2h e totals) para todos os jogos disponíveis de uma liga.
    Retorna a lista bruta de eventos conforme retornada pela The Odds API.
    """
    sport_key = SPORT_KEYS.get(nome_liga)
    if not sport_key:
        logger.warning("Liga '%s' sem sport_key mapeado na Odds API — pulando.", nome_liga)
        return []

    url = f"{config.ODDS_API_BASE_URL}/sports/{sport_key}/odds"
    params = {
        "apiKey": config.ODDS_API_KEY,
        "regions": "eu,uk",
        "markets": "h2h,totals",
        "oddsFormat": "decimal",
    }

    try:
        return _request_com_retry(url, params)
    except ConnectionError:
        return []


def encontrar_odds_para_jogo(eventos_liga: list, time_mandante: str, time_visitante: str) -> dict:
    """
    Localiza, dentro da lista de eventos de uma liga, o evento correspondente
    ao confronto (mandante x visitante) e extrai as melhores odds disponíveis
    (a maior odd entre as casas cotadas, para cada seleção/mercado).

    Retorna um dicionário no formato:
    {
        "1x2": {"casa": float, "empate": float, "fora": float},
        "over_2_5": float,
        "under_2_5": float,
    }
    Ou {} se o jogo não for encontrado nas cotações.
    """
    evento = None
    for ev in eventos_liga:
        if _nomes_batem(ev.get("home_team", ""), time_mandante) and \
           _nomes_batem(ev.get("away_team", ""), time_visitante):
            evento = ev
            break

    if evento is None:
        return {}

    melhores = {
        "1x2": {"casa": 0.0, "empate": 0.0, "fora": 0.0},
        "over_2_5": 0.0,
        "under_2_5": 0.0,
    }

    for casa_aposta in evento.get("bookmakers", []):
        for mercado in casa_aposta.get("markets", []):
            if mercado["key"] == "h2h":
                for outcome in mercado["outcomes"]:
                    preco = outcome["price"]
                    if _nomes_batem(outcome["name"], time_mandante):
                        melhores["1x2"]["casa"] = max(melhores["1x2"]["casa"], preco)
                    elif _nomes_batem(outcome["name"], time_visitante):
                        melhores["1x2"]["fora"] = max(melhores["1x2"]["fora"], preco)
                    elif outcome["name"].lower() == "draw":
                        melhores["1x2"]["empate"] = max(melhores["1x2"]["empate"], preco)

            elif mercado["key"] == "totals":
                for outcome in mercado["outcomes"]:
                    if outcome.get("point") == 2.5:
                        if outcome["name"].lower() == "over":
                            melhores["over_2_5"] = max(melhores["over_2_5"], outcome["price"])
                        elif outcome["name"].lower() == "under":
                            melhores["under_2_5"] = max(melhores["under_2_5"], outcome["price"])

    return melhores


def _nomes_batem(nome_api_odds: str, nome_api_futebol: str) -> bool:
    """
    Compara nomes de times entre as duas APIs de forma tolerante
    (case-insensitive e ignorando substrings comuns como 'FC', 'CF' etc.).
    Para produção séria, recomenda-se manter um dicionário de aliases manual,
    pois nomes de times divergem bastante entre provedores de dados.
    """
    def normalizar(nome):
        nome = nome.lower().strip()
        for ruido in [" fc", " cf", " afc", " sc", " ac", "."]:
            nome = nome.replace(ruido, "")
        return nome.strip()

    a, b = normalizar(nome_api_odds), normalizar(nome_api_futebol)
    return a == b or a in b or b in a
