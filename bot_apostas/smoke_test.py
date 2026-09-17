#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
smoke_test.py
=============
Valida a lógica de negócio do bot (Poisson + value betting + bankroll)
com dados fictícios, sem precisar de credenciais nem acesso à rede.

Uso:
    python smoke_test.py
"""

import poisson_model
import value_betting
import bankroll
import config


def main():
    medias_casa = {"media_marcados": 1.8, "media_sofridos": 0.9, "jogos_analisados": 10}
    medias_fora = {"media_marcados": 1.1, "media_sofridos": 1.4, "jogos_analisados": 10}

    probs = poisson_model.analisar_partida(medias_casa, medias_fora)
    print("Probabilidades do modelo (Poisson):")
    for chave, valor in probs.items():
        print(f"  {chave}: {valor}")

    odds_fake = {
        "1x2": {"casa": 1.90, "empate": 3.60, "fora": 4.20},
        "over_2_5": 2.05,
        "under_2_5": 1.80,
    }
    jogo_fake = {
        "time_mandante": "Time Casa FC",
        "time_visitante": "Time Fora FC",
        "liga": "Liga Teste",
    }

    oportunidades = value_betting.avaliar_mercados_da_partida(jogo_fake, probs, odds_fake)
    print("\nOportunidades de value bet encontradas:")
    for op in oportunidades:
        print(f"  {op}")

    if oportunidades:
        bilhete = bankroll.montar_bilhete(oportunidades[:1], saldo_banca=config.BANCA_INICIAL)
        print("\nBilhete simulado:")
        print(f"  {bilhete}")

    assert oportunidades, "Esperava pelo menos uma oportunidade de value bet com os dados fictícios."
    print("\nOK: lógica de negócio validada com sucesso.")


if __name__ == "__main__":
    main()
