# @workspace/auth

Camada de autenticação do monorepo. Instancia e configura o BetterAuth com Drizzle adapter e Redis como storage secundário para sessões e tokens.

## Responsabilidade

- Configurar e exportar a instância `auth` (BetterAuth)
- Gerenciar sessões via Redis (dev: standalone, prod: cluster)
- Expor rotas HTTP de autenticação (`/api/auth/*`) via `apps/server`
- Fornecer `auth.api.getSession()` para o context tRPC

**Não contém:** lógica de negócio, schemas de usuário (ficam em `packages/db/schema/auth`).

## Estrutura

```
src/
├── index.ts    # Instância BetterAuth configurada e exportada
└── redis.ts    # Cliente Redis com seleção prod/dev
```

## Configuração BetterAuth (`src/index.ts`)

| Aspecto | Decisão |
|---------|---------|
| Database | Drizzle adapter (PostgreSQL) |
| Schema | `packages/db/schema/auth` |
| Autenticação | Email + senha com auto sign-in |
| Storage secundário | Redis (sessões e tokens efêmeros) |
| Cookies | `sameSite: none`, `secure: true`, `httpOnly: true` |
| Plugins | `openAPI` (docs), `username` (login sem email) |

## Redis (`src/redis.ts`)

Seleção de cliente em runtime baseada em `NODE_ENV`:

```
production  → Redis.Cluster (com TLS, para alta disponibilidade)
development → Redis standalone
```

Ambos leem `REDIS_HOST` e `REDIS_PORT` de `@workspace/env/server`.

## Como é Consumido

### No context tRPC (`packages/api/context.ts`)
```typescript
import { auth } from "@workspace/auth";

const session = await auth.api.getSession({
  headers: fromNodeHeaders(req.headers),
});
```

### No servidor (`apps/server`)
```typescript
import { auth } from "@workspace/auth";

// Registra todas as rotas /api/auth/* automaticamente
app.register(fastifyBetterAuth, { auth });
```

## Adicionando Novos Plugins BetterAuth

```typescript
// src/index.ts
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    openAPI({}),
    username(),
    twoFactor(),  // adicione aqui
  ],
});
```

Se o plugin requer novas colunas no banco, atualize `packages/db/schema/auth.ts` e gere uma migration.

## Regras

- **Nunca** importe `auth` em código client-side — o objeto expõe segredos de servidor
- **Nunca** adicione lógica de negócio aqui — `auth` só gerencia identidade e sessão
- O schema do banco deve estar em sincronia com os plugins ativos
- `BETTER_AUTH_SECRET` deve ter no mínimo 32 caracteres — validado em `@workspace/env/server`
- Alterações nos plugins geralmente requerem novas colunas → nova migration
