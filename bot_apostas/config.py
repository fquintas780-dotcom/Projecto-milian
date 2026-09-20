# -*- coding: utf-8 -*-
"""
config.py
=========
Configurações centrais do Bot de Análise Esportiva e Gestão de Banca.

Todas as chaves sensíveis (API Keys, Tokens) devem vir de VARIÁVEIS DE AMBIENTE
e NUNCA devem ser escritas diretamente no código-fonte, especialmente em produção.

Como definir as variáveis de ambiente no Linux/VPS (bash):
    export FOOTBALL_DATA_API_KEY="sua_chave_aqui"
    export ODDS_API_KEY="sua_chave_aqui"
    export EMAIL_REMETENTE="seu_email@gmail.com"
    export EMAIL_APP_PASSWORD="sua_senha_de_app_de_16_caracteres"
    export EMAIL_DESTINATARIO="seu_email@gmail.com"

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
FOOTBALL_DATA_API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4"

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"

EMAIL_REMETENTE = os.getenv("EMAIL_REMETENTE", "")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "")
EMAIL_DESTINATARIO = os.getenv("EMAIL_DESTINATARIO", "")
EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "465"))

# ----------------------------------------------------------------------
# PARÂMETROS DE NEGÓCIO (gestão de banca e critérios de seleção)
# ----------------------------------------------------------------------
BANCA_INICIAL = float(os.getenv("BANCA_INICIAL", "2000.0"))
STAKE_PERCENTUAL = 0.02          # 2% da banca por aposta (regra fixa)
NUMERO_JOGOS_SELECIONADOS = 5    # quantidade de jogos por bilhete
VALUE_MINIMO = 0.05              # edge mínimo (5%) para considerar "value bet"
VALUE_MAXIMO = 0.30              # acima disto é mais provável ruído/erro do que oportunidade real
ODD_MINIMA_ACEITAVEL = 1.30      # filtra odds "lixo" abaixo desse valor
ODD_MAXIMA_ACEITAVEL = 4.50      # evita long-shots com alta variância
MAX_PERNAS_POR_JOGO = 2          # limite de mercados combinados no mesmo jogo (1X2 + Over/Under 2.5)
PROBABILIDADE_MINIMA_BILHETE = 0.05  # abaixo disto, o bilhete combinado é rejeitado por segurança

# Ligas monitoradas (códigos da football-data.org — todas incluídas no plano
# gratuito, com acesso à época atual)
LIGAS_MONITORADAS = {
    "Premier League": "PL",
    "La Liga": "PD",
    "Serie A": "SA",
    "Bundesliga": "BL1",
    "Ligue 1": "FL1",
    "Brasileirão": "BSA",
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
    if not FOOTBALL_DATA_API_KEY:
        faltando.append("FOOTBALL_DATA_API_KEY")
    if not ODDS_API_KEY:
        faltando.append("ODDS_API_KEY")
    if not EMAIL_REMETENTE:
        faltando.append("EMAIL_REMETENTE")
    if not EMAIL_APP_PASSWORD:
        faltando.append("EMAIL_APP_PASSWORD")
    if not EMAIL_DESTINATARIO:
        faltando.append("EMAIL_DESTINATARIO")
    return faltando
