# @workspace/types

Pacote de tipos e schemas compartilhados em todo o monorepo. É a **única source of truth** para contratos de dados entre frontend, backend, API e banco de dados.

## Responsabilidade

- Definir schemas Zod de cada domínio (input, output, listagem)
- Exportar tipos TypeScript derivados dos schemas
- Disponibilizar schemas de paginação reutilizáveis

**Não contém:** lógica de negócio, acesso ao banco, configurações de runtime.

## Arquitetura: Zod-First

Todos os tipos TypeScript são **derivados de schemas Zod** via `z.infer<>`. Nunca crie interfaces TypeScript manualmente quando um schema Zod já existe ou pode ser criado.

```
Schema Zod (runtime) → z.infer<> → Tipo TypeScript (compile-time)
```

**Por que Zod-First?**
- Single source of truth: schema define tanto validação quanto tipos
- Validação em runtime no tRPC (input/output), nos formulários do web e no acesso ao banco
- Tree-shaking: importar apenas o tipo não inclui Zod no bundle

## Estrutura

```
src/
├── index.ts                       # Re-exporta todos os schemas
└── schemas/
    ├── common.schema.ts           # Schemas reutilizáveis (paginação)
    └── <domain>.schema.ts         # Schema de cada domínio
```

## Schemas Comuns (`common.schema.ts`)

### `listParamsSchema`
Parâmetros de paginação padrão para qualquer listagem:
```typescript
{ page: number, limit: number (max 100), sort?: string, search?: string }
```

### `listResponseSchema<T>(itemSchema)`
Factory genérica para respostas paginadas — aceita qualquer schema Zod:
```typescript
{ data: T[], total: number, pageCount: number }
```

## Padrão de Arquivo de Schema

Todo arquivo `<domain>.schema.ts` segue esta estrutura:

```typescript
import { z } from "zod";
import { listParamsSchema, listResponseSchema } from "./common.schema";

// 1. Schema de criação (input da API — dados enviados pelo cliente)
export const create<Domain>Schema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  // outros campos com constraints e mensagens de erro
});

// 2. Schema da entidade (output — dado completo após persistência)
export const <domain>Schema = z.object({
  id: z.string(),
  name: z.string(),
  // campos do domínio como armazenados/retornados
});

// 3. Schemas de listagem (reutiliza padrão comum)
export const list<Domain>Schema = listParamsSchema;
export const list<Domain>ResponseSchema = listResponseSchema(<domain>Schema);

// 4. Tipos derivados (sempre ao final do arquivo)
export type Create<Domain>Input = z.infer<typeof create<Domain>Schema>;
export type <Domain>             = z.infer<typeof <domain>Schema>;
export type List<Domain>Input    = z.infer<typeof list<Domain>Schema>;
export type List<Domain>Response = z.infer<typeof list<Domain>ResponseSchema>;
```

**Regras do schema:**
- Schemas de **input** validam e sanitizam dados recebidos do cliente
- Schemas de **entity** representam o dado completo retornado pela API/banco
- Separe input de entity quando os campos diferem (ex: campos flat no input vs objeto aninhado na entity)
- Mensagens de erro em PT-BR nas validações
- Use `z.enum()` para status e tipos fixos — mantenha o mesmo enum nos schemas e no banco

## Exportações

`src/index.ts` re-exporta todos os schemas:

```typescript
export * from "./schemas/common.schema";
export * from "./schemas/<domain>.schema";  // adicione aqui ao criar novo domínio
```

## Como Importar em Outros Pacotes

Use sempre o subpath do schema (evita importar o módulo inteiro):

```typescript
// ✅ Correto — subpath direto
import type { Create<Domain>Input, <Domain> } from "@workspace/types/schemas/<domain>.schema";
import { create<Domain>Schema } from "@workspace/types/schemas/<domain>.schema";

// ✅ Correto — import type para tree-shaking quando só precisa do tipo
import type { ListParams } from "@workspace/types/schemas/common.schema";

// ❌ Evitar — importa tudo do index sem necessidade
import { <Domain> } from "@workspace/types";
```

## Como Adicionar um Novo Domínio

1. Crie `src/schemas/<domain>.schema.ts` seguindo o padrão acima
2. Adicione `export * from "./schemas/<domain>.schema"` no `src/index.ts`
3. Adicione `"@workspace/types": "workspace:*"` no `package.json` de cada pacote consumidor

## Uso por Camada

| Camada | O que importa | Para quê |
|--------|--------------|----------|
| `packages/api` (tRPC) | schemas e tipos | `.input()` e `.output()` de procedures |
| `packages/core` | apenas tipos (`import type`) | interfaces de repositórios e serviços |
| `packages/db` | schemas e tipos | validação de saída com `.parse()`, implementação de repositórios |
| `apps/web` | schemas e tipos | validação de formulários, tipagem de hooks e componentes |

## Regras

- **Nunca** coloque lógica de negócio neste pacote — apenas schemas e tipos
- **Nunca** importe de `apps/` ou de outros packages que não sejam `zod`
- **Sempre** exporte o tipo derivado junto com o schema no mesmo arquivo
- Interfaces TypeScript puras sem schema Zod correspondente são **desencorajadas**
