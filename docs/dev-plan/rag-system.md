# Dev Plan: Sistema RAG Interno (Omnia Chat)

**PRD:** `docs/prd-rag-system.md`
**Data:** 2026-03-03
**Stack:** Fastify 5 · tRPC 11 · Drizzle ORM · React 19 · TanStack Router · BullMQ · pgvector · OpenAI

---

## Visão Geral das Sprints

| Sprint | Foco | Dependências |
|--------|------|-------------|
| 1 | Fundação: DB + Env + pgvector | — |
| 2 | `packages/rag` — Core RAG (parsers, chunker, embedder, retrieval, generation) | Sprint 1 |
| 3 | Backend: Pipeline de ingestão + gerenciamento de documentos | Sprint 2 |
| 4 | Backend: Chat RAG + SSE streaming + Text-to-SQL | Sprint 2, 3 |
| 5 | Frontend: Gerenciamento de documentos (`/documents`) | Sprint 3 |
| 6 | Frontend: Chat (`/chat`) | Sprint 4, 5 |

---

## Sprint 1 — Fundação: DB, Env, pgvector

> Objetivo: Todo o scaffolding de banco e configuração de ambiente para suportar os sprints seguintes.

### T1.1 — Habilitar extensão pgvector no PostgreSQL

**Arquivo:** `packages/db/src/migrations/` (migration SQL manual)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

> Verificar se o provider PostgreSQL já tem pgvector disponível. Caso não, adicionar à configuração Docker/infra.

---

### T1.2 — Drizzle Schema: `documents` + `document_versions`

**Arquivo:** `packages/db/src/schema/documents.ts`

```typescript
import { pgTable, text, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { baseColumnsWithUserId } from "./base-columns";

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "active",
  "error",
]);

export const documents = pgTable("documents", {
  ...baseColumnsWithUserId(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
});

export const documentVersions = pgTable("document_versions", {
  ...baseColumnsWithUserId(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  status: documentStatusEnum("status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(false),
  errorMessage: text("error_message"),
});
```

> `baseColumnsWithUserId()` = `{ id, createdAt, updatedAt, userId }` seguindo padrão existente.

---

### T1.3 — Drizzle Schema: `document_chunks` + `document_embeddings`

**Arquivo:** `packages/db/src/schema/embeddings.ts`

```typescript
import { pgTable, text, integer, jsonb, index } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { baseColumns } from "./base-columns";
import { documentVersions } from "./documents";

// pgvector custom type
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value) {
      return `[${value.join(",")}]`;
    },
    fromDriver(value) {
      return value
        .slice(1, -1)
        .split(",")
        .map(Number);
    },
  })(name);

export const documentChunks = pgTable("document_chunks", {
  ...baseColumns(),
  documentVersionId: integer("document_version_id")
    .notNull()
    .references(() => documentVersions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
});

export const documentEmbeddings = pgTable(
  "document_embeddings",
  {
    ...baseColumns(),
    chunkId: integer("chunk_id")
      .notNull()
      .references(() => documentChunks.id, { onDelete: "cascade" }),
    embedding: vector("embedding", 1536).notNull(),
  },
  (t) => [
    index("document_embeddings_hnsw_idx")
      .on(t.embedding)
      .using("hnsw")
      .with({ m: 16, ef_construction: 64 }),
  ]
);
```

> Index HNSW com parâmetros conservadores para MVP. Ajustar `m` e `ef_construction` conforme volume crescer.

---

### T1.4 — Drizzle Schema: `schema_embeddings`

**Arquivo:** `packages/db/src/schema/schema-embeddings.ts`

