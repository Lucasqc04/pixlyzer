import { ParsedPix, AIProvider } from '@/types/pix';

/**
 * Classe base abstrata para providers de IA
 * 
 * Fornece funcionalidades comuns como:
 * - Validação de respostas
 * - Parsing de JSON
 * - Tratamento de erros
 * 
 * Todos os providers devem estender esta classe
 */

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  protected apiKey: string;
  protected timeout: number;

  constructor(apiKey: string, timeout: number = 10000) {
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  /**
   * Método abstrato que cada provider deve implementar
   * Faz a chamada à API e retorna os dados extraídos
   */
  abstract extract(text: string): Promise<ParsedPix>;

  /**
   * Cria o prompt padrão para extração de dados PIX
   * @param text - Texto do OCR
   * @returns Prompt formatado
   */
  protected createPrompt(text: string): string {
    return `Extraia os seguintes campos do texto de um comprovante PIX abaixo e retorne APENAS um JSON válido:

Campos a extrair:
- banco: nome do banco (string)
- valor: valor da transação em reais (número, ex: 150.50)
- data: data da transação no formato YYYY-MM-DD (string)
- pagador: nome de quem pagou (string)
- recebedor: nome de quem recebeu (string)
- txId: identificador da transação PIX (string, geralmente 20-35 caracteres alfanuméricos)

Regras:
1. Retorne APENAS o JSON, sem explicações adicionais
2. Use null para campos não encontrados
3. O valor deve ser um número (remova R$ e pontos de milhar)
4. A data deve estar no formato YYYY-MM-DD
5. O txId deve estar em maiúsculas

Texto do comprovante:
---
${text.substring(0, 3000)}
---

Responda apenas com JSON válido no formato:
{
  "banco": "...",
  "valor": 150.50,
  "data": "2024-01-15",
  "pagador": "...",
  "recebedor": "...",
  "txId": "..."
}`;
  }

  /**
   * Faz parse seguro do JSON retornado pela IA
   * @param jsonString - String JSON (pode conter markdown ou texto extra)
   * @returns Objeto parseado ou null
   */
  protected safeJsonParse(jsonString: string): Record<string, any> | null {
    try {
      // Remover markdown code blocks se presente
      // Regex: ```json ... ``` ou ``` ... ```
      let cleaned = jsonString.replace(/```json\s*/g, '');
      cleaned = cleaned.replace(/```\s*/g, '');
      
      // Remover texto antes do primeiro {
      const startIndex = cleaned.indexOf('{');
      if (startIndex === -1) return null;
      
      // Remover texto depois do último }
      const endIndex = cleaned.lastIndexOf('}');
      if (endIndex === -1) return null;
      
      cleaned = cleaned.substring(startIndex, endIndex + 1);
      
      // Parse JSON
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn(`[${this.name}] Failed to parse JSON:`, error);
      return null;
    }
  }

  /**
   * Converte resposta da IA para formato ParsedPix
   * @param data - Dados retornados pela IA
   * @param rawText - Texto original do OCR
   * @returns Dados no formato padrão
   */
  protected convertToParsedPix(data: Record<string, any>, rawText: string): ParsedPix {
    // Extrair valor (pode vir como string ou número)
    let valor: number | undefined;
    if (data.valor !== null && data.valor !== undefined) {
      const parsed = typeof data.valor === 'string' 
        ? parseFloat(data.valor.replace(/[R$\s.]/g, '').replace(',', '.'))
        : data.valor;
      if (!isNaN(parsed) && parsed > 0) {
        valor = parsed;
      }
    }

    // Extrair data (deve estar em formato ISO)
    let dataStr: string | undefined;
    if (data.data && typeof data.data === 'string') {
      // Tentar converter vários formatos
      const isoMatch = data.data.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        dataStr = data.data;
      } else {
        // Tentar converter de DD/MM/YYYY
        const brMatch = data.data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (brMatch) {
          dataStr = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
        }
      }
    }

    // Extrair TX ID (deve ser maiúsculo)
    const txId = data.txId 
      ? String(data.txId).toUpperCase() 
      : undefined;

    // Extrair nomes
    const pagador = data.pagador 
      ? String(data.pagador).trim() 
      : undefined;
    
    const recebedor = data.recebedor 
      ? String(data.recebedor).trim() 
      : data.destinatario 
        ? String(data.destinatario).trim()
        : undefined;

    // Extrair banco
    const banco = data.banco 
      ? String(data.banco).trim().toUpperCase() 
      : 'DESCONHECIDO';

    return {
      banco,
      valor,
      data: dataStr,
      pagador,
      recebedor,
      txId,
      rawText: rawText.substring(0, 1000),
      confidence: 0, // Será calculado depois
    };
  }

  /**
   * Cria um AbortController com timeout
   * @returns AbortController configurado
   */
  protected createAbortController(): AbortController {
    const controller = new AbortController();
    
    setTimeout(() => {
      controller.abort();
    }, this.timeout);
    
    return controller;
  }

  /**
   * Verifica se a API key está configurada
   * @returns true se configurada
   */
  protected isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}
