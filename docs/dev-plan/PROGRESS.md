# Progresso: Sistema RAG Interno (Omnia Chat)

**Dev Plan:** docs/dev-plan/rag-system.md
**Contexto:** docs/dev-plan/PROJECT-CONTEXT.md
**Início:** 2026-03-05
**Última atualização:** 2026-03-05

## Resumo
- Total de tasks: 30 (T1.1–T1.8, T2.1–T2.8, T3.1–T3.8, T4.1–T4.7, T5.1–T5.6, T6.1–T6.6)
- Completas: 8 (Sprint 3)
- Em andamento: 0
- Pendentes: 22

## Sprint 1 — Fundação: DB, Env, pgvector
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T1.1 | Habilitar pgvector no PostgreSQL | ⏳ | — | Feito manualmente na infra |
| T1.2 | Schema: documents + document_versions | ✅ | 716f844 | — |
| T1.3 | Schema: document_chunks + document_embeddings | ✅ | 716f844 | — |
| T1.4 | Schema: schema_embeddings | ✅ | 716f844 | — |
| T1.5 | Schema: conversations + conversation_messages | ✅ | 716f844 | — |
| T1.6 | Atualizar barrel packages/db/src/schema/index.ts | ✅ | 716f844 | — |
| T1.7 | Env vars: OPENAI_API_KEY + RAG_UPLOAD_DIR | ✅ | 716f844 | — |
| T1.8 | Migration Drizzle | ⏳ | — | Rodar manualmente: bun run db:generate && bun run db:migrate |

## Sprint 2 — packages/rag: Core RAG
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T2.1 | package.json do packages/rag | ⏳ | — | — |
| T2.2 | Parsers de documento (PDF, DOCX, TXT) | ⏳ | — | — |
| T2.3 | Chunker com overlap | ⏳ | — | — |
| T2.4 | Embedder (OpenAI) | ⏳ | — | — |
| T2.5 | Vector Store (pgvector queries) | ⏳ | — | — |
| T2.6 | Retriever (top-k + enriquecimento) | ⏳ | — | — |
| T2.7 | Prompt Builder | ⏳ | — | — |
| T2.8 | SQL Generator + Validator | ⏳ | — | — |

## Sprint 3 — Backend: Pipeline de Ingestão
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T3.1 | BullMQ plugin | ✅ | 6167d00 | bullmq + @fastify/multipart; singleton queue |
| T3.2 | DocumentRepository interface | ✅ | 6167d00 | packages/core + Zod schemas em packages/types |
| T3.3 | DrizzleDocumentRepository | ✅ | 6167d00 | inArray para listDocuments eficiente |
| T3.4 | Job Worker: document-ingestion | ✅ | 6167d00 | batch 50 embeddings; erro salvo no status |
| T3.5 | DocumentService | ✅ | 6167d00 | DocumentIngestionQueue interface (DI agnóstico) |
| T3.6 | tRPC documentsRouter + rota REST upload | ✅ | 6167d00 | tRPC list/history/remove + REST POST /upload |
| T3.7 | Schema reindex endpoint | ✅ | 6167d00 | POST /api/rag/schema/reindex com information_schema |
| T3.8 | Atualizar services-factory.ts | ✅ | 6167d00 | singleton factory; documentService injetado |

## Sprint 4 — Backend: Chat RAG + SSE
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T4.1 | ConversationRepository interface | ⏳ | — | — |
| T4.2 | DrizzleConversationRepository | ⏳ | — | — |
| T4.3 | ChatService | ⏳ | — | — |
| T4.4 | Rota SSE: GET /api/chat/stream | ⏳ | — | — |
| T4.5 | tRPC chatRouter | ⏳ | — | — |
| T4.6 | SQL executor com timeout | ⏳ | — | — |
| T4.7 | Atualizar services-factory.ts | ⏳ | — | — |

## Sprint 5 — Frontend: /documents
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T5.1 | Rota TanStack: /documents | ⏳ | — | — |
| T5.2 | Tabela de documentos | ⏳ | — | — |
| T5.3 | Upload dialog | ⏳ | — | — |
| T5.4 | Version history drawer | ⏳ | — | — |
| T5.5 | Polling de status | ⏳ | — | — |
| T5.6 | Hook: useDocuments | ⏳ | — | — |

## Sprint 6 — Frontend: /chat
| ID | Task | Status | Commit | Notas |
|----|------|--------|--------|-------|
| T6.1 | Rota TanStack: /chat + /chat/$conversationId | ⏳ | — | — |
| T6.2 | Layout do chat | ⏳ | — | — |
| T6.3 | Hook: useChat | ⏳ | — | — |
| T6.4 | Componente: mensagem com sources | ⏳ | — | — |
| T6.5 | Componente: sidebar de conversações | ⏳ | — | — |
| T6.6 | Estado de loading e erros | ⏳ | — | — |

## Desvios do Plano
| Task | Desvio | Motivo | Impacto |
|------|--------|--------|---------|
| — | — | — | — |
