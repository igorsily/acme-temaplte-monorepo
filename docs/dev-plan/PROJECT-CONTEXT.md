# Contexto do Projeto — Omnia

## Estrutura
- Monorepo Turborepo + Bun
- Organização: layer-based (packages por responsabilidade)
- `packages/core`: interfaces/services (domain layer)
- `packages/db`: implementações Drizzle (infrastructure layer)
- `packages/api`: routers tRPC
- `packages/env`: env vars validados com @t3-oss/env-core
- `apps/server`: Fastify 5 entry point
- `apps/web`: React 19 + TanStack Router

## CRÍTICO: Aliases de Packages
O dev-plan usa `@omnia/` — o projeto real usa `@omnia/`:
- `@omnia/db` → packages/db
- `@omnia/core` → packages/core
- `@omnia/env` → packages/env
- `@omnia/api` → packages/api
- `@omnia/types` → packages/types
- `@omnia/auth` → packages/auth

## Padrões Identificados

### Schema Drizzle (referência: packages/db/src/schema/foo.ts)
- `bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity()` — NÃO uuid
- `baseColumns()` = { id, createdAt, updatedAt }
- `baseColumnsWithUserId()` = { id, createdAt, updatedAt, userId }
- timestamps: `timestamp("created_at").defaultNow().notNull()`
- updatedAt com `.$onUpdate(() => new Date())`
- Barrel usa imports RELATIVOS (`./`) não path aliases

### Repository Interface (referência: packages/core/src/repositories/foor.repository.ts)
- Interface TypeScript pura, sem implementação
- Imports de types de @omnia/types

### Repository Implementação (referência: packages/db/src/repositories/foo.repository.ts)
- `implements FooRepository` da interface
- Recebe `typeof db` no constructor
- Usa imports diretos do schema (`../schema/foo`)

### Service (referência: packages/core/src/services/foo.service.ts)
- Classe com `private readonly repository`
- Constructor injection
- Exports: `class` + `type ServiceType = InstanceType<...>`

### tRPC Router (referência: packages/api/src/routers/foo.ts)
- `protectedProcedure` para mutations autenticadas
- `ctx.services.fooService.*` para acessar services
- `ctx.userId` para userId do usuário autenticado

### Services Factory (referência: apps/server/src/services-factory.ts)
- Importa repositories de `@omnia/db/repositories/[name].repository`
- Importa services de `@omnia/core/services/[name].service`
- Retorna objeto tipado pelo interface `Services`

### Services Interface (referência: packages/core/src/services/index.ts)
- `interface Services` com todos os services tipados

## Env Vars
- Package: `@omnia/env`
- Import: `import { env } from "@omnia/env/server"`
- Adições devem ir em `packages/env/src/server.ts`

## Padrões Importantes
- `bigint` com `mode: "number"` para IDs (não uuid, não serial)
- Barrel de packages usa imports RELATIVOS (`./`)
- `noUncheckedIndexedAccess: true` — checar `array[0]` antes de usar
- `drizzle({ schema, casing: "snake_case" })` — casing automático
