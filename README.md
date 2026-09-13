# +Tabua

PWA de gestão de finanças pessoais e familiares para o mercado angolano.
React + Vite + TypeScript, Dexie/IndexedDB para uso offline, e Supabase
(Postgres + Auth + Storage + Edge Functions) como backend.

## Desenvolvimento

```bash
npm install
npm run dev
```

Copia `.env.example` para `.env` e preenche as variáveis do projeto Supabase
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e as restantes usadas na UI
(preços, número Multicaixa Express, email do super-admin).

## Backend (Supabase)

O schema (tabelas, RLS, triggers) está em `supabase/functions` e foi aplicado
diretamente ao projeto via migrações. Para voltar a aplicar alterações,
usa o CLI do Supabase ou o painel do projeto.

A Edge Function `verify-payment` (verificação de comprovativos por IA) precisa
dos seguintes secrets configurados no projeto Supabase (nunca no `.env` do
frontend):

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-... \
  ANTHROPIC_VERIFY_MODEL=claude-sonnet-4-6 \
  MCX_NUMBER=943231005 \
  --project-ref <project-ref>
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (typecheck + Vite build + PWA)
- `npm run lint` — oxlint
- `npm run preview` — pré-visualizar o build de produção
