# -*- coding: utf-8 -*-
"""
value_betting.py
=================
Lógica de "Value Betting": compara a probabilidade estimada pelo modelo
de Poisson com a odd oferecida pela casa de apostas, para identificar
apostas com valor esperado positivo (EV+).

Fórmula do Value:
    value = (probabilidade_modelo * odd) - 1

Se value > 0, a odd oferecida é maior do que o "justo" segundo o modelo,
ou seja, a aposta teria expectativa matemática positiva no longo prazo
(assumindo que o modelo esteja bem calibrado — isso NUNCA é garantia de
lucro em uma aposta individual, apenas uma vantagem estatística).
"""

import logging

import config

logger = logging.getLogger("bot_apostas.value_betting")


def calcular_value(probabilidade_modelo: float, odd_oferecida: float) -> float:
    """Retorna o value (edge) de uma seleção específica."""
    if odd_oferecida <= 0:
        return -1.0
    return round((probabilidade_modelo * odd_oferecida) - 1, 4)


def avaliar_mercados_da_partida(jogo: dict, probabilidades: dict, odds: dict) -> list:
    """
    Avalia todos os mercados disponíveis (1x2, over/under 2.5) de uma partida
    e retorna a lista de oportunidades com value positivo acima do mínimo
    configurado (config.VALUE_MINIMO), respeitando limites de odd aceitáveis.
    """
    oportunidades = []

    candidatos = []

    if odds.get("1x2"):
        candidatos.append(("1X2", "Casa", probabilidades["1x2"]["casa"], odds["1x2"]["casa"]))
        candidatos.append(("1X2", "Empate", probabilidades["1x2"]["empate"], odds["1x2"]["empate"]))
        candidatos.append(("1X2", "Fora", probabilidades["1x2"]["fora"], odds["1x2"]["fora"]))

    if odds.get("over_2_5"):
        candidatos.append(("Over/Under 2.5", "Over 2.5", probabilidades["over_2_5"], odds["over_2_5"]))
    if odds.get("under_2_5"):
        candidatos.append(("Over/Under 2.5", "Under 2.5", probabilidades["under_2_5"], odds["under_2_5"]))

    for mercado, selecao, prob_modelo, odd in candidatos:
        if odd < config.ODD_MINIMA_ACEITAVEL or odd > config.ODD_MAXIMA_ACEITAVEL:
            continue
        if odd <= 0 or prob_modelo <= 0:
            continue

        value = calcular_value(prob_modelo, odd)

        if value > config.VALUE_MAXIMO:
            logger.warning(
                "Value implausível (%.1f%%) descartado para %s x %s — %s/%s "
                "(provável ruído nos dados, não oportunidade real).",
                value * 100, jogo["time_mandante"], jogo["time_visitante"], mercado, selecao
            )
            continue

        if value >= config.VALUE_MINIMO:
            oportunidades.append({
                "descricao": f"{jogo['time_mandante']} x {jogo['time_visitante']} ({jogo['liga']})",
                "mercado": mercado,
                "selecao": selecao,
                "odd": odd,
                "probabilidade_modelo": prob_modelo,
                "value": value,
            })

    return oportunidades


def selecionar_melhores_jogos(todas_oportunidades: list, quantidade: int = None) -> list:
    """
    Recebe a lista de todas as oportunidades de value encontradas no dia
    (uma por partida, a de maior value) e seleciona as N melhores, ordenadas
    por value decrescente. Garante que não haja duas seleções da mesma partida.
    """
    quantidade = quantidade or config.NUMERO_JOGOS_SELECIONADOS

    melhor_por_jogo = {}
    for op in todas_oportunidades:
        chave = op["descricao"]
        if chave not in melhor_por_jogo or op["value"] > melhor_por_jogo[chave]["value"]:
            melhor_por_jogo[chave] = op

    ranking = sorted(melhor_por_jogo.values(), key=lambda x: x["value"], reverse=True)

    selecionados = ranking[:quantidade]
    logger.info(
        "Selecionados %d de %d jogos com value (mínimo exigido: %d).",
        len(selecionados), len(ranking), quantidade
    )
    return selecionados
