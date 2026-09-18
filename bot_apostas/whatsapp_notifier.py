# -*- coding: utf-8 -*-
"""
whatsapp_notifier.py
=====================
Envio de mensagens formatadas para WhatsApp via Twilio (WhatsApp Sandbox
ou número de produção) — https://www.twilio.com/docs/whatsapp/sandbox.

Como ativar o Twilio Sandbox — ver docstring principal em main.py para o
passo a passo completo.
"""

import time
import logging
import requests
from requests.auth import HTTPBasicAuth

import config

logger = logging.getLogger("bot_apostas.whatsapp_notifier")


def enviar_mensagem(texto: str) -> bool:
    """
    Envia uma mensagem de texto para o número configurado via Twilio.
    Retorna True em caso de sucesso, False em caso de falha (não lança exceção
    para não interromper o fluxo principal do bot por uma falha de notificação).
    """
    if not (config.TWILIO_ACCOUNT_SID and config.TWILIO_AUTH_TOKEN
            and config.TWILIO_WHATSAPP_FROM and config.TWILIO_WHATSAPP_TO):
        logger.warning("WhatsApp (Twilio) não configurado — pulando envio da notificação.")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{config.TWILIO_ACCOUNT_SID}/Messages.json"
    dados = {
        "From": f"whatsapp:{config.TWILIO_WHATSAPP_FROM}",
        "To": f"whatsapp:{config.TWILIO_WHATSAPP_TO}",
        "Body": texto,
    }

    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            resp = requests.post(
                url,
                data=dados,
                auth=HTTPBasicAuth(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN),
                timeout=config.HTTP_TIMEOUT_SEGUNDOS,
            )
            resp.raise_for_status()
            logger.info("Mensagem enviada ao WhatsApp (Twilio) com sucesso.")
            return True
        except requests.exceptions.RequestException as exc:
            detalhe_resposta = ""
            if exc.response is not None:
                detalhe_resposta = f" | Resposta do Twilio: {exc.response.text}"
            logger.warning(
                "Tentativa %s/%s de envio ao WhatsApp (Twilio) falhou: %s%s",
                tentativa, config.HTTP_MAX_TENTATIVAS, exc, detalhe_resposta
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Falha definitiva ao enviar mensagem ao WhatsApp (Twilio).")
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