```typescript
import { pgTable, text, jsonb, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./base-columns";
import { vector } from "./embeddings"; // reexportar o customType

export const schemaEmbeddings = pgTable(
  "schema_embeddings",
  {
    ...baseColumns(),
    tableName: text("table_name").notNull(),
    columnInfo: jsonb("column_info").notNull(),
    description: text("description").notNull(),
    embedding: vector("embedding", 1536).notNull(),
  },
  (t) => [
    index("schema_embeddings_hnsw_idx")
      .on(t.embedding)
      .using("hnsw")
      .with({ m: 16, ef_construction: 64 }),
  ]
);
```

---

### T1.5 — Drizzle Schema: `conversations` + `conversation_messages`

**Arquivo:** `packages/db/src/schema/conversations.ts`

```typescript
import { pgTable, text, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { baseColumns, baseColumnsWithUserId } from "./base-columns";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const conversations = pgTable("conversations", {
  ...baseColumnsWithUserId(),
  title: text("title"),
});

export const conversationMessages = pgTable("conversation_messages", {
  ...baseColumns(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").notNull().default([]),
});
```

> `sources`: array de `{ documentName, versionId, chunkIndex, excerpt }` serializado como JSONB.

---

### T1.6 — Atualizar barrel do `packages/db/src/schema/index.ts`

Exportar os novos schemas no barrel existente (usar imports relativos `./`).

---

### T1.7 — Env vars: adicionar `OPENAI_API_KEY` e `RAG_UPLOAD_DIR`

**Arquivo:** `packages/env/src/server.ts`

```typescript
OPENAI_API_KEY: z.string().min(1),
RAG_UPLOAD_DIR: z.string().default("/tmp/omnia-uploads"),
RAG_MAX_FILE_SIZE_MB: z.coerce.number().default(50),
```

---

### T1.8 — Migration Drizzle

Gerar e aplicar a migration com `drizzle-kit generate` + `drizzle-kit migrate`.

**Checklist Sprint 1:**
- [ ] pgvector habilitado no banco
- [ ] 6 novas tabelas criadas e migradas
- [ ] Env vars validadas e documentadas
- [ ] Index HNSW criado em `document_embeddings` e `schema_embeddings`

---

## Sprint 2 — `packages/rag`: Core RAG

> Objetivo: Package isolado e testável com toda a lógica RAG: parse, chunk, embed, retrieve, build prompt, gerar SQL.

### Estrutura do package

```
packages/rag/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Barrel
    ├── ingestion/
    │   ├── parsers/
    │   │   ├── pdf.parser.ts       # pdf-parse
    │   │   ├── docx.parser.ts      # mammoth
    │   │   └── txt.parser.ts       # fs.readFile
    │   ├── chunker.ts              # Fixed-size + overlap
    │   └── embedder.ts             # OpenAI embeddings
    ├── retrieval/
    │   ├── vector-store.ts         # pgvector queries
    │   └── retriever.ts            # Top-k + metadata
    └── generation/
        ├── prompt-builder.ts       # Monta prompt final
        └── sql-generator.ts        # Text-to-SQL + validator
```

---

### T2.1 — `package.json` do `packages/rag`

```json
{
  "name": "@omnia/rag",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "openai": "^4.x",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.8.0",
    "@omnia/db": "*",
    "@omnia/env": "*"
  }
}
```

---

### T2.2 — Parsers de documento

**`src/ingestion/parsers/pdf.parser.ts`**
```typescript
import pdfParse from "pdf-parse";

export const parsePdf = async (buffer: Buffer): Promise<string> => {
  const result = await pdfParse(buffer);
  return result.text;
};
```

**`src/ingestion/parsers/docx.parser.ts`**
```typescript
import mammoth from "mammoth";

export const parseDocx = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};
```

**`src/ingestion/parsers/txt.parser.ts`**
```typescript
export const parseTxt = (buffer: Buffer): string => buffer.toString("utf-8");
```

**`src/ingestion/parsers/index.ts`** — dispatcher por mimeType:
```typescript
export const parseDocument = async (
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  switch (mimeType) {
    case "application/pdf": return parsePdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);
    case "text/plain": return parseTxt(buffer);
    default: throw new Error(`Unsupported mime type: ${mimeType}`);
  }
};
```

