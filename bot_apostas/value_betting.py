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
    Avalia todos os mercados disponíveis (1x2, over/under 2.5, ambas marcam)
    de uma partida e retorna a lista de oportunidades com value positivo
    acima do mínimo configurado (config.VALUE_MINIMO) e abaixo do máximo
    plausível (config.VALUE_MAXIMO), respeitando limites de odd aceitáveis.
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

    if odds.get("btts_sim"):
        candidatos.append(("Ambas Marcam", "Sim", probabilidades["btts_sim"], odds["btts_sim"]))
    if odds.get("btts_nao"):
        candidatos.append(("Ambas Marcam", "Não", probabilidades["btts_nao"], odds["btts_nao"]))

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
    Recebe a lista de todas as oportunidades de value encontradas no dia e
    seleciona as N melhores partidas (config.NUMERO_JOGOS_SELECIONADOS),
    combinando dentro de cada uma até config.MAX_PERNAS_POR_JOGO mercados
    diferentes (1X2, Over/Under 2.5, Ambas Marcam) — nunca duas seleções do
    mesmo mercado no mesmo jogo (ex: não combina "Casa" com "Fora").

    Combinar vários mercados do mesmo jogo aumenta a odd total, mas as
    seleções NÃO são estatisticamente independentes entre si (ex: "Mais de
    2.5 golos" e "Ambas Marcam" tendem a acontecer juntas) — a probabilidade
    real de acertar tudo costuma ser menor do que a simples multiplicação
    das odds sugere. Por isso o limite de pernas por jogo é propositalmente
    conservador.
    """
    quantidade = quantidade or config.NUMERO_JOGOS_SELECIONADOS
    max_pernas = config.MAX_PERNAS_POR_JOGO

    oportunidades_por_jogo = {}
    for op in todas_oportunidades:
        oportunidades_por_jogo.setdefault(op["descricao"], []).append(op)

    pernas_por_jogo = {}
    for descricao, oportunidades in oportunidades_por_jogo.items():
        melhor_por_mercado = {}
        for op in oportunidades:
            mercado = op["mercado"]
            if mercado not in melhor_por_mercado or op["value"] > melhor_por_mercado[mercado]["value"]:
                melhor_por_mercado[mercado] = op

        pernas = sorted(melhor_por_mercado.values(), key=lambda x: x["value"], reverse=True)
        pernas_por_jogo[descricao] = pernas[:max_pernas]

    ranking = sorted(
        pernas_por_jogo.items(),
        key=lambda item: sum(p["value"] for p in item[1]),
        reverse=True
    )

    selecionados = []
    for _descricao, pernas in ranking[:quantidade]:
        selecionados.extend(pernas)

    logger.info(
        "Selecionados %d de %d jogos com value (%d pernas no total, máx. %d por jogo).",
        min(len(ranking), quantidade), len(ranking), len(selecionados), max_pernas
    )
    return selecionados
