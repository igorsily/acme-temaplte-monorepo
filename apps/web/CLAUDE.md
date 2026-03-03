# apps/web

Aplicação React com roteamento file-based, data fetching via tRPC + React Query, e autenticação integrada com BetterAuth. Toda a comunicação com o servidor é type-safe E2E graças ao `AppRouter` exportado por `packages/api`.

## Responsabilidade

- Renderizar a interface do usuário
- Gerenciar roteamento client-side (TanStack Router, file-based)
- Consumir a API via tRPC client com type-safety E2E
- Gerenciar estado de autenticação via BetterAuth client

**Não contém:** lógica de negócio, acesso direto ao banco, configurações de servidor.

## Estrutura

```
src/
├── main.tsx                         # Entry point — monta providers e router
├── router.tsx                       # Instância do TanStack Router + context global
├── index.css                        # Estilos globais (Tailwind)
├── routes/                          # Páginas (file-based routing)
│   ├── __root.tsx                   # Layout raiz + RouterAppContext
│   ├── index.tsx                    # Redirect baseado em autenticação
│   ├── _public.tsx                  # Layout público (não autenticado)
│   ├── _public/
│   │   └── login.tsx                # Página de login
│   ├── _authenticated.tsx           # Layout autenticado (guard)
│   └── _authenticated/
│       ├── dashboard.tsx            # Dashboard principal
│       └── <feature>/index.tsx      # Página de listagem de cada feature
├── components/
│   ├── ui/                          # Componentes primitivos (shadcn/ui)
│   ├── features/                    # Componentes de domínio
│   │   └── <feature>/               # Componentes de cada feature
│   ├── data-table/                  # DataTable reutilizável
│   └── form-factory/                # Sistema de formulários tipados
├── hooks/
│   └── <feature>/                   # Hooks de data fetching por feature
│       ├── use-<feature>.query.ts   # useQuery para listagem
│       └── use-<feature>-create-mutation.ts
├── lib/
│   ├── trpc.ts                      # tRPC client + QueryClient
│   ├── auth-client.ts               # BetterAuth client
│   ├── logger.ts                    # Logger client-side
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
└── helpers/
    ├── date.ts                      # Formatação de datas
    └── initials.ts                  # Geração de iniciais para avatars
    └── field-required.ts            # Helper para campos obrigatórios

```

## Providers (ordem em `main.tsx`)

```
ThemeProvider (next-themes)
  └── QueryClientProvider (@tanstack/react-query)
        └── NuqsAdapter (URL state management)
              └── RouterProvider (TanStack Router)
                    └── Toaster (sonner)
```

## Roteamento

TanStack Router com file-based routing. O `routeTree.gen.ts` é **auto-gerado** pelo plugin Vite — nunca edite manualmente.

### Layouts e Guards

| Arquivo | Propósito |
|---------|-----------|
| `__root.tsx` | Layout raiz, define `RouterAppContext` |
| `_public.tsx` | Layout para rotas públicas. Redireciona para `/dashboard` se autenticado |
| `_authenticated.tsx` | Guard de autenticação. Redireciona para `/login` se não autenticado |

### Como Adicionar uma Nova Página

1. Crie o arquivo em `src/routes/_authenticated/<feature>/index.tsx`
2. O TanStack Router detecta automaticamente e atualiza `routeTree.gen.ts`
3. Adicione o link de navegação em `components/app-sidebar.tsx`

```typescript
// src/routes/_authenticated/<feature>/index.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/<feature>/")({
  component: <Feature>Page,
});

function <Feature>Page() {
  return <div>...</div>;
}
```

### `RouterAppContext`

Contexto global tipado disponível em todas as rotas via `useRouteContext()`:

```typescript
interface RouterAppContext {
  auth: authClient.$Infer.Session | null;
  queryClient: QueryClient;
  trpc: typeof trpc;
}
```

## Autenticação

### Client (`lib/auth-client.ts`)

```typescript
export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/api/auth`,
  plugins: [usernameClient()],
});

export const { useSession } = authClient;
```

### Fluxo de Auth

```
Inicialização:
  authClient.useSession() → session | null
  ↓
  index.tsx: session ? /dashboard : /login

Login:
  authClient.signIn.username({ username, password })
  → Sucesso: navigate("/")
  → Erro: toast com mensagem

Logout:
  authClient.signOut() → limpa sessão → navigate("/login")

Rotas protegidas:
  _authenticated.tsx → beforeLoad → !session → redirect("/login")
```

## tRPC Client (`lib/trpc.ts`)

```typescript
// Client de baixo nível (mutations diretas)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url, transformer: superjson, credentials: "include" })],
});

