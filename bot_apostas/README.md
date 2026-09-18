# Bot de Análise Esportiva e Gestão de Banca

## Início rápido

1. Crie o ambiente e instale as dependências (cria também o `.env` a partir
   do exemplo, se ainda não existir):
   ```
   ./setup.sh
   ```
   Ou manualmente:
   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

2. Preencha o `.env` com as suas credenciais reais (FOOTBALL_API_KEY,
   ODDS_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_TO).
   Veja no docstring de `main.py` o passo a passo de como obter cada uma
   (o WhatsApp usa o Twilio Sandbox, gratuito para testes).

3. (Opcional) Valide a lógica de negócio sem precisar de credenciais nem
   rede, usando dados fictícios:
   ```
   source venv/bin/activate
   python smoke_test.py
   ```

4. Execute o bot (requer as credenciais reais no `.env`):
   ```
   source venv/bin/activate
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
| `whatsapp_notifier.py` | Envio do relatório diário via WhatsApp (Twilio Sandbox) |
| `main.py` | Orquestrador do pipeline + instruções completas de deploy em VPS |
| `setup.sh` | Cria o venv, instala dependências e o `.env` inicial |
| `smoke_test.py` | Testa a lógica de negócio (Poisson/value/bankroll) com dados fictícios |

## Deploy em produção

Instruções completas (VPS, cron job, obtenção de credenciais) estão no
docstring no topo de `main.py`. Resumo do agendamento diário (cron, 08:00):

```
0 8 * * * cd /root/bot_apostas && /root/bot_apostas/venv/bin/python main.py >> /root/bot_apostas/bot.log 2>&1
```

## Aviso

Este bot é uma ferramenta de apoio analítico. Nenhum modelo estatístico
elimina o risco inerente a apostas esportivas.
