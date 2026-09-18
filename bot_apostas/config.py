# -*- coding: utf-8 -*-
"""
config.py
=========
Configurações centrais do Bot de Análise Esportiva e Gestão de Banca.

Todas as chaves sensíveis (API Keys, Tokens) devem vir de VARIÁVEIS DE AMBIENTE
e NUNCA devem ser escritas diretamente no código-fonte, especialmente em produção.

Como definir as variáveis de ambiente no Linux/VPS (bash):
    export FOOTBALL_API_KEY="sua_chave_aqui"
    export ODDS_API_KEY="sua_chave_aqui"
    export TELEGRAM_TOKEN="seu_token_aqui"
    export TELEGRAM_CHAT_ID="seu_chat_id_aqui"

Ou, de forma persistente, crie um arquivo .env (usando python-dotenv) e
carregue-o no início da execução (já implementado abaixo).
"""

import os
from dotenv import load_dotenv

# Carrega variáveis de um arquivo .env, se existir no mesmo diretório
load_dotenv()

# ----------------------------------------------------------------------
# CREDENCIAIS DE API (obrigatórias — o bot valida a presença delas no boot)
# ----------------------------------------------------------------------
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY", "")
FOOTBALL_API_HOST = os.getenv("FOOTBALL_API_HOST", "v3.football.api-sports.io")
FOOTBALL_API_BASE_URL = f"https://{FOOTBALL_API_HOST}"

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_API_BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ----------------------------------------------------------------------
# PARÂMETROS DE NEGÓCIO (gestão de banca e critérios de seleção)
# ----------------------------------------------------------------------
BANCA_INICIAL = float(os.getenv("BANCA_INICIAL", "2000.0"))
STAKE_PERCENTUAL = 0.02          # 2% da banca por aposta (regra fixa)
NUMERO_JOGOS_SELECIONADOS = 2    # quantidade de jogos por bilhete (dupla)
VALUE_MINIMO = 0.05              # edge mínimo (5%) para considerar "value bet"
ODD_MINIMA_ACEITAVEL = 1.30      # filtra odds "lixo" abaixo desse valor
ODD_MAXIMA_ACEITAVEL = 4.50      # evita long-shots com alta variância

# Ligas monitoradas (IDs da API-Football — ajuste conforme seu plano de API)
LIGAS_MONITORADAS = {
    "Premier League": 39,
    "La Liga": 140,
    "Serie A": 135,
    "Bundesliga": 78,
    "Ligue 1": 61,
    "Brasileirão": 71,
}

# Número de partidas históricas usadas para calcular médias de gols (Poisson)
JANELA_JOGOS_HISTORICO = 10

# ----------------------------------------------------------------------
# BANCO DE DADOS
# ----------------------------------------------------------------------
DB_PATH = os.getenv("DB_PATH", "bot_apostas.db")

# ----------------------------------------------------------------------
# TIMEOUTS E RETRY (resiliência de rede)
# ----------------------------------------------------------------------
HTTP_TIMEOUT_SEGUNDOS = 15
HTTP_MAX_TENTATIVAS = 3
HTTP_BACKOFF_SEGUNDOS = 2


def validar_credenciais() -> list:
    """
    Verifica quais credenciais obrigatórias estão ausentes.
    Retorna uma lista de nomes de variáveis faltantes (lista vazia = tudo OK).
    """
    faltando = []
    if not FOOTBALL_API_KEY:
        faltando.append("FOOTBALL_API_KEY")
    if not ODDS_API_KEY:
        faltando.append("ODDS_API_KEY")
    if not TELEGRAM_TOKEN:
        faltando.append("TELEGRAM_TOKEN")
    if not TELEGRAM_CHAT_ID:
        faltando.append("TELEGRAM_CHAT_ID")
    return faltando