// Proxy integrado com React Query (queries via hooks)
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
```

`credentials: "include"` é obrigatório para enviar cookies de sessão nas requisições.

## Padrões de Data Fetching

### Query Hook (listagem)

```typescript
// src/hooks/<feature>/use-<feature>.query.ts
import type { List<Feature>Input } from "@workspace/types/schemas/<feature>.schema";

export const use<Feature>Query = (params: List<Feature>Input) => {
  return useQuery(trpc.<feature>.list.queryOptions(params));
};
```

### Mutation Hook (criação/edição)

```typescript
// src/hooks/<feature>/use-<feature>-create-mutation.ts
export const use<Feature>CreateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Create<Feature>Input) =>
      trpcClient.<feature>.create.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.<feature>.list.queryKey() });
      toast.success("Criado com sucesso!");
    },
    onError: (error) => toast.error(error.message),
  });
};
```

## Componentes Reutilizáveis

### Form Factory (`components/form-factory/`)

Sistema tipado para criação de formulários com validação Zod integrada:

```typescript
const <feature>FormFactory = createFormFactory({
  schema: create<Feature>Schema,      // Schema Zod de @workspace/types
  defaultValues: { name: "", ... },
});

function My<Feature>Form() {
  const form = <feature>FormFactory.useForm({
    onSubmit: async (values) => { await mutate(values); },
  });

  return (
    <form.Form>
      <form.Field name="name" label="Nome" />
      <form.Field name="status" label="Status" type="select" options={[...]} />
      <form.Submit>Salvar</form.Submit>
    </form.Form>
  );
}
```

**Tipos de campo suportados:** `text`, `email`, `password`, `number`, `textarea`, `select`, `checkbox`

### DataTable (`components/data-table/`)

Tabela com paginação, ordenação e busca — estado sincronizado via URL (nuqs):

```typescript
// Hook que gerencia estado via URL params
const { table, isFetching } = useDataTable({
  columns,
  query: use<Feature>Query,
  pageCount: data?.pageCount ?? 0,
});

// Componente composável
<DataTable>
  <DataTable.Toolbar table={table} actions={[<CreateButton />]} />
  <DataTable.Content table={table} />
  <DataTable.Pagination table={table} />
</DataTable>
```

**URL params gerenciados:** `page`, `limit`, `sort`, `search` — preservados no histórico do browser.

### Componentes UI (`components/ui/`)

Primitivos do shadcn/ui. Não modifique — use as props e variantes existentes ou adicione novos componentes via CLI do shadcn.

```bash
# Adicionar novo componente shadcn
npx shadcn@latest add <component-name>
```

## Build e Dev

```bash
# Desenvolvimento
pnpm dev          # Vite dev server em :5173

# Build
pnpm build        # tsc + vite build → dist/
```

### Vite Config

```typescript
// vite.config.ts
{
  plugins: [tailwindcss(), tanstackRouter(), react()],
  resolve: { alias: { "@": "./src" } },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:<SERVER_PORT>" }
  }
}
```

O proxy redireciona `/api/*` para o servidor, evitando CORS em desenvolvimento.

## Variáveis de Ambiente

Prefixo obrigatório `VITE_`. Definidas em `packages/env/src/web.ts`.

```env
VITE_SERVER_URL=http://localhost:4444
```

## Adicionando uma Nova Feature

Checklist completa para adicionar um novo domínio ao web:

1. **Hooks de data fetching** em `src/hooks/<feature>/`
   - `use-<feature>.query.ts`
   - `use-<feature>-create-mutation.ts`

2. **Componentes de feature** em `src/components/features/<feature>/`
   - Form component com `createFormFactory`
   - Sheet/Modal de criação
   - Células customizadas para a DataTable (se necessário)

3. **Página de listagem** em `src/routes/_authenticated/<feature>/index.tsx`
   - Use `useDataTable` + `DataTable`
   - Inclua botão de ação para abrir o form de criação

4. **Link de navegação** em `src/components/app-sidebar.tsx`

## Regras

- **Nunca** faça fetch direto com `fetch()` — use sempre tRPC client
- **Nunca** gerencie estado global de auth manualmente — use `authClient.useSession()`
- **Nunca** edite `routeTree.gen.ts` — é auto-gerado pelo plugin Vite
- **Sempre** invalide a query correspondente após uma mutation bem-sucedida
- Componentes de feature ficam em `components/features/<feature>/` — não misture com `ui/`
- Hooks de data fetching ficam em `hooks/<feature>/` — não coloque lógica de fetch em componentes
