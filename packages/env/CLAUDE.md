# @workspace/env

Validação e tipagem centralizada de variáveis de ambiente. Usa T3 Env + Zod para garantir que todas as variáveis obrigatórias existam e tenham o formato correto na inicialização da aplicação (fail-fast).

## Responsabilidade

- Validar variáveis de ambiente em runtime com Zod
- Exportar objetos `env` tipados separados por contexto (server / client)
- Falhar imediatamente na inicialização se variáveis obrigatórias estiverem ausentes ou inválidas

**Não contém:** lógica de negócio, configurações de banco, configurações de autenticação.

## Estrutura

```
src/
├── server.ts    # Variáveis server-side (Node.js — nunca exposta ao browser)
└── web.ts       # Variáveis client-side (Vite — prefixo VITE_)
```

## Subpath Exports

O pacote usa subpath exports — importe sempre pelo contexto correto:

```typescript
// Em packages/api, packages/auth, packages/db, apps/server
import { env } from "@workspace/env/server";

// Em apps/web
import { env } from "@workspace/env/web";
```

**Nunca** importe `env/server` em código client-side — expõe segredos ao bundle do browser.

## Variáveis Server-side (`src/server.ts`)

Variáveis mínimas para o template:

| Variável | Tipo | Default | Obrigatória |
|----------|------|---------|-------------|
| `PORT` | `number` | `3456` | Não |
| `DATABASE_URL` | `string` | — | Sim |
| `BETTER_AUTH_SECRET` | `string (min 32)` | — | Sim |
| `BETTER_AUTH_URL` | `url` | — | Sim |
| `CORS_ORIGIN` | `string` | — | Sim |
| `NODE_ENV` | `enum` | `development` | Não |
| `REDIS_HOST` | `string` | `localhost` | Não |
| `REDIS_PORT` | `number` | `6379` | Não |

## Variáveis Client-side (`src/web.ts`)

| Variável | Prefixo | Descrição |
|----------|---------|-----------|
| `VITE_SERVER_URL` | `VITE_` | URL base do servidor (para o client tRPC) |

Variáveis client-side usam `import.meta.env` (Vite) e **devem** ter o prefixo `VITE_`.

## Como Adicionar uma Nova Variável

### Server-side

```typescript
// src/server.ts
export const env = createEnv({
  server: {
    // ...variáveis existentes
    NOVA_VAR: z.string().min(1),           // Obrigatória
    COM_DEFAULT: z.string().default("val"), // Opcional com fallback
    NUMERO: z.coerce.number().default(0),   // Coerce string → number
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

### Client-side (Vite)

```typescript
// src/web.ts
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    // ...variáveis existentes
    VITE_NOVA_FEATURE_URL: z.string().url(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
```

Após adicionar, atualize o `.env.example` no app correspondente.

## Comportamento de Falha (Fail-Fast)

Se uma variável obrigatória estiver ausente ou inválida, T3 Env lança um erro **na inicialização do módulo** — a aplicação não sobe. O erro lista claramente quais variáveis estão problemáticas.

## Regras

- **Nunca** use `process.env.VARIAVEL` diretamente — sempre importe de `@workspace/env/server` ou `@workspace/env/web`
- **Nunca** importe `@workspace/env/server` em código que vai para o browser
- `emptyStringAsUndefined: true` trata `""` como ausente — não passe string vazia como valor de variável obrigatória
- `z.coerce.number()` aceita strings (como `.env` retorna) e converte automaticamente
- Ao adicionar uma variável, documente no `.env.example` do app correspondente
