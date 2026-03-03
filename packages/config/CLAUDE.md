# @workspace/config

Pacote de configuração compartilhada do monorepo. Centraliza o `tsconfig.base.json` estendido por todos os outros pacotes e apps.

## Responsabilidade

- Centralizar compiler options TypeScript comuns
- Garantir consistência de configurações em todo o monorepo

**Não contém:** código fonte, variáveis de ambiente, dependências de runtime.

## Estrutura

```
tsconfig.base.json    # Configuração TypeScript base compartilhada
```

## Compiler Options Relevantes

| Opção | Valor | Impacto |
|-------|-------|---------|
| `strict` | `true` | Habilita todas as checagens rigorosas do TypeScript |
| `noUncheckedIndexedAccess` | `true` | Acesso a array/objeto retorna `T \| undefined` — evita erros silenciosos |
| `noUnusedLocals` | `true` | Erro de compilação para variáveis locais não usadas |
| `noUnusedParameters` | `true` | Erro de compilação para parâmetros não usados |
| `verbatimModuleSyntax` | `true` | `import type` obrigatório para importações de tipos — necessário para `isolatedModules` |
| `moduleResolution` | `bundler` | Compatível com Vite, tsdown e outros bundlers modernos |
| `isolatedModules` | `true` | Cada arquivo compilável independentemente — compatível com esbuild/swc |

## Como Usar em um Novo Pacote

```json
// packages/<novo-pacote>/tsconfig.json
{
  "extends": "@workspace/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "composite": true        // Necessário para project references
  },
  "include": ["src/**/*"]
}
```

## Customizações por Pacote

Opções específicas de um único pacote ficam no `tsconfig.json` local, não aqui:

```json
// Exemplo: tsconfig.json de um app React
{
  "extends": "@workspace/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",           // Específico do React
    "lib": ["ESNext", "DOM"],     // Específico do browser
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Regras

- **Nunca** sobrescreva `strict: false` em pacotes filhos — mantém rigor em todo o monorepo
- Ao adicionar uma opção ao base, verifique o impacto em todos os pacotes antes — pode quebrar o CI inteiro
- Opções de `paths`, `jsx`, `lib` e `outDir` ficam no tsconfig local de cada pacote
