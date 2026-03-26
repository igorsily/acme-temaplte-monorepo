# PRD: Sistema RAG Interno (Omnia Chat)

**Status:** Em Revisão
**Autor:** Igor Sily
**Data:** 2026-03-03
**Versão:** 0.2

---

## 1. Resumo Executivo

Sistema de chat interno com IA que permite aos funcionários consultar documentos corporativos e dados estruturados do banco de dados via linguagem natural. Integrado ao monorepo Omnia, utilizando OpenAI para embeddings e geração de respostas, e pgvector para busca semântica.

---

## 2. Problema

### 2.1 Contexto

Informações corporativas estão distribuídas em documentos (PDF, DOCX, TXT) e no banco de dados. Localizar informação relevante exige saber onde procurar e como formular queries — barreira alta para a maioria dos funcionários.

### 2.2 Dor do Usuário

- Funcionários perdem tempo procurando informação em documentos dispersos
- Não-técnicos não conseguem consultar dados do BD sem depender de devs
- Respostas inconsistentes por falta de fonte única de verdade

### 2.3 Impacto da Inação

Perda de produtividade contínua, dependência de intermediários para consultas simples, e conhecimento institucional inacessível para quem mais precisa.

---

## 3. Solução Proposta

### 3.1 Visão Geral

Chat interno com RAG (Retrieval-Augmented Generation) que:
1. Ingere e versiona documentos corporativos
2. Embeda schema do BD para geração de SQL via linguagem natural
3. Responde perguntas com base em contexto recuperado semanticamente
4. Mantém histórico de conversa por sessão com memória multi-turn

### 3.2 Objetivos e Métricas de Sucesso

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Respostas precisas baseadas nos documentos | Avaliação manual de amostra | ≥ 80% de respostas corretas |
| Adoção pelos funcionários | Usuários ativos por semana | ≥ 50% dos funcionários em 30 dias |
| Latência de resposta | Tempo até primeira resposta | < 5s p95 |
| Pipeline de ingestão | Tempo para documento estar disponível após upload | < 2 min |

### 3.3 Não-Objetivos (Out of Scope — MVP)

- Controle de acesso (RBAC ou qualquer tipo) — decisão intencional; qualquer usuário autenticado acessa tudo
- Execução de código pelo LLM (Code Interpreter) — Fase 2
- Suporte a outros LLMs além de OpenAI
- Ingestão de fontes web/externas
- Avaliação automatizada de qualidade de respostas (evals)
- Notificações de novos documentos
- Busca facetada/filtrada na interface de gerenciamento

---

## 4. Requisitos Funcionais

### 4.1 User Stories

**Funcionário (usuário do chat):**
- Como funcionário, quero fazer perguntas em linguagem natural sobre documentos internos, para obter respostas sem precisar ler o documento inteiro.
- Como funcionário, quero continuar uma conversa fazendo perguntas de follow-up, para refinar meu entendimento progressivamente.
- Como funcionário, quero ver o histórico das minhas conversas anteriores, para retomar contextos sem repetir perguntas.

**Qualquer usuário autenticado (chat + gerenciamento de documentos):**
- Como usuário, quero fazer upload de documentos (PDF, DOCX, TXT), para disponibilizá-los no sistema de busca.
- Como usuário, quero reenviar um documento atualizado como nova versão, para manter o histórico de mudanças sem perder a versão anterior.
- Como usuário, quero visualizar todos os documentos cadastrados com suas versões, para saber o que está disponível no sistema.
- Como usuário, quero remover um documento do índice, para que ele não apareça mais nas respostas.

### 4.2 Requisitos Detalhados

| ID | Requisito | Prioridade | Notas |
|----|-----------|------------|-------|
| RF-001 | Upload de documentos (PDF, DOCX, TXT) via interface web | Must | Validação de tipo e tamanho |
| RF-002 | Versionamento de documentos (v1, v2...) com histórico | Must | Mesma "identidade" de documento, múltiplas versões |
| RF-003 | Pipeline de ingestão: parse → chunk → embed → store no pgvector | Must | Processamento assíncrono via job queue |
| RF-004 | Apenas a versão mais recente de cada documento é usada na busca | Must | Versões antigas ficam no histórico, fora do índice ativo |
| RF-005 | Embedding do schema do BD (tabelas, colunas, tipos, relações) | Must | Estático, atualizado manualmente quando schema muda |
| RF-006 | Geração de SQL via linguagem natural com execução e interpretação | Must | LLM gera SQL → sistema executa → LLM interpreta resultado |
| RF-007 | Interface de chat com suporte a multi-turn (contexto da sessão) | Must | Histórico da sessão injetado como contexto no prompt |
| RF-008 | Persistência do histórico de conversas no banco de dados | Must | Por usuário, com timestamp e mensagens |
| RF-009 | Listagem de conversas anteriores com possibilidade de retomada | Must | Sidebar ou página de histórico |
| RF-010 | Citação de fonte na resposta (qual documento/trecho foi usado) | Should | Aumenta confiança na resposta |
| RF-011 | Indicador de "processando" durante geração da resposta (streaming) | Should | Streaming via SSE (Server-Sent Events) |
| RF-012 | Listagem de documentos com versões na interface de gerenciamento | Must | Nome, tipo, versão atual, data de upload |
| RF-013 | Exclusão lógica de documento (remove do índice, mantém no storage) | Should | Auditoria |
| RF-014 | Acesso ao sistema (chat + gerenciamento) requer apenas autenticação ativa | Must | Sem roles, sem permissões — qualquer usuário com conta pode fazer tudo |
| RF-015 | Título de conversa gerado automaticamente pelo LLM após 2ª mensagem | Should | Prompt separado; não bloqueia o chat |

