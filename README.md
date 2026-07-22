<div align="center">

# Pixlyzer

**SaaS e API para extrair, organizar e consultar dados de comprovantes Pix com OCR e fallback por IA.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Jest](https://img.shields.io/badge/tests-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)

</div>

## Sobre o projeto

O **Pixlyzer** transforma imagens de comprovantes Pix em dados estruturados. O sistema combina OCR, normalização de texto, parsers específicos por banco, cálculo de confiança e fallback por múltiplos provedores de IA.

Além da aplicação web, o projeto oferece uma **API pública autenticada por API key**, controle de uso por plano, rate limiting, dashboard e integração de pagamentos.

## Funcionalidades

- upload de comprovantes em JPEG e PNG;
- extração automática de valor, data, banco, participantes e identificador da transação;
- detecção do banco emissor;
- parsers especializados por instituição;
- confidence score por campo e por documento;
- fallback por heurísticas locais e provedores de IA;
- dashboard para organização e consulta de comprovantes;
- API pública com autenticação por chave;
- planos de uso e controle de limite mensal;
- webhooks para ativação automática de planos;
- exportação de dados e relatórios.

## Fluxo de processamento

```mermaid
flowchart LR
    A[Upload] --> B[Validação do arquivo]
    B --> C[OCR]
    C --> D[Normalização]
    D --> E[Detecção do banco]
    E --> F[Parser específico]
    F --> G[Confidence score]
    G -->|confiança suficiente| H[JSON estruturado]
    G -->|baixa confiança| I[Fallback por IA]
    I --> H
```

O pipeline foi projetado para priorizar processamento determinístico e usar IA apenas quando a confiança da extração tradicional não é suficiente.

## Arquitetura

```text
app/
├── (public)/              login, cadastro, preços e documentação
├── (private)/             dashboard e configurações
└── api/v1/                OCR, API keys, uso, pagamentos e webhooks

lib/
├── ocr/                   processamento e normalização
├── parser/                orquestração e parsers por banco
├── ai/                    fallback e provedores de IA
└── services/              autenticação, uso, upload e pagamentos

prisma/
└── schema.prisma          modelo relacional da aplicação
```

### Parsers extensíveis

Cada instituição pode possuir um parser isolado, implementando uma interface comum. Isso permite adicionar suporte a novos layouts sem acoplar regras específicas ao pipeline principal.

```typescript
export const meuBancoParser: BankParser = {
  bankName: 'MEU_BANCO',
  detect(text) {
    // identifica o comprovante
  },
  parse(text) {
    // retorna os campos estruturados
  },
};
```

## API pública

### Autenticação

Envie sua chave no cabeçalho:

```http
x-api-key: sk_live_xxxxx
```

### Processar comprovante

```http
POST /api/v1/ocr
Content-Type: multipart/form-data
```

Campo esperado:

```text
file: comprovante.png
```

Exemplo de resposta:

```json
{
  "success": true,
  "data": {
    "banco": "NUBANK",
    "valor": 150.5,
    "data": "2026-01-15",
    "pagador": "João Silva",
    "recebedor": "Maria Silva",
    "txId": "ABC123DEF456",
    "confidence": 0.95
  },
  "meta": {
    "processingTimeMs": 2450,
    "ocrConfidence": 87
  }
}
```

## Segurança

- senhas protegidas com bcrypt;
- API keys armazenadas de forma segura;
- autenticação com JWT e cookies `httpOnly`;
- validação de payloads com Zod;
- limite de tamanho e validação real do tipo de arquivo;
- sanitização de nomes e entradas;
- processamento de imagens em memória;
- rate limiting por chave e por IP;
- timeouts para OCR e integrações externas;
- respostas de produção sem stack trace;
- redução de dados sensíveis em logs.

## Stack

- **Frontend e servidor:** Next.js 14, React e TypeScript;
- **Banco de dados:** PostgreSQL e Prisma ORM;
- **UI:** Tailwind CSS e componentes Radix;
- **OCR:** Tesseract e node-tesseract-ocr;
- **Validação e segurança:** Zod, bcrypt e JWT/Jose;
- **Testes:** Jest e ts-jest;
- **Relatórios:** jsPDF, XLSX e JSZip;
- **Gráficos:** Recharts.

## Executando localmente

### Requisitos

- Node.js 18 ou superior;
- PostgreSQL;
- npm.

```bash
git clone https://github.com/Lucasqc04/pixlyzer.git
cd pixlyzer
npm install
cp .env.example .env.local
```

Configure as variáveis de ambiente:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pixlyzer"
JWT_SECRET="substitua-por-um-segredo-forte"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Integração de pagamentos
PAGUEBIT_API_TOKEN=""

# Fallbacks opcionais de IA
GROQ_API_KEY=""
OPENROUTER_API_KEY=""
HUGGINGFACE_API_KEY=""
```

Prepare o banco e inicie a aplicação:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

Acesse `http://localhost:3000`.

## Testes e qualidade

```bash
npm test
npm run test:coverage
npm run build
```

## Scripts principais

| Comando | Descrição |
|---|---|
| `npm run dev` | inicia o ambiente de desenvolvimento |
| `npm run build` | gera o Prisma Client e o build de produção |
| `npm test` | executa os testes |
| `npm run test:coverage` | gera relatório de cobertura |
| `npm run db:migrate` | executa migrations locais |
| `npm run db:studio` | abre o Prisma Studio |

## Autor

Desenvolvido por **[Lucas Quinteiro Campos](https://github.com/Lucasqc04)**.

[LinkedIn](https://www.linkedin.com/in/lucas-quinteiro-2071022a4/) · [Outros projetos](https://github.com/Lucasqc04)
