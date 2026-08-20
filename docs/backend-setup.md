# Backend setup

## Configuração de produção

1. Faça login no Cloudflare e crie o banco:

```bash
npx wrangler login
npx wrangler d1 create noma-db
```

Add the returned D1 `database_id` to `wrangler.jsonc`:

```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "noma-db",
  "database_id": "<id returned by wrangler>"
}]
```

Substitua também `PUBLIC_SITE_URL` em `wrangler.jsonc` pelo domínio final. Depois aplique o schema e cadastre os segredos:

```bash
npx wrangler d1 migrations apply noma-db --remote
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run deploy
```

No Stripe, crie um endpoint `https://SEU-DOMINIO.com.br/api/webhooks/stripe` ouvindo `checkout.session.completed` e copie o signing secret para `STRIPE_WEBHOOK_SECRET`. Teste primeiro com as chaves de teste (`sk_test_`), valide um pedido completo e só então troque para as chaves de produção (`sk_live_`).

O painel `admin.html` ainda é apenas um catálogo local do navegador; não use essa tela para gerir o estoque de produção. O estoque real deve ser alterado diretamente no D1 até a autenticação do painel ser implementada.
