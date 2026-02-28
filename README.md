# Pixlyzer - Organizador Inteligente de Comprovantes PIX

SaaS B2C + API pública para extração automática de dados de comprovantes PIX usando OCR.

## Funcionalidades

- **Upload de Comprovantes**: Arraste e solte ou selecione arquivos JPEG/PNG
- **OCR Inteligente**: Extração automática de dados usando Tesseract.js
- **Parser PIX**: Detecta valor, data, banco, nome e ID da transação
- **Dashboard**: Visualize e organize todos seus comprovantes
- **API Pública**: Integre com suas aplicações usando API Key
- **Planos**: FREE (10 OCR/mês) e PRO (500 OCR/mês)
- **Pagamentos**: Integração com Paguebit para upgrade automático

## Stack Tecnológico

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Tailwind CSS**
- **Tesseract.js** (OCR)
- **Zod** (Validação)
- **Bcrypt** (Hash de senhas)
- **Jest** (Testes)

## Módulo OCR Avançado

O sistema possui um módulo OCR profissional com:

### Arquitetura Modular

```
/lib
  /ocr
    ocrService.ts          # Processamento Tesseract.js
    normalizeText.ts       # Normalização de texto OCR
  /parser
    parserOrchestrator.ts  # Orquestração do parsing
    bankDetector.ts        # Detecção de banco
    confidenceService.ts   # Cálculo de confidence score
    /banks
      index.ts             # Registro de parsers
      bancoTemplate.ts     # Template para novos bancos
      nubank.ts            # Parser Nubank
      itau.ts              # Parser Itaú
      bradesco.ts          # Parser Bradesco
  /ai
    aiFallbackService.ts   # Fallback com múltiplas IAs
    aiSimpleService.ts     # Heurísticas locais (sem API)
    /providers
      baseProvider.ts      # Classe base para providers
      groqProvider.ts      # Provider Groq
      openrouterProvider.ts # Provider OpenRouter
      huggingfaceProvider.ts # Provider HuggingFace
```

### Fluxo de Processamento

1. **Upload** → Validação de segurança (5MB max, JPEG/PNG)
2. **OCR** → Tesseract.js extrai texto
3. **Normalização** → Limpa e padroniza texto
4. **Detecção de Banco** → Identifica o banco
5. **Parser Específico** → Extrai dados do banco
6. **Confidence Score** → Calcula confiança (0-1)
7. **Fallback IA** → Se confidence < 0.8, usa IA
8. **Retorno** → JSON estruturado

### Confidence Score

| Campo | Peso |
|-------|------|
| valor | 0.3 |
| data | 0.3 |
| txId | 0.2 |
| pagador | 0.1 |
| recebedor | 0.1 |

**Threshold**: 0.8 (80% de confiança)

### Fallback de IA

Ordem de tentativa:
1. **AI Simple** (heurísticas locais, sem API)
2. **Groq** (Llama 3, gratuito)
3. **OpenRouter** (múltiplos modelos)
4. **HuggingFace** (open-source)

### Adicionar Novo Banco

1. Crie arquivo em `/lib/parser/banks/{nome}.ts`
2. Implemente `BankParser` interface
3. Adicione ao array em `/lib/parser/banks/index.ts`

```typescript
export const meuBancoParser: BankParser = {
  bankName: 'MEU_BANCO',
  detect(text) { /* ... */ },
  parse(text) { /* ... */ },
};
```

### Testes

```bash
# Executar todos os testes
npm test

# Executar com watch
npm run test:watch

# Cobertura
npm run test:coverage
```

## Estrutura do Projeto

```
/app
  /(public)          # Rotas públicas
    /login
    /register
    /pricing
    /docs
  /(private)         # Rotas protegidas
    /dashboard
    /settings
  /api               # API Routes
    /auth
    /v1
      /ocr
      /apikey
      /usage
      /payments
      /webhooks
/lib
  /services          # Regras de negócio
    authService.ts
    ocrService.ts
    pixParserService.ts
    apiKeyService.ts
    usageService.ts
    paguebitService.ts
    uploadService.ts
/prisma
  schema.prisma
```

## Configuração

### 1. Clone e Instale

```bash
git clone <repo>
cd pixlyzer
npm install
```

### 2. Configure as Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pixlyzer?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Paguebit API
PAGUEBIT_API_TOKEN="your-paguebit-api-token"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Environment
NODE_ENV="development"

# AI Providers (optional - system works without them)
GROQ_API_KEY="your-groq-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
HUGGINGFACE_API_KEY="your-huggingface-api-key"
```

### 3. Configure o Banco de Dados

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Execute o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## Configuração do Paguebit

1. Crie uma conta em [Paguebit](https://paguebit.com)
2. Gere uma API Token no painel
3. Adicione o token ao `.env.local`
4. Configure o webhook URL no painel do Paguebit:
   ```
   https://seudominio.com/api/v1/webhooks/paguebit
   ```

## API Pública

### Autenticação

Inclua sua API key no header:

```
x-api-key: sk_live_xxxxx
```

### Endpoint OCR

```bash
POST /api/v1/ocr
Content-Type: multipart/form-data