---

### T2.3 — Chunker com overlap

**`src/ingestion/chunker.ts`**

```typescript
const CHUNK_SIZE = 512;    // tokens aproximados (chars / 4)
const CHUNK_OVERLAP = 50;

type Chunk = { content: string; chunkIndex: number };

export const chunkText = (text: string): Chunk[] => {
  const chunkSizeChars = CHUNK_SIZE * 4;
  const overlapChars = CHUNK_OVERLAP * 4;
  const chunks: Chunk[] = [];

  let start = 0;
  let index = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSizeChars, text.length);
    chunks.push({ content: text.slice(start, end), chunkIndex: index++ });
    start += chunkSizeChars - overlapChars;
  }
  return chunks;
};
```

> Aproximação de tokens via chars/4. Para precisão, usar `tiktoken` na Fase 2.

---

### T2.4 — Embedder (OpenAI)

**`src/ingestion/embedder.ts`**

```typescript
import OpenAI from "openai";
import { env } from "@omnia/env/server";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = "text-embedding-3-small";

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const response = await openai.embeddings.create({
    model: MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
};

export const embedText = async (text: string): Promise<number[]> => {
  const [embedding] = await embedTexts([text]);
  if (!embedding) throw new Error("No embedding returned");
  return embedding;
};
```

> Batch de até 100 textos por chamada (limite OpenAI). Para documentos grandes, chunkar em batches no job.

---

### T2.5 — Vector Store (pgvector queries)

**`src/retrieval/vector-store.ts`**

