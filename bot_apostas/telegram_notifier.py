# -*- coding: utf-8 -*-
"""
telegram_notifier.py
=====================
Envio de mensagens formatadas (Markdown) para o Telegram via Bot API.

Como obter TELEGRAM_TOKEN e TELEGRAM_CHAT_ID — ver docstring principal em main.py.
"""

import time
import logging
import requests

import config

logger = logging.getLogger("bot_apostas.telegram_notifier")


def enviar_mensagem(texto_markdown: str) -> bool:
    """
    Envia uma mensagem em Markdown para o chat configurado.
    Retorna True em caso de sucesso, False em caso de falha (não lança exceção
    para não interromper o fluxo principal do bot por uma falha de notificação).
    """
    if not config.TELEGRAM_TOKEN or not config.TELEGRAM_CHAT_ID:
        logger.warning("Telegram não configurado — pulando envio da notificação.")
        return False

    url = f"{config.TELEGRAM_API_BASE_URL}/sendMessage"
    payload = {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "text": texto_markdown,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }

    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            resp = requests.post(url, json=payload, timeout=config.HTTP_TIMEOUT_SEGUNDOS)
            resp.raise_for_status()
            logger.info("Mensagem enviada ao Telegram com sucesso.")
            return True
        except requests.exceptions.RequestException as exc:
            logger.warning(
                "Tentativa %s/%s de envio ao Telegram falhou: %s",
                tentativa, config.HTTP_MAX_TENTATIVAS, exc
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Falha definitiva ao enviar mensagem ao Telegram.")
    return False


def formatar_relatorio_diario(bilhete: dict, saldo_banca: float) -> str:
    """
    Monta o texto Markdown do relatório diário enviado ao usuário,
    com os jogos selecionados, mercados, odds, stake e retorno esperado.
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
            f"   Odd: `{jogo['odd']}` | Prob. modelo: `{jogo['probabilidade_modelo']*100:.1f}%` "
            f"| Value: `+{jogo['value']*100:.1f}%`"
        )

    linhas.append("")
    linhas.append("💰 *Resumo do bilhete:*")
    linhas.append(f"Stake: `{bilhete['stake']:.2f}` (2% da banca)")
    linhas.append(f"Odd total (dupla): `{bilhete['odd_total']:.2f}`")
    linhas.append(f"Retorno potencial: `{bilhete['retorno_potencial']:.2f}`")
    linhas.append(f"Lucro líquido esperado: `{bilhete['lucro_esperado']:.2f}`")
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
