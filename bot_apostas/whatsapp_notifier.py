# -*- coding: utf-8 -*-
"""
whatsapp_notifier.py
=====================
Envio de mensagens formatadas para WhatsApp via CallMeBot
(https://www.callmebot.com/blog/free-api-whatsapp-messages/).

Como ativar o CallMeBot (gratuito, sem conta business) — ver docstring
principal em main.py para o passo a passo completo.
"""

import time
import logging
import requests

import config

logger = logging.getLogger("bot_apostas.whatsapp_notifier")

CALLMEBOT_BASE_URL = "https://api.callmebot.com/whatsapp.php"


def enviar_mensagem(texto: str) -> bool:
    """
    Envia uma mensagem de texto para o número configurado via CallMeBot.
    Retorna True em caso de sucesso, False em caso de falha (não lança exceção
    para não interromper o fluxo principal do bot por uma falha de notificação).
    """
    if not config.WHATSAPP_PHONE or not config.WHATSAPP_APIKEY:
        logger.warning("WhatsApp não configurado — pulando envio da notificação.")
        return False

    params = {
        "phone": config.WHATSAPP_PHONE,
        "text": texto,
        "apikey": config.WHATSAPP_APIKEY,
    }

    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            resp = requests.get(
                CALLMEBOT_BASE_URL,
                params=params,
                timeout=config.HTTP_TIMEOUT_SEGUNDOS,
            )
            resp.raise_for_status()
            logger.info("Mensagem enviada ao WhatsApp com sucesso.")
            return True
        except requests.exceptions.RequestException as exc:
            logger.warning(
                "Tentativa %s/%s de envio ao WhatsApp falhou: %s",
                tentativa, config.HTTP_MAX_TENTATIVAS, exc
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Falha definitiva ao enviar mensagem ao WhatsApp.")
    return False


def formatar_relatorio_diario(bilhete: dict, saldo_banca: float) -> str:
    """
    Monta o texto do relatório diário enviado ao usuário, com os jogos
    selecionados, mercados, odds, stake e retorno esperado.

    Usa a formatação do WhatsApp: *negrito* e _itálico_ (sem markdown de
    código, que não é bem suportado em linha pelo cliente do WhatsApp).
    """
    linhas = []
    linhas.append("📊 *RELATÓRIO DIÁRIO — BOT DE APOSTAS*")
    linhas.append(f"_Banca atual: {saldo_banca:.2f}_")
    linhas.append("")
    linhas.append("🎯 *Jogos selecionados:*")

    for i, jogo in enumerate(bilhete["jogos"], start=1):
        linhas.append(
            f"{i}. *{jogo['descricao']}*\n"
            f"   Mercado: {jogo['mercado']} — Seleção: *{jogo['selecao']}*\n"
            f"   Odd: {jogo['odd']} | Prob. modelo: {jogo['probabilidade_modelo']*100:.1f}% "
            f"| Value: +{jogo['value']*100:.1f}%"
        )

    linhas.append("")
    linhas.append("💰 *Resumo do bilhete:*")
    linhas.append(f"Stake: {bilhete['stake']:.2f} (2% da banca)")
    linhas.append(f"Odd total (dupla): {bilhete['odd_total']:.2f}")
    linhas.append(f"Retorno potencial: {bilhete['retorno_potencial']:.2f}")
    linhas.append(f"Lucro líquido esperado: {bilhete['lucro_esperado']:.2f}")
    linhas.append("")
    linhas.append("⚠️ _Aposte com responsabilidade. Nenhum modelo estatístico garante lucro._")

    return "\n".join(linhas)


def formatar_mensagem_erro(motivo: str) -> str:
    """Formata uma mensagem de alerta para quando o bot não consegue gerar um bilhete."""
    return (
        "⚠️ *BOT DE APOSTAS — Nenhum bilhete gerado hoje*\n\n"
        f"Motivo: {motivo}\n\n"
        "_O bot tentará novamente na próxima execução agendada._"
    )
