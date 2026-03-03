# @workspace/core

Camada de domínio e lógica de negócio do monorepo. Define as interfaces de repositório e implementa os serviços de aplicação. É o núcleo independente de infraestrutura — não conhece Drizzle, PostgreSQL, nem HTTP.

## Responsabilidade

- Definir interfaces de repositório (contratos de persistência, sem implementação)
- Implementar serviços de aplicação (orquestração de regras de negócio)
- Exportar a interface `Services` consumida pelo context tRPC

**Não contém:** acesso ao banco (`packages/db`), routers HTTP/tRPC (`packages/api`), schemas Zod (`packages/types`).

## Estrutura

```
src/
├── index.ts                        # Exports públicos do pacote
├── repositories/
│   └── <domain>.repository.ts      # Interface de cada repositório
└── services/
    ├── index.ts                     # Interface Services (contrato de DI)
    └── <domain>.service.ts          # Serviço de cada domínio
```

## Padrões de Design

### Repository Pattern

Interfaces em `src/repositories/` definem o **contrato** de persistência sem saber como os dados são armazenados:

```typescript
// packages/core/src/repositories/<domain>.repository.ts
import type { ListParams } from "@workspace/types/schemas/common.schema";
import type { Create<Domain>Input, <Domain> } from "@workspace/types/schemas/<domain>.schema";

export interface <Domain>Repository {
  create(input: Create<Domain>Input, userId: number): Promise<void>;
  list(params: ListParams): Promise<{ data: <Domain>[]; total: number }>;
  // findById(id: string): Promise<<Domain> | null>;
}
```

A implementação concreta (`Drizzle<Domain>Repository`) fica em `packages/db`.

### Dependency Injection via Constructor

Serviços recebem repositórios via constructor — sem acoplamento à implementação:

```typescript
// packages/core/src/services/<domain>.service.ts
export class <Domain>Service {
  constructor(private readonly <domain>Repository: <Domain>Repository) {}

  async create(input: Create<Domain>Input, userId: number): Promise<void> {
    // lógica de negócio aqui (validações extras, eventos, etc.)
    await this.<domain>Repository.create(input, userId);
  }

  async list(params: ListParams): Promise<{ data: <Domain>[]; total: number }> {
    return this.<domain>Repository.list(params);
  }
}
```

Isso permite trocar a implementação por um mock em testes sem alterar o serviço.

### Interface `Services`

Define o contrato de todos os serviços disponíveis no context tRPC:

```typescript
// src/services/index.ts
import type { <Domain>Service } from "./<domain>.service";

export interface Services {
  <domain>Service: InstanceType<typeof <Domain>Service>;
}
```

## Como Adicionar um Novo Domínio

### 1. Defina a interface do repositório

```typescript
// src/repositories/<domain>.repository.ts
import type { ListParams } from "@workspace/types/schemas/common.schema";
import type { Create<Domain>Input, <Domain> } from "@workspace/types/schemas/<domain>.schema";

export interface <Domain>Repository {
  create(input: Create<Domain>Input, userId: number): Promise<void>;
  list(params: ListParams): Promise<{ data: <Domain>[]; total: number }>;
}
```

### 2. Implemente o serviço

```typescript
// src/services/<domain>.service.ts
import type { <Domain>Repository } from "@/repositories/<domain>.repository";
import type { Create<Domain>Input, <Domain> } from "@workspace/types/schemas/<domain>.schema";
import type { ListParams } from "@workspace/types/schemas/common.schema";

export class <Domain>Service {
  constructor(private readonly <domain>Repository: <Domain>Repository) {}

  async create(input: Create<Domain>Input, userId: number): Promise<void> {
    await this.<domain>Repository.create(input, userId);
  }

  async list(params: ListParams): Promise<{ data: <Domain>[]; total: number }> {
    return this.<domain>Repository.list(params);
  }
}
```

### 3. Adicione à interface `Services`

```typescript
// src/services/index.ts
import type { <Domain>Service } from "./<domain>.service";

export interface Services {
  // serviços existentes...
  <domain>Service: InstanceType<typeof <Domain>Service>;
}
```

### 4. Exporte no `src/index.ts`

```typescript
export type * from "./repositories/<domain>.repository";
export * from "./services/<domain>.service";
```

### 5. Próximos passos (fora deste pacote)

- Implemente `Drizzle<Domain>Repository` em `packages/db`
- Instancie o serviço na factory em `apps/server/src/services-factory.ts`
- Crie o router em `packages/api/src/routers/<domain>.ts`

## Exportações

```typescript
// Apenas tipos de repositório (import type — sem custo de runtime)
export type * from "./repositories/<domain>.repository";

// Interface Services (import type — sem custo de runtime)
export type { Services } from "./services/index";

// Classes de serviço (têm custo de runtime — necessário para instanciação)
export * from "./services/<domain>.service";
```

## Regras

- **Nunca** importe de `packages/db`, `packages/api` ou `apps/` — evita dependências circulares
- **Sempre** receba dependências via constructor (DI puro)
- Repositórios só conhecem tipos de `packages/types` — nunca tipos do ORM
- Lógica de negócio mais complexa (validações, eventos de domínio) fica nos serviços, não nos routers
- Use `export type *` para interfaces — não geram código em runtime
