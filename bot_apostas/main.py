#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
BOT DE ANÁLISE ESPORTIVA E GESTÃO DE BANCA — 100% AUTÔNOMO
================================================================================

VISÃO GERAL
-----------
Este script executa, em uma única rodada, todo o pipeline diário do bot:

    1. Busca as partidas do dia em várias ligas (football_api.py)
    2. Busca odds atualizadas dessas partidas (odds_api.py)
    3. Calcula probabilidades via Distribuição de Poisson (poisson_model.py)
    4. Identifica oportunidades de "value betting" (value_betting.py)
    5. Seleciona os 2 melhores jogos do dia
    6. Monta o bilhete (aposta dupla) e calcula stake/retorno (bankroll.py)
    7. Persiste tudo no SQLite (database.py)
    8. Envia o relatório formatado por email (email_notifier.py)

O script é desenhado para ser executado UMA VEZ por chamada (ex.: via cron
job diário) — ele não roda em loop infinito. Isso o torna simples, previsível
e fácil de depurar em produção.


================================================================================
COMO OBTER AS CREDENCIAIS (API KEYS)
================================================================================

1) FOOTBALL_DATA_API_KEY (calendário e histórico de gols)
   - Acesse https://www.football-data.org/client/register e crie uma conta
     gratuita (plano free dá acesso à época ATUAL de 12 competições,
     incluindo as 6 ligas monitoradas por este bot, com limite de 10
     pedidos/minuto)
   - No email de confirmação (ou em https://www.football-data.org/client/register
     depois de logar), copie o seu "Token" — é o seu FOOTBALL_DATA_API_KEY
   - Atenção: a API-Football (api-football.com) NÃO serve — o plano free
     dela só dá acesso a dados históricos de 2022-2024, sem a época atual

2) ODDS_API_KEY (cotações das casas de apostas)
   - Acesse https://the-odds-api.com/
   - Crie uma conta gratuita (plano free tem cota mensal de requisições)
   - No painel, copie sua "API Key"

3) EMAIL_REMETENTE, EMAIL_APP_PASSWORD e EMAIL_DESTINATARIO
   (envio do relatório via SMTP do Gmail — grátis, sem aprovações)
   a) Use uma conta Gmail existente (ou crie uma nova, grátis)
   b) Ative a verificação em duas etapas em myaccount.google.com/security
      (obrigatório para gerar senhas de app)
   c) Aceda a myaccount.google.com/apppasswords, crie uma nova senha de
      app (ex.: nome "bot_apostas") — copie a senha de 16 caracteres
      gerada (sem espaços) → é o seu EMAIL_APP_PASSWORD
   d) EMAIL_REMETENTE é o endereço dessa conta Gmail (ex.:
      "seu_email@gmail.com")
   e) EMAIL_DESTINATARIO é o email que vai receber o relatório (pode ser
      o mesmo endereço do remetente, ou outro)
   f) Documentação oficial: https://support.google.com/mail/answer/185833


================================================================================
CONFIGURAÇÃO DO AMBIENTE
================================================================================

1) Instale as dependências:
       pip install -r requirements.txt

2) Crie um arquivo ".env" na raiz do projeto com o seguinte conteúdo:

       FOOTBALL_DATA_API_KEY=sua_chave_aqui
       ODDS_API_KEY=sua_chave_aqui
       EMAIL_REMETENTE=seu_email@gmail.com
       EMAIL_APP_PASSWORD=sua_senha_de_app_de_16_caracteres
       EMAIL_DESTINATARIO=seu_email@gmail.com
       BANCA_INICIAL=2000

3) Teste localmente:
       python main.py


================================================================================
DEPLOY EM PRODUÇÃO (VPS)
================================================================================

Opção recomendada para iniciantes: DigitalOcean, Render ou uma VPS AWS Lightsail.

--- PASSO A PASSO (Ubuntu 22.04 na VPS) ---

1. Conecte-se via SSH:
       ssh root@SEU_IP_DA_VPS

2. Atualize o sistema e instale Python:
       apt update && apt upgrade -y
       apt install python3 python3-pip python3-venv git -y

3. Envie os arquivos do bot para a VPS (do seu computador local):
       scp -r bot_apostas/ root@SEU_IP_DA_VPS:/root/

4. Na VPS, crie um ambiente virtual e instale as dependências:
       cd /root/bot_apostas
       python3 -m venv venv
       source venv/bin/activate
       pip install -r requirements.txt

5. Crie o arquivo .env na VPS com suas credenciais reais (passo acima).

6. Teste a execução manual:
       source venv/bin/activate && python main.py

--- AGENDAMENTO COM CRON (execução diária às 08:00) ---

7. Abra o crontab:
       crontab -e

8. Adicione a linha abaixo (ajuste os caminhos conforme seu diretório real):

       0 8 * * * cd /root/bot_apostas && /root/bot_apostas/venv/bin/python main.py >> /root/bot_apostas/bot.log 2>&1

   Explicação do agendamento "0 8 * * *":
       - minuto 0, hora 8, todo dia, todo mês, qualquer dia da semana.

9. Salve e saia do editor (no vim: ESC, depois :wq).

10. Verifique se o cron está agendado:
        crontab -l

11. Acompanhe os logs de execução:
        tail -f /root/bot_apostas/bot.log

--- ALTERNATIVA: Render.com (sem gerenciar servidor manualmente) ---

