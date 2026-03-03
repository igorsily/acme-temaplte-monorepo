# @workspace/db

Camada de persistência do monorepo. Contém a instância Drizzle ORM, schemas das tabelas e implementações concretas dos repositórios definidos em `packages/core`.

## Responsabilidade

- Instanciar e exportar a conexão `db` (Drizzle + postgres.js)
- Definir schemas das tabelas (`src/schema/`)
- Implementar interfaces de repositório (`src/repositories/`)
- Gerenciar migrations via Drizzle Kit

**Não contém:** lógica de negócio (`packages/core`), validação de input (`packages/types`).

## Estrutura

```
src/
├── index.ts                           # Instância db exportada
├── cuid2.ts                           # Gerador de IDs (CUID2)
├── schema/
│   ├── index.ts                       # Re-exporta todos os schemas
│   ├── base-table.ts                  # Colunas base (createdAt, updatedAt)
│   ├── auth.ts                        # Schema de autenticação (BetterAuth)
│   └── <domain>.ts                    # Schema de cada domínio
├── repositories/
│   └── <domain>.repository.ts         # Implementação Drizzle de cada repositório
└── migrations/                        # Arquivos SQL gerados pelo Drizzle Kit
```

## Instância `db` (`src/index.ts`)

```typescript
export const db = drizzle(sql, { schema, casing: "snake_case" });
```

- **Driver**: `postgres.js`
- **Casing**: `snake_case` — Drizzle converte `camelCase` → `snake_case` automaticamente no SQL
- **SSL**: habilitado em produção
- **Pool**: `max: 1` — adequado para serverless; ajuste para servidores long-lived

## Geração de IDs (`src/cuid2.ts`)

Todos os IDs primários usam CUID2:

```typescript
export const createId = init({ length: 25 });
```

Use `.$defaultFn(() => createId())` ao declarar colunas `id`.

## Schema de Tabelas

### Colunas Base (`src/schema/base-table.ts`)

Toda tabela de domínio inclui `createdAt` e `updatedAt` via spread:

```typescript
// src/schema/<domain>.ts
import { pgTable, text } from "drizzle-orm/pg-core";
import { createId } from "../cuid2";
import { user } from "./auth";
import { baseColumns } from "./base-table";

export const <domain> = pgTable("<domain>s", {
  ...baseColumns(),                                      // createdAt + updatedAt
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  // campos específicos do domínio...
});
```

Após criar, re-exporte em `src/schema/index.ts`.

### Schema de Auth (`src/schema/auth.ts`)

Gerenciado pelo BetterAuth — **não altere as tabelas** `users`, `sessions`, `accounts`, `verifications` manualmente. Use plugins do BetterAuth para extensões.

## Implementação de Repositório

Cada repositório implementa a interface correspondente de `packages/core`:

```typescript
// src/repositories/<domain>.repository.ts
import type { <Domain>Repository } from "@workspace/core";
import type { ListParams } from "@workspace/types/schemas/common.schema";
import {
  type Create<Domain>Input,
  type <Domain>,
  <domain>Schema,
} from "@workspace/types/schemas/<domain>.schema";
import { asc, count, desc, ilike } from "drizzle-orm";
import type { db } from "..";
import { <domain> } from "../schema/<domain>";

export class Drizzle<Domain>Repository implements <Domain>Repository {
  constructor(private readonly db: typeof db) {}

  async list(params: ListParams): Promise<{ data: <Domain>[]; total: number }> {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;
    const whereClause = search ? ilike(<domain>.name, `%${search}%`) : undefined;

    // Queries paralelas para performance
    const [rows, [totalCount]] = await Promise.all([
      this.db.select().from(<domain>).where(whereClause).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(<domain>).where(whereClause),
    ]);

    return {
      data: rows.map((row) => <domain>Schema.parse(row)), // Valida output com Zod
      total: Number(totalCount?.count ?? 0),
    };
  }

  async create(input: Create<Domain>Input, userId: number): Promise<void> {
    await this.db.insert(<domain>).values({
      name: input.name,
      userId,
      // mapeie os campos de input para colunas do banco
    });
  }
}
```

**Padrões obrigatórios:**
- `Promise.all()` para queries paralelas (data + total) — evita waterfall
- `<domain>Schema.parse()` para validar cada registro ao sair do banco
- Receba `db` via constructor — nunca importe a instância global dentro da classe

## Migrations

Comandos disponíveis (via package.json scripts):

| Comando | Ação |
|---------|------|
| `db:generate` | Gera SQL da migration a partir dos schemas |
| `db:migrate` | Aplica migrations pendentes no banco |
| `db:push` | Push direto (apenas dev — sem migration file) |
| `db:studio` | Abre Drizzle Studio (GUI do banco) |
| `db:start` | Sobe PostgreSQL via Docker Compose |

O `drizzle.config.ts` lê `DATABASE_URL` do `.env` de `apps/server`.

## Mapeamento de Tipos Complexos

Quando o formato do banco difere do domínio (ex: tipos geográficos, JSON, enum), faça o mapeamento no repositório:

```typescript
// Banco → Domínio
data: rows.map((row) => <domain>Schema.parse({
  ...row,
  // transformações necessárias aqui
}))

// Domínio → Banco
await this.db.insert(<domain>).values({
  // transformações necessárias aqui
})
```

## Regras

- **Nunca** importe `db` em `packages/core` — o core não conhece o ORM
- **Sempre** valide com `.parse()` os dados retornados pelo banco
- Repositórios recebem `db` via constructor (DI) — nunca importem a instância global dentro da classe
- Ao criar uma tabela, re-exporte em `src/schema/index.ts`
- Não altere tabelas do BetterAuth manualmente — use plugins
