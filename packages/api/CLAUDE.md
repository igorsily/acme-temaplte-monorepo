# @workspace/api

Camada de API do monorepo. Define os routers tRPC, procedures e o contexto de requisição. É o contrato entre servidor e cliente — toda comunicação client→server passa por aqui.

## Responsabilidade

- Definir routers tRPC por domínio (input/output validation, chamada de serviços)
- Exportar `AppRouter` para o cliente web ter type-safety E2E
- Gerenciar autenticação via middleware (`protectedProcedure`)

**Não contém:** lógica de negócio (`packages/core`), acesso ao banco (`packages/db`), schemas (`packages/types`).

## Estrutura

```
src/
├── index.ts           # Inicialização tRPC: t, router, publicProcedure, protectedProcedure
├── context.ts         # Interface Context + factory createContext
└── routers/
    ├── index.ts       # Agrega todos os routers → appRouter + AppRouter type
    └── <domain>.ts    # Router de cada domínio
```

## Procedures

Dois níveis de acesso definidos em `src/index.ts`:

| Procedure | Quando usar |
|-----------|------------|
| `publicProcedure` | Rotas sem autenticação (ex: health check) |
| `protectedProcedure` | Rotas que exigem sessão válida. Injeta `ctx.userId` automaticamente |

O middleware de `protectedProcedure` lança `TRPCError({ code: "UNAUTHORIZED" })` se não houver sessão.

## Context

Disponível em todas as procedures via `ctx`:

```typescript
interface Context {
  services: Services;        // Serviços injetados pelo servidor
  session: Session | null;   // Sessão BetterAuth (null em rotas públicas)
  // userId: number          // Adicionado pelo middleware de protectedProcedure
}
```

O `createContext` é chamado a cada requisição. Recebe as opções do adaptador HTTP e a instância `Services` já instanciada.

## Padrão de Router

```typescript
// src/routers/<domain>.ts
import {
  create<Domain>Schema,
  list<Domain>Schema,
  list<Domain>ResponseSchema,
} from "@workspace/types/schemas/<domain>.schema";
import { protectedProcedure, router } from "..";

export const <domain>Router = router({
  create: protectedProcedure
    .input(create<Domain>Schema)         // Validação automática de input
    .mutation(async ({ input, ctx }) => {
      await ctx.services.<domain>Service.create(input, ctx.userId);
    }),

  list: protectedProcedure
    .input(list<Domain>Schema)
    .output(list<Domain>ResponseSchema)  // Valida output — garante contrato
    .query(async ({ input, ctx }) => {
      const { data, total } = await ctx.services.<domain>Service.list(input);
      return {
        data,
        total,
        pageCount: Math.ceil(total / input.limit),
      };
    }),
});
```

## Como Adicionar um Novo Domínio

### 1. Crie o router

```
src/routers/<domain>.ts
```

Siga o padrão acima. Importe schemas de `@workspace/types/schemas/<domain>.schema`.

### 2. Registre no router raiz

```typescript
// src/routers/index.ts
import { <domain>Router } from "./<domain>";

export const appRouter = router({
  // ...routers existentes
  <domain>: <domain>Router,
});

export type AppRouter = typeof appRouter;
```

### 3. Adicione o serviço ao `Services`

Se o domínio tem um serviço novo, adicione à interface `Services` em `packages/core/src/services/index.ts`.

## Transformer

SuperJSON é configurado no `t.create()`. Permite serializar tipos que JSON padrão não suporta: `Date`, `Map`, `Set`, `BigInt`. O cliente web deve configurar SuperJSON com o mesmo transformer.

## Exportações

```typescript
// apps/web importa para type-safety E2E
import type { AppRouter } from "@workspace/api/routers";

// apps/server importa para montar o servidor
import { appRouter } from "@workspace/api/routers";
import { createContext } from "@workspace/api/context";
```

## Regras

- **Nunca** acesse `db` diretamente em um router — use `ctx.services`
- **Sempre** use `.input()` com schema Zod — nunca receba dados brutos
- **Sempre** use `.output()` em queries de listagem para garantir o contrato de resposta
- **Nunca** coloque lógica de negócio no router — delegue ao serviço
- Mutations usam `.mutation()`, leituras usam `.query()`