- Crie um "Cron Job" no painel do Render, apontando para este repositório.
- Configure o comando de build: pip install -r requirements.txt
- Configure o comando de execução: python main.py
- Configure a expressão cron (ex.: "0 8 * * *") e as variáveis de ambiente
  (FOOTBALL_DATA_API_KEY, ODDS_API_KEY, EMAIL_REMETENTE, EMAIL_APP_PASSWORD,
  EMAIL_DESTINATARIO) no painel.


================================================================================
AVISO IMPORTANTE
================================================================================
Este bot é uma ferramenta de apoio analítico. Nenhum modelo estatístico
elimina o risco inerente a apostas esportivas. Use gestão de banca responsável
e nunca aposte valores que não pode perder.
================================================================================
"""

import sys
import logging
from datetime import datetime

import config
import database
import football_api
import odds_api
import poisson_model
import value_betting
import bankroll
import email_notifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("bot_apostas.main")


def executar_pipeline_diario():
    """Executa o pipeline completo do bot para o dia corrente."""

    logger.info("========== INICIANDO EXECUÇÃO DO BOT ==========")

    # 0. Validação de credenciais e inicialização do banco
    faltando = config.validar_credenciais()
    if faltando:
        logger.error("Credenciais ausentes: %s. Abortando execução.", ", ".join(faltando))
        sys.exit(1)

    database.inicializar_banco()

    hoje = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Varredura de jogos do dia
    logger.info("Buscando jogos do dia (%s)...", hoje)
    jogos_do_dia = football_api.buscar_jogos_do_dia(hoje)

    if not jogos_do_dia:
        msg = "Nenhum jogo encontrado nas ligas monitoradas para hoje."
        logger.warning(msg)
        email_notifier.enviar_mensagem(email_notifier.formatar_mensagem_erro(msg))
        return

    # 2. Busca de odds por liga (cacheado por liga para reduzir chamadas)
    logger.info("Buscando odds por liga...")
    cache_odds_por_liga = {}
    for nome_liga in config.LIGAS_MONITORADAS:
        cache_odds_por_liga[nome_liga] = odds_api.buscar_odds_liga(nome_liga)

    # 3 e 4. Para cada jogo: calcular Poisson e avaliar value betting
    todas_oportunidades = []

    for jogo in jogos_do_dia:
        try:
            medias_mandante = football_api.buscar_medias_gols(
                jogo["time_mandante_id"], jogo["liga_id"]
            )
            medias_visitante = football_api.buscar_medias_gols(
                jogo["time_visitante_id"], jogo["liga_id"]
            )

            probabilidades = poisson_model.analisar_partida(medias_mandante, medias_visitante)

            odds_da_partida = odds_api.encontrar_odds_para_jogo(
                cache_odds_por_liga.get(jogo["liga"], []),
                jogo["time_mandante"],
                jogo["time_visitante"],
            )

            if not odds_da_partida:
                logger.info(
                    "Sem odds disponíveis para %s x %s — pulando.",
                    jogo["time_mandante"], jogo["time_visitante"]
                )
                continue

            oportunidades = value_betting.avaliar_mercados_da_partida(
                jogo, probabilidades, odds_da_partida
            )
            todas_oportunidades.extend(oportunidades)

        except ConnectionError as exc:
            logger.error("Erro de conexão ao processar partida: %s", exc)
            continue
        except Exception as exc:
            logger.exception("Erro inesperado ao processar partida: %s", exc)
            continue

    if not todas_oportunidades:
        msg = "Nenhuma oportunidade de value betting encontrada hoje (todas abaixo do mínimo exigido)."
        logger.warning(msg)
        email_notifier.enviar_mensagem(email_notifier.formatar_mensagem_erro(msg))
        return

    # 5. Seleção dos melhores jogos do dia
    melhores_jogos = value_betting.selecionar_melhores_jogos(todas_oportunidades)

    if len(melhores_jogos) < config.NUMERO_JOGOS_SELECIONADOS:
        msg = (
            f"Apenas {len(melhores_jogos)} jogo(s) com value suficiente "
            f"(necessário: {config.NUMERO_JOGOS_SELECIONADOS}). Bilhete não gerado por segurança."
        )
        logger.warning(msg)
        email_notifier.enviar_mensagem(email_notifier.formatar_mensagem_erro(msg))
        return

    # 6. Montagem do bilhete com gestão de banca
    saldo_atual = database.obter_saldo_banca()
    bilhete = bankroll.montar_bilhete(melhores_jogos, saldo_atual)

    # 7. Persistência
    bilhete_id = database.registrar_bilhete(
        stake=bilhete["stake"],
        odd_total=bilhete["odd_total"],
        retorno_potencial=bilhete["retorno_potencial"],
        lucro_esperado=bilhete["lucro_esperado"],
        jogos_selecionados=bilhete["jogos"],
    )

    # 8. Notificação via Telegram
    relatorio = email_notifier.formatar_relatorio_diario(bilhete, saldo_atual)
    email_notifier.enviar_mensagem(relatorio)

    logger.info("Bilhete #%s gerado e notificado com sucesso.", bilhete_id)
    logger.info("========== EXECUÇÃO FINALIZADA ==========")


if __name__ == "__main__":
    try:
        executar_pipeline_diario()
    except Exception as exc:
        logger.exception("Falha crítica não tratada no pipeline: %s", exc)
        # Tenta notificar o erro crítico via Telegram, se possível
        try:
            email_notifier.enviar_mensagem(
                f"🔴 *ERRO CRÍTICO NO BOT*\n\n`{str(exc)}`\n\nVerifique os logs da VPS."
            )
        except Exception:
            pass
        sys.exit(1)
