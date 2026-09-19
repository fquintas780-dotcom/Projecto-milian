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
    Monta o texto do relatório diário enviado ao usuário, agrupado por jogo
    (cada jogo pode ter várias pernas/mercados combinados), com odds, stake
    e retorno esperado.
    """
    linhas = []
    linhas.append("RELATÓRIO DIÁRIO — BOT DE APOSTAS")
    linhas.append(f"Banca atual: {saldo_banca:.2f}")
    linhas.append("")
    linhas.append("Jogos selecionados:")

    pernas_por_jogo = {}
    ordem_jogos = []
    for jogo in bilhete["jogos"]:
        descricao = jogo["descricao"]
        if descricao not in pernas_por_jogo:
            pernas_por_jogo[descricao] = []
            ordem_jogos.append(descricao)
        pernas_por_jogo[descricao].append(jogo)

    algum_jogo_combinado = False
    for i, descricao in enumerate(ordem_jogos, start=1):
        pernas = pernas_por_jogo[descricao]
        linhas.append(f"{i}. {descricao}")
        for perna in pernas:
            linhas.append(
                f"   {perna['mercado']} — {perna['selecao']}: "
                f"Odd {perna['odd']} | Prob. modelo {perna['probabilidade_modelo']*100:.1f}% "
                f"| Value +{perna['value']*100:.1f}%"
            )
        if len(pernas) > 1:
            algum_jogo_combinado = True

    linhas.append("")
    linhas.append("Resumo do bilhete:")
    linhas.append(f"Stake: {bilhete['stake']:.2f} (2% da banca)")
    linhas.append(f"Odd total: {bilhete['odd_total']:.2f}")
    linhas.append(f"Retorno potencial: {bilhete['retorno_potencial']:.2f}")
    linhas.append(f"Lucro líquido esperado: {bilhete['lucro_esperado']:.2f}")
    linhas.append("")

    if algum_jogo_combinado:
        linhas.append(
            "Atenção: alguns jogos combinam mais de um mercado (mesma partida). "
            "Essas seleções não são estatisticamente independentes entre si — "
            "a probabilidade real de acertar todas costuma ser MENOR do que a "
            "odd combinada sugere. Aposta apenas exatamente estas seleções, "
            "sem adicionar outras próprias, para avaliar a fiabilidade real do bot."
        )
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
