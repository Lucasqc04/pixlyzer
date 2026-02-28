# Documentação Técnica - Módulo OCR

## Visão Geral

O módulo OCR do Pixlyzer é um sistema avançado de extração de dados de comprovantes PIX, projetado com arquitetura modular, extensível e segura.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoint                            │
│                   POST /api/v1/ocr                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Security Validation                         │
│  • API Key validation  • File size (5MB)  • MIME type       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   OCR Service (Tesseract)                    │
│  • Image processing  • Text extraction  • Confidence score   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Text Normalization                          │
│  • Remove extra spaces  • Fix O/0 confusion  • Standardize   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 Parser Orchestrator                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Bank Detector│──│Specific      │──│ Confidence   │      │
│  │              │  │Parser        │  │ Score        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Confidence >= 0.8?                  │      │
│  └──────────────────────────────────────────────────┘      │
│         │                           │                        │
│    Sim ▼│                      Não ▼│                        │
│  ┌──────────────┐           ┌──────────────┐                │
│  │   Return     │           │ AI Fallback  │                │
│  │   Result     │           │   Service    │                │
│  └──────────────┘           └──────────────┘                │
│                                      │                       │
│                              ┌───────┴───────┐              │
│                              ▼               ▼               │
│                        ┌──────────┐  ┌──────────────┐       │
│                        │ AI Simple│  │   Groq       │       │
│                        │ (local)  │  │   Provider   │       │
│                        └──────────┘  └──────────────┘       │
│                                              │              │
│                                       ┌──────┴──────┐       │
│                                       ▼             ▼       │
│                              ┌──────────┐  ┌──────────────┐ │
│                              │OpenRouter│  │HuggingFace   │ │
│                              │ Provider │  │   Provider   │ │
│                              └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. OCR Service (`lib/ocr/ocrService.ts`)

Responsável pelo processamento de imagens usando Tesseract.js.

**Características:**
- Processamento em memória (nunca salva em disco)
- Validação por magic numbers (não confia em extensão)
- Limite de 5MB por imagem
- Timeout de 30 segundos
- Suporte a JPEG e PNG

**API:**
```typescript
processImage(buffer: Buffer, options?: OCROptions): Promise<OCRResult>
isValidImage(buffer: Buffer): boolean
getImageInfo(buffer: Buffer): ImageInfo
processMultipleImages(buffers: Buffer[]): Promise<OCRResult[]>
```

### 2. Text Normalization (`lib/ocr/normalizeText.ts`)

Normaliza texto extraído por OCR para melhorar precisão dos parsers.

**Transformações:**
- Normaliza quebras de linha (\r\n, \r → \n)
- Remove espaços múltiplos
- Corrige O por 0 em contextos numéricos
- Corrige l por 1 em contextos numéricos
- Padroniza separador decimal (vírgula → ponto)
- Remove caracteres de controle
- Remove caracteres Unicode inválidos

**API:**
```typescript
normalizeText(text: string): string
extractLines(text: string): string[]
findLinesWithKeyword(lines: string[], keyword: string): string[]
extractAfterLabel(text: string, label: string): string | null
```

### 3. Bank Detector (`lib/parser/bankDetector.ts`)

Detecta o banco do comprovante baseado em palavras-chave.

**Bancos Suportados:**
- Nubank
- Itaú
- Bradesco
- Santander
- Banco do Brasil
- Caixa Econômica
- Banco Inter
- C6 Bank
- Banco Original
- PicPay
- Mercado Pago
- PagBank

**API:**
```typescript
detectBank(text: string): string
detectBankWithConfidence(text: string): BankDetectionResult
detectMultipleBanks(text: string): string[]
getBankDisplayName(bankKey: string): string
```

### 4. Confidence Service (`lib/parser/confidenceService.ts`)

Calcula score de confiança baseado nos campos extraídos.

**Pesos:**
| Campo | Peso | Descrição |
|-------|------|-----------|
| valor | 0.3 | Campo crítico, fácil validar |
| data | 0.3 | Campo crítico, formato padronizado |
| txId | 0.2 | Campo importante, formato específico |
| pagador | 0.1 | Campo secundário |
| recebedor | 0.1 | Campo secundário |

