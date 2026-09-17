# -*- coding: utf-8 -*-
"""
bankroll.py
============
Gestão de risco e cálculo da aposta (bilhete) com base na banca atual.

Regras aplicadas:
- Stake fixa de 2% da banca por bilhete (config.STAKE_PERCENTUAL).
- Odd total do bilhete = produto das odds das seleções escolhidas.
- Retorno bruto potencial = stake * odd_total.
- Lucro líquido esperado = retorno_bruto - stake.
"""

import logging

import config

logger = logging.getLogger("bot_apostas.bankroll")


def calcular_stake(saldo_banca: float) -> float:
    """Calcula a stake fixa (2% da banca atual), arredondada a 2 casas decimais."""
    stake = round(saldo_banca * config.STAKE_PERCENTUAL, 2)
    logger.info("Stake calculada: %.2f (banca atual: %.2f)", stake, saldo_banca)
    return stake


def montar_bilhete(jogos_selecionados: list, saldo_banca: float) -> dict:
    """
    Monta o bilhete final (aposta dupla ou N seleções) a partir dos jogos
    selecionados pelo módulo de value betting.

    Retorna um dicionário com stake, odd_total, retorno_potencial e lucro_esperado.
    """
    if not jogos_selecionados:
        raise ValueError("Não há jogos selecionados para montar o bilhete.")

    stake = calcular_stake(saldo_banca)

    odd_total = 1.0
    for jogo in jogos_selecionados:
        odd_total *= jogo["odd"]
    odd_total = round(odd_total, 3)

    retorno_potencial = round(stake * odd_total, 2)
    lucro_esperado = round(retorno_potencial - stake, 2)

    bilhete = {
        "stake": stake,
        "odd_total": odd_total,
        "retorno_potencial": retorno_potencial,
        "lucro_esperado": lucro_esperado,
        "jogos": jogos_selecionados,
    }

    logger.info(
        "Bilhete montado: stake=%.2f | odd_total=%.2f | retorno=%.2f | lucro=%.2f",
        stake, odd_total, retorno_potencial, lucro_esperado
    )
    return bilhete


def liquidar_bilhete(saldo_banca: float, bilhete: dict, ganhou: bool) -> float:
    """
    Aplica o resultado de um bilhete já encerrado sobre a banca.
    - Se ganhou: soma o retorno_potencial - stake (lucro) à banca.
    - Se perdeu: subtrai a stake da banca.

    Retorna o novo saldo da banca (a persistência em disco é feita em database.py).
    """
    if ganhou:
        novo_saldo = saldo_banca + bilhete["lucro_esperado"]
    else:
        novo_saldo = saldo_banca - bilhete["stake"]

    return round(novo_saldo, 2)
