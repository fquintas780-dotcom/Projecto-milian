# -*- coding: utf-8 -*-
"""
poisson_model.py
=================
Motor estatístico do bot: modelo de Distribuição de Poisson para estimar
a probabilidade de placares e mercados de uma partida de futebol.

Fundamento teórico:
- O número de gols de cada equipa numa partida é modelado como uma variável
  aleatória de Poisson, com parâmetro lambda (taxa esperada de gols).
- lambda_mandante = média_gols_marcados(mandante) * média_gols_sofridos(visitante) / média_liga
- lambda_visitante = média_gols_marcados(visitante) * média_gols_sofridos(mandante) / média_liga
- Simplificação usada aqui (sem 'média_liga' explícita): média geométrica
  entre o ataque de um time e a defesa do adversário. Este é um modelo
  educacional/aproximado — modelos profissionais usam regressão de Poisson
  completa com fator casa/fora e ajuste por força de liga.
"""

import math
import logging

logger = logging.getLogger("bot_apostas.poisson_model")

MAX_GOLS_SIMULADOS = 8  # profundidade da matriz de placares (0 a 8 gols por time)


def _probabilidade_poisson(lam: float, k: int) -> float:
    """P(X = k) para uma distribuição de Poisson com taxa lam."""
    if lam <= 0:
        lam = 0.01  # evita erro matemático com lambda zero/negativo
    return (math.exp(-lam) * (lam ** k)) / math.factorial(k)


def calcular_lambdas(medias_mandante: dict, medias_visitante: dict) -> tuple:
    """
    Calcula os lambdas (gols esperados) do mandante e do visitante,
    combinando o ataque de um time com a defesa do adversário.
    """
    lambda_mandante = (medias_mandante["media_marcados"] + medias_visitante["media_sofridos"]) / 2
    lambda_visitante = (medias_visitante["media_marcados"] + medias_mandante["media_sofridos"]) / 2

    # Pequeno ajuste de fator casa (vantagem histórica de jogar em casa, ~+10%)
    lambda_mandante *= 1.10

    return round(lambda_mandante, 3), round(lambda_visitante, 3)


def gerar_matriz_placares(lambda_mandante: float, lambda_visitante: float) -> list:
    """
    Gera a matriz de probabilidades P(mandante marca i, visitante marca j)
    assumindo independência entre os dois processos de Poisson.
    """
    matriz = []
    for i in range(MAX_GOLS_SIMULADOS + 1):
        linha = []
        for j in range(MAX_GOLS_SIMULADOS + 1):
            p = _probabilidade_poisson(lambda_mandante, i) * _probabilidade_poisson(lambda_visitante, j)
            linha.append(p)
        matriz.append(linha)
    return matriz


def calcular_probabilidades_mercados(matriz: list) -> dict:
    """
    A partir da matriz de placares, deriva as probabilidades dos principais
    mercados: 1X2, Over/Under 2.5 gols, Ambas Marcam (BTTS), e placar exato
    mais provável.
    """
    p_casa = p_empate = p_fora = 0.0
    p_over_2_5 = p_under_2_5 = 0.0
    p_btts_sim = p_btts_nao = 0.0
    placar_mais_provavel = (0, 0)
    prob_maxima = 0.0

    n = len(matriz)
    for i in range(n):
        for j in range(n):
            p = matriz[i][j]

            if i > j:
                p_casa += p
            elif i == j:
                p_empate += p
            else:
                p_fora += p

            if i + j >= 3:
                p_over_2_5 += p
            else:
                p_under_2_5 += p

            if i > 0 and j > 0:
                p_btts_sim += p
            else:
                p_btts_nao += p

            if p > prob_maxima:
                prob_maxima = p
                placar_mais_provavel = (i, j)

    return {
        "1x2": {"casa": round(p_casa, 4), "empate": round(p_empate, 4), "fora": round(p_fora, 4)},
        "over_2_5": round(p_over_2_5, 4),
        "under_2_5": round(p_under_2_5, 4),
        "btts_sim": round(p_btts_sim, 4),
        "btts_nao": round(p_btts_nao, 4),
        "placar_mais_provavel": f"{placar_mais_provavel[0]}-{placar_mais_provavel[1]}",
        "probabilidade_placar_mais_provavel": round(prob_maxima, 4),
    }


def analisar_partida(medias_mandante: dict, medias_visitante: dict) -> dict:
    """
    Função de conveniência: recebe as médias de gols dos dois times e
    retorna diretamente as probabilidades de todos os mercados relevantes.
    """
    lam_m, lam_v = calcular_lambdas(medias_mandante, medias_visitante)
    matriz = gerar_matriz_placares(lam_m, lam_v)
    mercados = calcular_probabilidades_mercados(matriz)
    mercados["lambda_mandante"] = lam_m
    mercados["lambda_visitante"] = lam_v
    return mercados