**Threshold:** 0.8 (80%)

**Validações:**
- Valor: > 0 e < 1.000.000
- Data: formato ISO, não futura, não antes de 2020
- TX ID: 20-35 caracteres alfanuméricos
- Nome: 2-100 caracteres, contém pelo menos uma letra

**API:**
```typescript
calculateConfidence(parsed: ParsedPix): number
isConfidenceAcceptable(confidence: number): boolean
getConfidenceMessage(confidence: number): string
getMissingFields(parsed: ParsedPix): string[]
```

### 5. Bank Parsers (`lib/parser/banks/`)

Parsers específicos para cada banco.

**Interface:**
```typescript
interface BankParser {
  bankName: string
  detect(text: string): boolean
  parse(text: string): ParsedPix
}
```

**Parsers Implementados:**
- `nubank.ts` - Parser Nubank
- `itau.ts` - Parser Itaú
- `bradesco.ts` - Parser Bradesco

**Template:** `bancoTemplate.ts` - Modelo para novos bancos

### 6. Parser Orchestrator (`lib/parser/parserOrchestrator.ts`)

Orquestra todo o fluxo de parsing.

**Fluxo:**
1. Detecta banco
2. Usa parser específico (se disponível)
3. Calcula confidence
4. Se confidence < 0.8, executa fallback IA
5. Retorna melhor resultado

**Opções:**
```typescript
interface ParseOptions {
  forceAI?: boolean        // Força uso de IA
  localOnly?: boolean      // Apenas heurísticas locais
  specificBank?: string    // Força banco específico
}
```

**API:**
```typescript
orchestrateParse(text: string, options?: ParseOptions): Promise<ParsedPix>
parseWithBankDetectionOnly(text: string): ParsedPix
getParserStats(): ParserStats
```

### 7. AI Simple Service (`lib/ai/aiSimpleService.ts`)

Heurísticas locais para extração de dados (sem APIs externas).

**Estratégias:**
- Regex genéricas para valor
- Múltiplos formatos de data
- Detecção de TX ID
- Extração de nomes
- Detecção de banco

**API:**
```typescript
extractWithSimpleAI(text: string): ParsedPix
```

### 8. AI Fallback Service (`lib/ai/aiFallbackService.ts`)

Orquestra fallback entre múltiplos providers de IA.

**Ordem de Tentativa:**
1. AI Simple (local, rápido)
2. Groq (Llama 3, gratuito)
3. OpenRouter (múltiplos modelos)
4. HuggingFace (open-source)

**API:**
```typescript
extractWithAIFallback(text: string): Promise<ParsedPix>
extractWithSpecificProvider(text: string, provider: string): Promise<ParsedPix>
extractWithLocalAIOnly(text: string): ParsedPix
extractWithExternalAIOnly(text: string): Promise<ParsedPix>
getAvailableProviders(): string[]
```

### 9. AI Providers (`lib/ai/providers/`)

Providers de IA para extração de dados.

**Base:** `baseProvider.ts`
- Classe abstrata com funcionalidades comuns
- Criação de prompts
- Parse seguro de JSON
- Timeout com AbortController

**Providers:**
- `groqProvider.ts` - Groq API (Llama 3)
- `openrouterProvider.ts` - OpenRouter API
- `huggingfaceProvider.ts` - HuggingFace API

## Tipos de Dados

### ParsedPix
```typescript
interface ParsedPix {
  banco: string           // Nome do banco
  valor?: number          // Valor em reais
  data?: string           // Data ISO (YYYY-MM-DD)
  pagador?: string        // Quem pagou
  recebedor?: string      // Quem recebeu
  txId?: string           // ID da transação
  rawText: string         // Texto bruto (limitado)
  confidence: number      // Score 0-1
}
```

### OCRResult
```typescript
interface OCRResult {
  text: string            // Texto normalizado
  confidence: number      // Confiança OCR (0-100)
}
```