### 4.3 Fluxos Principais

#### Fluxo 1: Ingestão de Documento
```
Upload (web) → Validação (tipo/tamanho) → Storage (arquivo bruto)
→ Job assíncrono: Parse (extração de texto) → Chunking → Embedding (OpenAI)
→ Upsert no pgvector → Versão marcada como ativa → Notificação de conclusão
```

#### Fluxo 2: Chat com RAG
```
Usuário digita pergunta → Embed da pergunta (OpenAI)
→ Busca vetorial no pgvector (top-k chunks relevantes)
→ Verificar se pergunta é sobre dados do BD (classificação)
  → Se sim: gerar SQL → executar → incluir resultado no contexto
→ Montar prompt: [system] + [histórico da sessão] + [chunks recuperados] + [pergunta]
→ LLM (GPT-4o) gera resposta → Streaming para o frontend
→ Salvar mensagem + resposta no histórico
```

#### Fluxo 3: Versionamento de Documento
```
Admin faz upload de arquivo com mesmo nome/identidade
→ Sistema cria nova versão (incrementa version number)
→ Remove chunks da versão anterior do índice ativo
→ Processa nova versão (Fluxo 1)
→ Versão anterior permanece no storage e no BD (histórico)
```

---

## 5. Requisitos Não-Funcionais

| Categoria | Requisito | Meta |
|-----------|-----------|------|
| Latência | Tempo até primeira resposta (streaming) | < 3s p95 |
| Latência | Busca vetorial (pgvector) | < 500ms |
| Latência | Pipeline de ingestão completo | < 2 min por documento |
| Throughput | Usuários simultâneos no chat | ≥ 50 concurrent |
| Storage | Limite por arquivo | 50MB (configurável) |
| Custo | Controle de tokens por request | Max context: 16k tokens |
| Disponibilidade | Uptime | 99% (horário comercial) |

---

## 6. Design e UX

### Páginas necessárias

**`/chat`** — Interface principal de chat
- Sidebar: lista de conversas anteriores (título gerado automaticamente)
- Área principal: conversa atual com streaming de respostas
- Input fixo no rodapé com botão de enviar

**`/documents`** — Gerenciamento de documentos (qualquer usuário autenticado)
- Tabela: nome, tipo, versão atual, status (processando/ativo/erro), data
- Ação: upload de novo documento ou nova versão
- Drawer/modal: histórico de versões de um documento
- Badge de status do processamento

---

## 7. Considerações Técnicas

### 7.1 Arquitetura

**Novos packages/módulos no monorepo Omnia:**

```
packages/
  rag/                    # Core do RAG (novo package)
    src/
      ingestion/          # Pipeline de ingestão
        chunker.ts        # Estratégia de chunking
        embedder.ts       # Wrapper OpenAI embeddings
        parsers/          # pdf-parse, mammoth, etc.
      retrieval/          # Busca vetorial
        vector-store.ts   # Interface pgvector
        retriever.ts      # Top-k retrieval + reranking
      generation/         # Geração de resposta
        prompt-builder.ts # Montagem do prompt
        sql-generator.ts  # Text-to-SQL

apps/
  server/
    src/
      jobs/               # Bull/BullMQ para processamento assíncrono
        document-ingestion.job.ts
      plugins/
        rag.plugin.ts     # Registra os jobs e serviços RAG

packages/
  db/
    src/
      schema/
        documents.ts      # Tabelas de documentos e versões
        conversations.ts  # Histórico de chat
        embeddings.ts     # Chunks e vetores (pgvector)
```

**Novas tabelas no banco:**

```sql
-- Documentos e versionamento
documents (id, name, type, created_by, created_at)
document_versions (id, document_id, version, file_path, status, is_active, created_at)

-- Chunks e embeddings
document_chunks (id, document_version_id, content, chunk_index, metadata)
document_embeddings (id, chunk_id, embedding vector(1536))  -- pgvector

-- Schema do BD para text-to-SQL
schema_embeddings (id, table_name, column_info, description, embedding vector(1536))

-- Histórico de chat
conversations (id, user_id, title, created_at, updated_at)
conversation_messages (id, conversation_id, role, content, sources, created_at)
```

### 7.2 Stack Técnica

