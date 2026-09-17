#!/usr/bin/env bash
# Prepara o ambiente do bot_apostas: cria o venv, instala dependências
# e copia o .env.example para .env (se ainda não existir).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d venv ]; then
    python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Ficheiro .env criado a partir de .env.example — preenche as tuas credenciais antes de correr o bot."
fi

echo "Ambiente pronto. Para executar: source venv/bin/activate && python main.py"