file: <arquivo>
```

### Resposta

```json
{
  "success": true,
  "data": {
    "banco": "NUBANK",
    "valor": 150.50,
    "data": "2024-01-15",
    "pagador": "João Silva",
    "recebedor": "Maria Silva",
    "txId": "ABC123DEF456GHI789JKL012MNO345PQ",
    "confidence": 0.95
  },
  "meta": {
    "processingTimeMs": 2450,
    "ocrConfidence": 87
  }
}
```

### Códigos de Erro

| Código | Status | Descrição |
|--------|--------|-----------|
| API_KEY_REQUIRED | 401 | Header x-api-key não fornecido |
| INVALID_KEY_FORMAT | 401 | Formato da API key inválido |
| INVALID_KEY | 401 | API key inválida ou revogada |
| LIMIT_EXCEEDED | 429 | Limite mensal de OCR excedido |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit por minuto excedido |
| FILE_REQUIRED | 400 | Nenhum arquivo enviado |
| INVALID_FILE_TYPE | 400 | Tipo de arquivo não suportado |
| INVALID_FILE_NAME | 400 | Nome de arquivo inválido |
| IMAGE_TOO_LARGE | 400 | Imagem maior que 5MB |
| EMPTY_BUFFER | 400 | Buffer vazio |
| UNKNOWN_IMAGE_TYPE | 400 | Tipo de imagem não detectado |
| OCR_LOW_CONFIDENCE | 422 | Confiança do OCR muito baixa |
| OCR_ERROR | 500 | Erro no processamento OCR |
| INTERNAL_ERROR | 500 | Erro interno do servidor |

## Planos

### FREE
- 10 OCR por mês
- Dashboard básico
- API pública

### PRO - R$ 29,90/mês
- 500 OCR por mês
- Dashboard completo
- Suporte prioritário
- Acesso ilimitado

## Deploy na Vercel

1. Push para GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy!

### Variáveis de Ambiente na Vercel

```
DATABASE_URL=<sua-url-do-postgresql>
JWT_SECRET=<segredo-jwt>
PAGUEBIT_API_TOKEN=<token-paguebit>
NEXT_PUBLIC_APP_URL=<url-do-deploy>

# Opcionais - para fallback de IA
GROQ_API_KEY=<sua-groq-key>
OPENROUTER_API_KEY=<sua-openrouter-key>
HUGGINGFACE_API_KEY=<sua-huggingface-key>
```

### Banco de Dados na Vercel

Use um serviço como:
- [Neon](https://neon.tech) (PostgreSQL serverless)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

## Arquitetura

### Services

Cada service encapsula uma regra de negócio:

#### Core Services
- **AuthService**: Autenticação e autorização
- **ApiKeyService**: Gerenciamento de API keys
- **UsageService**: Estatísticas e limites de uso
- **PaguebitService**: Integração com pagamentos
- **UploadService**: Processamento completo de uploads

#### OCR Services
- **OCRService**: Processamento de imagens com Tesseract.js
- **NormalizeText**: Normalização de texto OCR
- **ParserOrchestrator**: Orquestração do fluxo de parsing
- **BankDetector**: Detecção de banco pelo texto
- **ConfidenceService**: Cálculo de confidence score

#### AI Services
- **AIFallbackService**: Orquestra fallback entre providers
- **AISimpleService**: Heurísticas locais (sem API)
- **GroqProvider**: Provider Groq (Llama 3)
- **OpenRouterProvider**: Provider OpenRouter
- **HuggingFaceProvider**: Provider HuggingFace

### Middleware

O middleware (`middleware.ts`) protege rotas privadas e valida API keys:

- Rotas públicas: `/login`, `/register`, `/pricing`, `/docs`
- Rotas da API pública: `/api/v1/ocr`
- Rotas privadas: Requerem cookie `auth-token`

### Webhook Paguebit

O endpoint `/api/v1/webhooks/paguebit` processa:

- `payment.created`: Atualiza status
- `payment.status_changed`: Atualiza status e ativa plano PRO se aprovado

## Segurança

### Autenticação
- Senhas hasheadas com bcrypt (12 rounds)
- API keys hasheadas e únicas
- JWT com expiração de 7 dias
- Cookies httpOnly e secure

### Upload
- Limite máximo: 5MB
- Tipos permitidos: JPEG, PNG
- Validação por magic numbers (não confia em extensão)
- Nome de arquivo sanitizado
- Nunca salva arquivo em disco

### OCR
- Processamento apenas em memória
- Buffer destruído após uso
- Timeout de 30 segundos
- Validação de confiança mínima (30%)

### API
- Rate limiting por API key (10 req/min)
- Rate limiting por IP
- Sanitização de inputs com Zod
- Nenhum stack trace em produção
- Timeout de 10s para chamadas de IA

### IA
- AbortController para cancelar requisições
- Não loga textos completos em produção
- Fallback automático entre providers

## Licença

MIT

## Suporte

Para suporte, envie um email para suporte@pixlyzer.com