### OCRError
```typescript
class OCRError extends Error {
  code: string           // Código do erro
  statusCode: number     // HTTP status code
}
```

## Segurança

### Upload
- Limite: 5MB
- Tipos: JPEG, PNG
- Validação por magic numbers
- Sanitização de nome de arquivo
- Nunca salva em disco

### OCR
- Processamento em memória
- Buffer destruído após uso
- Timeout: 30s
- Confiança mínima: 30%

### API
- Rate limit: 10 req/min por API key
- Rate limit por IP
- Sanitização com Zod
- Sem stack trace em produção

### IA
- Timeout: 10s por provider
- AbortController para cancelamento
- Não loga textos completos

## Extensibilidade

### Adicionar Novo Banco

1. Criar arquivo em `lib/parser/banks/{nome}.ts`
2. Implementar interface `BankParser`
3. Adicionar ao array em `lib/parser/banks/index.ts`

**Exemplo:**
```typescript
// lib/parser/banks/sicredi.ts
export const sicrediParser: BankParser = {
  bankName: 'SICREDI',
  detect(text) { /* ... */ },
  parse(text) { /* ... */ },
};

// lib/parser/banks/index.ts
export const bankParsers: BankParser[] = [
  // ... existentes
  sicrediParser,
];
```

### Adicionar Novo Provider de IA

1. Criar arquivo em `lib/ai/providers/{nome}Provider.ts`
2. Estender `BaseAIProvider`
3. Implementar método `extract()`
4. Adicionar ao `aiFallbackService.ts`

**Exemplo:**
```typescript
// lib/ai/providers/meuProvider.ts
export class MeuProvider extends BaseAIProvider {
  name = 'MeuProvider';
  
  async extract(text: string): Promise<ParsedPix> {
    // Implementar chamada à API
  }
}

// lib/ai/aiFallbackService.ts
const PROVIDER_ORDER = [
  // ... existentes
  MeuProvider,
];
```

## Testes

### Executar Testes
```bash
npm test              # Todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Com cobertura
```

### Testes Implementados
- `confidenceService.test.ts` - Testes de confidence score
- `bankDetector.test.ts` - Testes de detecção de banco
- `aiSimpleService.test.ts` - Testes de heurísticas locais

## Variáveis de Ambiente

```env
# Obrigatórias
DATABASE_URL="postgresql://..."
JWT_SECRET="..."

# Opcionais (para fallback de IA)
GROQ_API_KEY="..."
OPENROUTER_API_KEY="..."
HUGGINGFACE_API_KEY="..."
```

O sistema funciona sem as variáveis de IA, usando apenas heurísticas locais.

## Performance

### Benchmarks Típicos

| Operação | Tempo Médio |
|----------|-------------|
| OCR (imagem 1MB) | 1-3s |
| Normalização | < 10ms |
| Detecção de banco | < 5ms |
| Parser específico | < 50ms |
| AI Simple | < 100ms |
| Groq API | 2-5s |
| OpenRouter API | 2-5s |
| HuggingFace API | 5-10s |

### Otimizações
- Parsers específicos são mais rápidos que IA
- AI Simple é mais rápido que APIs externas
- Processamento em paralelo para múltiplas imagens
- Timeout em todas as chamadas de IA

## Troubleshooting

### OCR com baixa confiança
- Verificar qualidade da imagem
- Garantir que texto está legível
- Usar imagem com maior resolução

### Banco não detectado
- Verificar se banco está na lista de suportados
- Texto pode estar muito distorcido
- Usar `forceAI: true` para tentar extração genérica

### APIs de IA falhando
- Verificar se API keys estão configuradas
- Verificar limites de rate da API
- Sistema fallback usará heurísticas locais

### Timeout
- Imagem muito grande (> 5MB)
- Rede lenta para APIs externas
- Aumentar timeout nas opções

## Referências

- [Tesseract.js Docs](https://github.com/naptha/tesseract.js)
- [Groq API Docs](https://console.groq.com/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [HuggingFace Inference API](https://huggingface.co/docs/api-inference)