| Componente | Tecnologia |
|-----------|------------|
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| LLM | OpenAI GPT-4o |
| Vector Store | pgvector (extensão PostgreSQL existente) |
| Job Queue | BullMQ + Redis (Redis já existe no projeto) |
| PDF parsing | pdf-parse |
| DOCX parsing | mammoth |
| File storage | Local disk (MVP) → S3-compatible (Fase 2) |
| Streaming | SSE (Server-Sent Events) via Fastify |
| Chunking | Fixed-size com overlap (512 tokens, overlap 50) |

### 7.3 Estratégia de Chunking

- **Chunk size:** 512 tokens com 50 tokens de overlap
- **Metadados por chunk:** document_id, version, page/section, chunk_index
- **Recuperação:** top-5 chunks por similaridade (cosine distance)
- **Context window:** prompt = system (500 tokens) + histórico (2k tokens) + chunks (4k tokens) + pergunta (500 tokens) ≈ 7k tokens

### 7.4 Estratégia Text-to-SQL

1. Embeda a pergunta do usuário
2. Busca schema_embeddings para identificar tabelas relevantes
3. Injeta DDL das tabelas relevantes no prompt
4. LLM gera SQL (SELECT only — write operations bloqueadas)
5. Sistema executa no BD e retorna resultado
6. LLM interpreta o resultado em linguagem natural

**Segurança:** Apenas SELECT permitido. Parser valida antes de executar.

### 7.5 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Custo elevado de embeddings/tokens OpenAI | Média | Médio | Cache de embeddings, limitar tamanho de arquivo, monitorar tokens/dia |
| Qualidade ruim em documentos escaneados (PDFs imagem) | Alta | Alto | OCR na Fase 2 (Tesseract/AWS Textract); documentar limitação no MVP |
| SQL gerado incorreto ou não-performático | Média | Alto | Só SELECT; timeout de 5s; usuário pode reportar resposta incorreta |
| Latência alta com muitos documentos no pgvector | Baixa (MVP) | Alto | Index HNSW no pgvector; monitorar p95 |
| Contexto longo degradando qualidade da resposta | Média | Médio | Limite explícito de tokens no contexto; reranking para selecionar chunks mais relevantes |

---

## 8. Plano de Rollout

### Fase 1 — MVP (atual PRD)
- [ ] Infraestrutura: pgvector habilitado, tabelas criadas, BullMQ configurado
- [ ] Pipeline de ingestão: upload → parse → chunk → embed → pgvector
- [ ] Versionamento de documentos
- [ ] Embedding do schema do BD
- [ ] Chat com RAG (documentos + SQL) + histórico
- [ ] Interface web: chat e gerenciamento de documentos

### Fase 2 — Pós-MVP
- Code Interpreter (execução de código em sandbox)
- OCR para PDFs escaneados
- Storage S3-compatible para arquivos
- Avaliação automatizada de qualidade (evals com Ragas ou LangSmith)
- Controle de acesso por categoria de documento (opcional)
- Suporte a mais formatos (Excel, Markdown, HTML)

### 8.1 Rollback Plan
- Pipeline de ingestão é assíncrono e isolado — falha não afeta o chat
- Versão anterior do documento permanece no BD; pode ser reativada manualmente
- Feature pode ser desabilitada via env var sem deploy

---

## 9. Critérios de Aceite

- [ ] Upload de PDF, DOCX e TXT processa com sucesso e fica disponível no chat em < 2 min
- [ ] Reenvio do mesmo documento cria nova versão e desativa a anterior no índice
- [ ] Pergunta sobre conteúdo de documento retorna resposta com citação da fonte
- [ ] Pergunta sobre dados do BD gera SQL válido, executa e retorna resposta interpretada
- [ ] Chat mantém contexto da conversa (pergunta sobre resposta anterior funciona)
- [ ] Histórico de conversas é persistido e recuperável
- [ ] Interface lista documentos com versões e status de processamento
- [ ] Sistema rejeita SQLs que não sejam SELECT
- [ ] Streaming funciona (resposta aparece progressivamente, não de uma vez)

---

## 10. Questões em Aberto

| # | Questão | Responsável | Decisão |
|---|---------|-------------|---------|
| 1 | Quem tem acesso à interface de gerenciamento de documentos? | Igor | **Qualquer usuário autenticado — sem controle de acesso** |
| 2 | O título da conversa é gerado automaticamente ou pelo usuário? | Igor | **Automático — gerado pelo LLM com base nas primeiras mensagens** |
| 3 | Qual o tamanho máximo de arquivo aceitável? | Igor | **50MB (configurável via env var)** |
| 4 | O schema embedado é atualizado automaticamente ou via trigger manual? | Igor | **Trigger manual via rota admin (`POST /api/rag/schema/reindex`)** |
| 5 | SSE ou WebSocket para streaming? | Igor | **SSE (Server-Sent Events) — WebSocket será removido do projeto** |

---

## 11. Referências

- Arquitetura atual do Omnia: `MEMORY.md` (monorepo Turborepo + Fastify + tRPC + pgvector)
- WebSocket **removido** neste PRD — substituído por SSE
- Redis disponível: `packages/auth` (ioredis) — usado pelo BullMQ
- pgvector: extensão já prevista no stack existente
