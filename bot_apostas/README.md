# Bot de Análise Esportiva e Gestão de Banca

## Início rápido

1. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```

2. Copie `.env.example` para `.env` e preencha com suas credenciais reais:
   ```
   cp .env.example .env
   ```
   (veja no docstring de `main.py` como obter cada chave — FOOTBALL_API_KEY,
   ODDS_API_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID)

3. Execute:
   ```
   python main.py
   ```

## Estrutura dos arquivos

| Arquivo | Função |
|---|---|
| `config.py` | Configurações e variáveis de ambiente |
| `database.py` | Persistência SQLite (banca + bilhetes) |
| `football_api.py` | Calendário de jogos e médias de gols |
| `odds_api.py` | Cotações das casas de apostas |
| `poisson_model.py` | Motor estatístico (Distribuição de Poisson) |
| `value_betting.py` | Filtro de value bets e seleção dos melhores jogos |
| `bankroll.py` | Cálculo de stake, odd total e retorno |
| `telegram_notifier.py` | Envio do relatório diário |
| `main.py` | Orquestrador do pipeline + instruções completas de deploy em VPS |

## Deploy em produção

Instruções completas (VPS, cron job, obtenção de credenciais) estão no
docstring no topo de `main.py`. Resumo do agendamento diário (cron, 08:00):

```
0 8 * * * cd /root/bot_apostas && /root/bot_apostas/venv/bin/python main.py >> /root/bot_apostas/bot.log 2>&1
```

## Aviso

Este bot é uma ferramenta de apoio analítico. Nenhum modelo estatístico
elimina o risco inerente a apostas esportivas.
