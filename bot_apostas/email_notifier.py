# -*- coding: utf-8 -*-
"""
email_notifier.py
==================
Envio do relatório diário por email via SMTP (Gmail por padrão).

Como obter EMAIL_REMETENTE, EMAIL_APP_PASSWORD e EMAIL_DESTINATARIO —
ver docstring principal em main.py.
"""

import time
import logging
import smtplib
from email.mime.text import MIMEText

import config

logger = logging.getLogger("bot_apostas.email_notifier")


def enviar_mensagem(texto: str, assunto: str = "Bot de Apostas — Relatório Diário") -> bool:
    """
    Envia o texto como corpo de um email para o destinatário configurado.
    Retorna True em caso de sucesso, False em caso de falha (não lança exceção
    para não interromper o fluxo principal do bot por uma falha de notificação).
    """
    if not (config.EMAIL_REMETENTE and config.EMAIL_APP_PASSWORD and config.EMAIL_DESTINATARIO):
        logger.warning("Email não configurado — pulando envio da notificação.")
        return False

    msg = MIMEText(texto, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = config.EMAIL_REMETENTE
    msg["To"] = config.EMAIL_DESTINATARIO

    for tentativa in range(1, config.HTTP_MAX_TENTATIVAS + 1):
        try:
            with smtplib.SMTP_SSL(config.EMAIL_SMTP_HOST, config.EMAIL_SMTP_PORT,
                                   timeout=config.HTTP_TIMEOUT_SEGUNDOS) as servidor:
                servidor.login(config.EMAIL_REMETENTE, config.EMAIL_APP_PASSWORD)
                servidor.sendmail(config.EMAIL_REMETENTE, [config.EMAIL_DESTINATARIO], msg.as_string())
            logger.info("Email enviado com sucesso.")
            return True
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning(
                "Tentativa %s/%s de envio de email falhou: %s",
                tentativa, config.HTTP_MAX_TENTATIVAS, exc
            )
            if tentativa < config.HTTP_MAX_TENTATIVAS:
                time.sleep(config.HTTP_BACKOFF_SEGUNDOS * tentativa)

    logger.error("Falha definitiva ao enviar email.")
    return False


def formatar_relatorio_diario(bilhete: dict, saldo_banca: float) -> str:
    """
    Monta o texto do relatório diário enviado ao usuário, com os jogos
    selecionados, mercados, odds, stake e retorno esperado.
    """
    linhas = []
    linhas.append("RELATÓRIO DIÁRIO — BOT DE APOSTAS")
    linhas.append(f"Banca atual: {saldo_banca:.2f}")
    linhas.append("")
    linhas.append("Jogos selecionados:")

    for i, jogo in enumerate(bilhete["jogos"], start=1):
        linhas.append(
            f"{i}. {jogo['descricao']}\n"
            f"   Mercado: {jogo['mercado']} — Seleção: {jogo['selecao']}\n"
            f"   Odd: {jogo['odd']} | Prob. modelo: {jogo['probabilidade_modelo']*100:.1f}% "
            f"| Value: +{jogo['value']*100:.1f}%"
        )

    linhas.append("")
    linhas.append("Resumo do bilhete:")
    linhas.append(f"Stake: {bilhete['stake']:.2f} (2% da banca)")
    linhas.append(f"Odd total (dupla): {bilhete['odd_total']:.2f}")
    linhas.append(f"Retorno potencial: {bilhete['retorno_potencial']:.2f}")
    linhas.append(f"Lucro líquido esperado: {bilhete['lucro_esperado']:.2f}")
    linhas.append("")
    linhas.append("Aposte com responsabilidade. Nenhum modelo estatístico garante lucro.")

    return "\n".join(linhas)


def formatar_mensagem_erro(motivo: str) -> str:
    """Formata uma mensagem de alerta para quando o bot não consegue gerar um bilhete."""
    return (
        "BOT DE APOSTAS — Nenhum bilhete gerado hoje\n\n"
        f"Motivo: {motivo}\n\n"
        "O bot tentará novamente na próxima execução agendada."
    )