```typescript
import { db } from "@omnia/db";
import { documentEmbeddings, documentChunks, schemaEmbeddings } from "@omnia/db/schema";
import { sql } from "drizzle-orm";

export type RetrievedChunk = {
  chunkId: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  documentVersionId: number;
};

export const searchDocumentChunks = async (
  queryEmbedding: number[],
  topK = 5
): Promise<RetrievedChunk[]> => {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db
    .select({
      chunkId: documentChunks.id,
      content: documentChunks.content,
      metadata: documentChunks.metadata,
      documentVersionId: documentChunks.documentVersionId,
      similarity: sql<number>`1 - (${documentEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)})`,
    })
    .from(documentEmbeddings)
    .innerJoin(documentChunks, sql`${documentEmbeddings.chunkId} = ${documentChunks.id}`)
    .orderBy(sql`${documentEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`)
    .limit(topK);

  return rows as RetrievedChunk[];
};

export const searchSchemaEmbeddings = async (
  queryEmbedding: number[],
  topK = 3
): Promise<{ tableName: string; columnInfo: unknown; similarity: number }[]> => {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  return db
    .select({
      tableName: schemaEmbeddings.tableName,
      columnInfo: schemaEmbeddings.columnInfo,
      similarity: sql<number>`1 - (${schemaEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)})`,
    })
    .from(schemaEmbeddings)
    .orderBy(sql`${schemaEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`)
    .limit(topK) as Promise<{ tableName: string; columnInfo: unknown; similarity: number }[]>;
};
```

---

### T2.6 — Retriever (top-k + enriquecimento de metadados)

**`src/retrieval/retriever.ts`**

Wrapper que chama `searchDocumentChunks`, enriquece com nome do documento via JOIN e filtra por `similarity > 0.3` (threshold configurável).

---

### T2.7 — Prompt Builder

**`src/generation/prompt-builder.ts`**

```typescript
type Message = { role: "user" | "assistant"; content: string };
type Source = { documentName: string; excerpt: string };

type BuildPromptInput = {
  question: string;
  retrievedChunks: { content: string; documentName: string }[];
  conversationHistory: Message[];
  schemaContext?: string;
};

type BuiltPrompt = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  sources: Source[];
};

const SYSTEM_PROMPT = `Você é um assistente interno da empresa. Responda apenas com base
nas informações fornecidas no contexto. Se a informação não estiver no contexto,
diga que não encontrou a informação. Cite sempre a fonte do documento ao responder.
Quando usar dados do banco de dados, indique claramente que é uma consulta ao banco.`;

export const buildPrompt = (input: BuildPromptInput): BuiltPrompt => {
  const { question, retrievedChunks, conversationHistory, schemaContext } = input;

  const contextBlock = retrievedChunks
    .map((c, i) => `[Fonte ${i + 1} — ${c.documentName}]\n${c.content}`)
    .join("\n\n---\n\n");

  const userContent = [
    "### Contexto dos Documentos:",
    contextBlock,
    schemaContext ? `\n### Dados do Banco de Dados:\n${schemaContext}` : "",
    `\n### Pergunta:\n${question}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user", content: userContent },
    ],
    sources: retrievedChunks.map((c) => ({
      documentName: c.documentName,
      excerpt: c.content.slice(0, 200),
    })),
  };
};
```

---

### T2.8 — SQL Generator + Validator

**`src/generation/sql-generator.ts`**

```typescript
import OpenAI from "openai";
import { env } from "@omnia/env/server";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SQL_SYSTEM_PROMPT = `Você é um gerador de SQL. Com base no schema fornecido,
gere APENAS uma query SELECT válida para PostgreSQL.
NUNCA gere INSERT, UPDATE, DELETE, DROP, CREATE, ALTER ou qualquer operação de escrita.
Retorne APENAS o SQL, sem explicações, sem markdown, sem código fenced.`;

export const generateSql = async (
  question: string,
  schemaContext: string
): Promise<string> => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SQL_SYSTEM_PROMPT },
      { role: "user", content: `Schema:\n${schemaContext}\n\nPergunta: ${question}` },
    ],
    temperature: 0,
    max_tokens: 500,
  });

  const sql = response.choices[0]?.message?.content?.trim() ?? "";
  return validateSelectOnly(sql);
};

const FORBIDDEN_PATTERNS = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i;

const validateSelectOnly = (sql: string): string => {
  if (FORBIDDEN_PATTERNS.test(sql)) {
    throw new Error(`SQL gerado contém operação não permitida: ${sql}`);
  }
  if (!sql.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error(`SQL gerado não é um SELECT: ${sql}`);
  }
  return sql;
};
```

> Dupla validação: instrução no system prompt + regex whitelist no output.

---

### Checklist Sprint 2:
- [ ] `packages/rag` criado com `package.json` e `tsconfig.json` corretos
- [ ] Parsers funcionando para PDF, DOCX e TXT
- [ ] Chunker produz chunks com overlap correto
- [ ] Embedder faz chamada em batch à OpenAI
- [ ] Vector store executa cosine similarity via pgvector
- [ ] Prompt builder monta prompt com histórico e contexto
- [ ] SQL generator valida contra operações de escrita
- [ ] Adicionado `@omnia/rag` ao `turbo.json` tasks

---

## Sprint 3 — Backend: Pipeline de Ingestão + Gerenciamento de Documentos

> Objetivo: APIs para upload, versionamento e pipeline assíncrono de ingestão via BullMQ.

### T3.1 — Instalar e configurar BullMQ

**`apps/server/src/plugins/bullmq.plugin.ts`**

```typescript
import { Queue, Worker } from "bullmq";
import { env } from "@omnia/env/server";

// Redis connection reutilizando o já configurado em packages/auth
const connection = { host: env.REDIS_HOST, port: env.REDIS_PORT };

export const documentIngestionQueue = new Queue("document-ingestion", { connection });
```

> Redis já existe via `packages/auth`. Reutilizar a mesma connection string.

---

### T3.2 — Repository: `DocumentRepository` (interface em `packages/core`)

**`packages/core/src/repositories/document.repository.ts`**

Interface com:
- `create(input, userId)` → `Document`
- `createVersion(input)` → `DocumentVersion`
- `getActiveVersion(documentId)` → `DocumentVersion | null`
- `deactivateVersions(documentId)` → `void`
- `updateVersionStatus(versionId, status, errorMessage?)` → `void`
- `listDocuments(params)` → `{ data: DocumentWithVersion[]; total: number }`
- `getVersionHistory(documentId)` → `DocumentVersion[]`
- `softDeleteDocument(documentId)` → `void`

---

### T3.3 — Repository: `DrizzleDocumentRepository` (implementação em `packages/db`)

**`packages/db/src/repositories/document.repository.ts`**

Implementa interface acima com Drizzle. Pontos-chave:
- `createVersion`: insere em `document_versions` com `version = MAX(version) + 1`
- `deactivateVersions`: `UPDATE SET is_active = false WHERE document_id = ?`
- `softDeleteDocument`: exclusão lógica (adicionar campo `deleted_at` ao schema `documents`)

---

### T3.4 — Job Worker: `document-ingestion.worker.ts`

**`apps/server/src/jobs/document-ingestion.worker.ts`**

```typescript
type IngestionJobData = {
  documentVersionId: number;
  filePath: string;
  mimeType: string;
  documentId: number;
};

// Worker steps:
// 1. Atualizar status → "processing"
// 2. Ler arquivo do disco (fs.readFile)
// 3. parseDocument(buffer, mimeType)
// 4. chunkText(parsedText) → Chunk[]
// 5. embedTexts(chunks.map(c => c.content)) → embeddings em batches de 50
// 6. Inserir document_chunks + document_embeddings em transação
// 7. deactivateVersions(documentId) + marcar versão atual como is_active = true
// 8. updateVersionStatus(versionId, "active")
// Em caso de erro: updateVersionStatus(versionId, "error", error.message)
```

---

### T3.5 — Service: `DocumentService` (em `packages/core`)

**`packages/core/src/services/document.service.ts`**

Métodos:
- `upload(file, userId)` → salva arquivo em disco → cria `Document` + `DocumentVersion` → enqueue job → retorna `DocumentVersion`
- `createNewVersion(documentId, file, userId)` → idem, mas incrementa versão
- `list(params)` → delega ao repository
- `getVersionHistory(documentId)` → delega ao repository
- `remove(documentId)` → soft delete

> O serviço **não** processa o arquivo diretamente — apenas enfileira o job e retorna imediatamente.

---

### T3.6 — tRPC Router: `documentsRouter`

**`packages/api/src/routers/documents.ts`**

```typescript
// Procedures:
// upload: protectedProcedure + multipart handling (via Fastify, não tRPC diretamente)
// listDocuments: protectedProcedure → paginação
// getVersionHistory: protectedProcedure
// removeDocument: protectedProcedure

// NOTA: Upload multipart não funciona nativamente via tRPC.
// Alternativa: rota HTTP REST em Fastify para upload, tRPC para leitura.
```

**`apps/server/src/routes/documents.upload.ts`** (rota Fastify REST para upload):

```typescript
// POST /api/documents/upload (multipart/form-data)
// POST /api/documents/:id/version (nova versão)
// Autentica via Better-Auth (mesmo middleware das demais rotas)
// Valida: tipo de arquivo (allowlist), tamanho (≤ MAX_FILE_SIZE_MB)
// Enfileira job via documentIngestionQueue
```

---

### T3.7 — Schema reindex endpoint

**`apps/server/src/routes/rag.admin.ts`**

```
POST /api/rag/schema/reindex
```

- Lê todas as tabelas do banco via `information_schema`
- Gera descrição textual de cada tabela + colunas
- Embeda via `embedTexts()`
- Faz upsert em `schema_embeddings` (delete all + insert)

---

### T3.8 — Atualizar `services-factory.ts`

Adicionar `documentService` ao objeto retornado:

```typescript
const documentRepository = new DrizzleDocumentRepository(db);
return {
  ...existingServices,
  documentService: new DocumentService(documentRepository, documentIngestionQueue),
};
```

---

### Checklist Sprint 3:
- [ ] BullMQ conectado ao Redis existente
- [ ] Worker processa PDF, DOCX e TXT corretamente
- [ ] Versionamento: nova versão desativa chunks da anterior
- [ ] Rota REST de upload com validação de tipo e tamanho
- [ ] Job falho atualiza status para "error" com mensagem
- [ ] Endpoint de reindex do schema funcional
- [ ] `documentService` injetado via factory

---

## Sprint 4 — Backend: Chat RAG + SSE + Text-to-SQL

> Objetivo: Engine de chat completo — query embedding, retrieval, geração com streaming SSE e persistência do histórico.

### T4.1 — Repository: `ConversationRepository` (interface em `packages/core`)

Métodos:
- `createConversation(userId)` → `Conversation`
- `updateTitle(conversationId, title)` → `void`
- `listByUser(userId)` → `Conversation[]`
- `getMessages(conversationId)` → `ConversationMessage[]`
- `addMessage(conversationId, role, content, sources)` → `ConversationMessage`
- `getConversation(conversationId, userId)` → `Conversation | null`

---

### T4.2 — Repository: `DrizzleConversationRepository` (em `packages/db`)

Implementação direta. `listByUser` ordena por `updatedAt DESC`. `getConversation` inclui validação de `userId` para evitar acesso cross-user.

---

### T4.3 — Service: `ChatService` (em `packages/core`)

**`packages/core/src/services/chat.service.ts`**

```typescript
// Depende de: ConversationRepository, OpenAI client (via RAG package)
// Métodos:

// createConversation(userId): Promise<Conversation>
//   → conversationRepository.createConversation(userId)

// listConversations(userId): Promise<Conversation[]>

// getMessages(conversationId, userId): Promise<ConversationMessage[]>
//   → valida ownership via getConversation

// streamAnswer(input: StreamAnswerInput): AsyncGenerator<StreamEvent>
//   Fluxo:
//   1. embedText(question)
//   2. searchDocumentChunks(embedding, topK=5)
//   3. classificar se é pergunta de BD (heurística: tabelas no schema_embeddings com alta similarity)
//      → Se sim: searchSchemaEmbeddings → generateSql → executar SQL (com timeout 5s) → sqlResult
//   4. buildPrompt({ question, chunks, history: últimas 10 msgs, schemaContext: sqlResult })
//   5. openai.chat.completions.create({ stream: true, model: "gpt-4o", messages })
//   6. Yield tokens SSE à medida que chegam
//   7. Ao finalizar: addMessage(conversationId, "user", question, [])
//                    addMessage(conversationId, "assistant", fullResponse, sources)
//   8. Se conversa tem 2 mensagens e sem título: generateTitle() (fire-and-forget)

// generateTitle(conversationId): Promise<void>
//   → LLM call com: "Gere um título de 5 palavras para esta conversa: [primeiras msgs]"
//   → updateTitle(conversationId, title)
```

---

### T4.4 — Rota SSE: `GET /api/chat/stream`

**`apps/server/src/routes/chat.stream.ts`**

```typescript
// Headers: Content-Type: text/event-stream, Cache-Control: no-cache
// Query params: conversationId (obrigatório), question (obrigatório)
// Auth: Better-Auth middleware (session obrigatória)
//
// SSE event format:
//   data: {"type":"token","content":"..."}
//   data: {"type":"sources","sources":[...]}
//   data: {"type":"done","conversationId":123}
//   data: {"type":"error","message":"..."}
//
// Timeout: 30s para primeira resposta
// On client disconnect: abort OpenAI stream
```

> Usar `reply.raw` do Fastify para controle direto dos headers SSE. Não usar tRPC para SSE.

---

### T4.5 — tRPC Router: `chatRouter`

**`packages/api/src/routers/chat.ts`**

```typescript
// Procedures (não-streaming — tudo via tRPC normal):
// createConversation: protectedProcedure → mutation
// listConversations: protectedProcedure → query
// getMessages: protectedProcedure.input(z.object({ conversationId: z.number() })) → query

// A procedure de streaming usa a rota SSE separada (T4.4)
```

---

### T4.6 — SQL execution com timeout e sanitização

**`apps/server/src/services/sql-executor.ts`**

```typescript
// Executa SQL gerado pelo LLM com:
// - Timeout de 5 segundos (SET LOCAL statement_timeout = '5s')
// - Limite de 100 rows no resultado
// - Re-validação do SQL antes de executar (validateSelectOnly)
// - Retorna resultado formatado como string tabular para o LLM
```

---

### T4.7 — Atualizar `services-factory.ts`

```typescript
const conversationRepository = new DrizzleConversationRepository(db);
return {
  ...existingServices,
  documentService: ...,
  chatService: new ChatService(conversationRepository, db),
};
```

---

### Checklist Sprint 4:
- [ ] SSE stream entrega tokens progressivamente
- [ ] Histórico limitado a 10 mensagens no contexto (evita context overflow)
- [ ] Text-to-SQL só executa SELECT com timeout 5s
- [ ] Título gerado assincronamente (não bloqueia resposta)
- [ ] Disconnect do cliente aborta stream OpenAI
- [ ] Sources serializadas e salvas no banco

---

## Sprint 5 — Frontend: Gerenciamento de Documentos (`/documents`)

> Objetivo: Interface para upload, listagem com versões e exclusão.

### T5.1 — Rota TanStack Router: `/documents`

**`apps/web/src/routes/documents/index.tsx`**

---

### T5.2 — Componente: tabela de documentos

Colunas: Nome, Tipo (badge), Versão Atual, Status (badge colorido), Data de Upload, Ações.

Status badges:
- `pending` → cinza
- `processing` → amarelo + spinner
- `active` → verde
- `error` → vermelho + tooltip com mensagem

---

### T5.3 — Componente: upload dialog

- `<Dialog>` com `<Input type="file">` (accept: .pdf, .doc, .docx, .txt)
- Validação client-side: tipo e tamanho (≤ 50MB)
- `fetch` POST para `/api/documents/upload` (multipart)
- Progress indicator
- Após upload: invalida query de listagem (TanStack Query)

---

### T5.4 — Componente: version history drawer

- `<Sheet>` lateral ao clicar em um documento
- Lista versões: número, status, data, criado por
- Botão "Restaurar versão" (Fase 2)

---

### T5.5 — Polling de status

Para documentos em `processing`, fazer polling a cada 5s na query de listagem (via `refetchInterval` do TanStack Query) até status mudar para `active` ou `error`.

---

### T5.6 — Hook: `useDocuments`

```typescript
// useDocuments(): { documents, isLoading, uploadDocument, removeDocument }
// Encapsula tRPC queries + REST upload em uma interface coesa
```

---

### Checklist Sprint 5:
- [ ] Upload dispara processamento e exibe status em tempo real (polling)
- [ ] Erro de processamento exibe mensagem legível
- [ ] Versões listadas corretamente no drawer
- [ ] Exclusão soft com confirmação dialog
- [ ] Validação client-side de tipo e tamanho antes do upload

---

## Sprint 6 — Frontend: Chat (`/chat`)

> Objetivo: Interface de chat com streaming, sidebar de histórico e multi-turn.

### T6.1 — Rota TanStack Router: `/chat` e `/chat/$conversationId`

**`apps/web/src/routes/chat/index.tsx`** — nova conversa
**`apps/web/src/routes/chat/$conversationId.tsx`** — conversa existente

---

### T6.2 — Layout do chat

```
┌─────────────────────────────────────────────┐
│ Sidebar (260px)     │  Área principal        │
│                     │                        │
│ [+ Nova conversa]   │  [Mensagens]           │
│                     │                        │
│ Histórico:          │  [Bolhas user/AI]      │
│ - Conv 1            │  [Sources accordion]   │
│ - Conv 2            │  [Sources accordion]   │
│ - ...               │                        │
│                     │  ┌──────────────────┐  │
│                     │  │ Input + Enviar   │  │
│                     │  └──────────────────┘  │
└─────────────────────────────────────────────┘
```

---

### T6.3 — Hook: `useChat`

**`apps/web/src/hooks/use-chat.ts`**

```typescript
// Estado: messages[], isStreaming, currentConversationId
//
// sendMessage(question):
//   1. Adiciona mensagem "user" otimisticamente
//   2. Abre EventSource: GET /api/chat/stream?conversationId=X&question=...
//   3. Acumula tokens em estado local (streaming)
//   4. On "sources" event: salva sources na última mensagem
//   5. On "done" event: finaliza estado, fecha EventSource
//   6. On "error" event: exibe erro (Sonner toast)
//   7. Invalida query de conversações (atualiza título na sidebar)
//
// SSE via browser native EventSource API
```

---

### T6.4 — Componente: mensagem com sources

- Bolha de mensagem: user (direita, azul) / assistant (esquerda, cinza)
- Streaming: cursor piscando enquanto tokens chegam
- Accordion de sources abaixo da resposta do assistente
- Sources: nome do documento + trecho (excerpt truncado)
- Markdown rendering básico na resposta do assistente (via `react-markdown`)

---

### T6.5 — Componente: sidebar de conversações

- Lista de conversas com título gerado (ou "Nova conversa" enquanto sem título)
- Conversa ativa destacada
- Botão "Nova conversa" cria via tRPC + navega para `/chat/$id`
- Scroll infinito ou paginação simples (últimas 20 conversas)

---

### T6.6 — Estado de loading e erros

- Skeleton na sidebar enquanto carrega histórico
- Indicador "Consultando documentos..." antes do primeiro token (delay > 1s)
- Tratamento de erro SSE com mensagem amigável + botão "Tentar novamente"
- Sonner toasts para erros não-críticos

---

### Checklist Sprint 6:
- [ ] Streaming entrega tokens progressivamente (sem delay visível)
- [ ] Sources aparecem ao final de cada resposta assistente
- [ ] Multi-turn funciona (pergunta sobre resposta anterior)
- [ ] Sidebar lista conversas anteriores com título gerado
- [ ] Nova conversa cria corretamente e navega
- [ ] Loading states em todos os estados assíncronos
- [ ] Erro de SSE exibido de forma amigável

---

## Dependências de Pacotes a Instalar

### `packages/rag`
```
openai@^4
pdf-parse@^1.1.1
mammoth@^1.8.0
```

### `apps/server`
```
bullmq@^5
@fastify/multipart@^9
```

### `apps/web`
```
react-markdown@^9
```

---

## Checklist Final de QA

### Segurança
- [ ] SQL validator bloqueia operações de escrita antes de executar
- [ ] Upload valida MIME type no servidor (não apenas extensão)
- [ ] Tamanho de arquivo validado no servidor (além do client)
- [ ] SSE requer autenticação (session verificada antes de abrir stream)
- [ ] Conversas isoladas por usuário (getConversation valida userId)

### Performance
- [ ] Index HNSW criado no pgvector
- [ ] Embeddings em batch (não uma chamada por chunk)
- [ ] Context window limitado (sistema + histórico + chunks ≤ 16k tokens)
- [ ] SQL com timeout 5s e limite de 100 rows

### Observabilidade
- [ ] Status do job refletido em tempo real via polling
- [ ] Erros de parsing/embedding salvos em `error_message` no banco
- [ ] Logs estruturados nos workers (job start/complete/failed)
