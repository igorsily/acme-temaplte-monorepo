# apps/server

Servidor HTTP construído com Fastify. Responsável por inicializar a aplicação, registrar plugins, expor rotas e montar a camada de injeção de dependência que conecta os packages.

## Responsabilidade

- Inicializar e configurar o Fastify
- Registrar plugins (CORS, error handler, tRPC, Swagger)
- Registrar rotas HTTP (`/api/health`, `/api/auth/*`, `/api/trpc/*`)
- Instanciar repositórios e serviços via factory (DI manual)
- Servir como ponto de entrada único da stack de backend

**Não contém:** lógica de negócio (`packages/core`), schemas (`packages/types`), routers tRPC (`packages/api`).

## Estrutura

```
src/
├── index.ts                  # Entry point — inicializa e sobe o servidor
├── app.ts                    # buildApp() — factory do Fastify
├── services-factory.ts       # DI manual — instancia repositórios e serviços
├── plugins/
│   ├── index.ts              # Registra todos os plugins em ordem
│   ├── cors.ts               # Configuração de CORS
│   ├── error-handler.ts      # Tratamento global de erros
│   ├── trpc.ts               # Integração tRPC + Fastify
│   └── swagger.ts            # OpenAPI / Scalar docs
└── routes/
    ├── index.ts              # Registra todas as rotas com prefixo /api
    ├── health/index.ts       # GET /api/health
    └── auth/index.ts         # ALL /api/auth/* (BetterAuth handler)
```

## Inicialização

### Fluxo de boot (`index.ts` → `app.ts`)

```
1. Lê PORT de @workspace/env/server
2. buildApp() → cria instância Fastify com logger configurado
3. Registra plugins (ordem importa — ver abaixo)
4. Registra rotas com prefixo /api
5. app.listen({ port, host: "0.0.0.0" })
```

### Logger

- **Desenvolvimento**: pino-pretty com nível `debug`, saída formatada
- **Produção**: nível `info`, JSON puro (sem pretty printing)
- **Redact**: campos sensíveis como `authorization`, cookies, passwords e tokens são omitidos dos logs

## Plugins

A ordem de registro importa — respeite a sequência:

```
1. errorHandlerPlugin  → deve ser o primeiro (captura erros dos demais)
2. corsPlugin          → antes de qualquer rota receber requisições
3. trpcPlugin          → monta /api/trpc/* com context e router
4. swaggerPlugin       → documentação em /api/docs
```

### CORS (`plugins/cors.ts`)

```typescript
origin: env.CORS_ORIGIN      // Lê da variável de ambiente
credentials: true             // Necessário para cookies de autenticação
maxAge: 86_400                // Cache de preflight por 24h
```

### tRPC (`plugins/trpc.ts`)

```typescript
fastify.register(fastifyTRPCPlugin, {
  prefix: "/api/trpc",
  trpcOptions: {
    router: appRouter,          // De @workspace/api
    createContext: (opts) => createContext(opts, services), // Injeta Services
  },
})
```

O `services` é criado uma vez no registro do plugin e passado para cada requisição via `createContext`.

### Error Handler (`plugins/error-handler.ts`)

- Erros de validação → `400` com detalhes dos campos
- Produção: apenas `"Internal Server Error"` para erros inesperados
- Desenvolvimento: mensagem completa com stack trace
- Todos os erros são logados via `request.log.error`

### Swagger (`plugins/swagger.ts`)

- `@fastify/swagger` gera o schema OpenAPI 3.0
- `@scalar/fastify-api-reference` renderiza a documentação em `/api/docs`
- Inclui autenticação via Bearer JWT no schema

## Rotas

### `GET /api/health`

Health check simples. Retorna `{ hello: "OK" }`. Usado por load balancers e monitoramento.

### `ALL /api/auth/*`

Proxy pass-through para o handler do BetterAuth:

```
FastifyRequest → Web Request API → auth.handler(req) → Web Response API → FastifyReply
```

BetterAuth gerencia internamente as rotas de sign-in, sign-up, sessão, etc.

### `/api/trpc/*`

Gerenciado automaticamente pelo plugin tRPC. Expõe todos os routers de `@workspace/api`.

## Services Factory (DI Manual)

O arquivo `services-factory.ts` é o único lugar onde repositórios e serviços são instanciados:

```typescript
// src/services-factory.ts
import { db } from "@workspace/db";
import { Drizzle<Domain>Repository } from "@workspace/db/repositories/<domain>.repository";
import { <Domain>Service } from "@workspace/core";
import type { Services } from "@workspace/core";

export const servicesFactory = (): Services => {
  // 1. Instancia repositórios com db injetado
  const <domain>Repository = new Drizzle<Domain>Repository(db);

  // 2. Instancia serviços com repositórios injetados
  return {
    <domain>Service: new <Domain>Service(<domain>Repository),
  };
};
```

**Ao adicionar um novo domínio:**
1. Adicione o repositório e serviço aqui
2. Retorne o novo serviço no objeto `Services`

## Build

Usa `tsdown` (baseado em Rolldown/esbuild):

```typescript
// tsdown.config.ts
{
  entry: ["./src/index.ts", "./src/migrate.ts"],
  format: "esm",
  outDir: "./dist",
  noExternal: [/@workspace\/.*/]   // Faz bundle dos packages do workspace
}
```

## Variáveis de Ambiente

Veja `packages/env/src/server.ts` para a lista completa. Arquivo `.env` deve estar em `apps/server/.env`.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/db
BETTER_AUTH_SECRET=<string longa e aleatória, min 32 chars>
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

## Regras

- **Nunca** coloque lógica de negócio aqui — delegue para serviços em `packages/core`
- **Nunca** acesse o banco diretamente nas rotas — use `ctx.services` no tRPC ou `auth` nas rotas de auth
- A factory de serviços é o **único lugar** onde repositórios são instanciados
- Novos domínios precisam ser registrados na factory E no router tRPC de `packages/api`
- Adicione novas variáveis de ambiente em `packages/env/src/server.ts` primeiro, depois use aqui
