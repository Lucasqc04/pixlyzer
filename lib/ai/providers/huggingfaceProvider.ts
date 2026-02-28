import { ParsedPix } from '@/types/pix';
import { BaseAIProvider } from './baseProvider';
import { calculateConfidence } from '@/lib/parser/confidenceService';

/**
 * Provider HuggingFace - Modelos open-source gratuitos
 * 
 * HuggingFace oferece acesso a modelos como:
 * - mistralai/Mistral-7B-Instruct-v0.2
 * - meta-llama/Llama-2-7b-chat-hf
 * - google/gemma-7b-it
 * 
 * Documentação: https://huggingface.co/docs/api-inference
 * 
 * Tem tokens gratuitos mensais
 */

export class HuggingFaceProvider extends BaseAIProvider {
  name = 'HuggingFace';
  private model = 'mistralai/Mistral-7B-Instruct-v0.2';
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string = process.env.HUGGINGFACE_API_KEY || '', timeout: number = 15000) {
    // HuggingFace pode demorar mais (cold start)
    super(apiKey, timeout);
  }

  /**
   * Extrai dados usando a API HuggingFace
   * @param text - Texto do OCR
   * @returns Dados extraídos
   */
  async extract(text: string): Promise<ParsedPix> {
    if (!this.isConfigured()) {
      throw new Error('HuggingFace API key not configured');
    }

    const controller = this.createAbortController();

    try {
      // HuggingFace usa formato diferente (text generation)
      const prompt = this.createSimplePrompt(text);

      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      // HuggingFace retorna array de gerações
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      if (!content) {
        throw new Error('Empty response from HuggingFace');
      }

      const parsed = this.safeJsonParse(content);
      if (!parsed) {
        throw new Error('Failed to parse HuggingFace response');
      }

      const result = this.convertToParsedPix(parsed, text);
      result.confidence = calculateConfidence(result);

      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('HuggingFace request timeout');
      }
      throw error;
    }
  }

  /**
   * Cria prompt simplificado para HuggingFace
   * (modelos de texto livre precisam de formato diferente)
   */
  private createSimplePrompt(text: string): string {
    return `<s>[INST] Extract the following fields from this Brazilian PIX receipt and return ONLY valid JSON:

Fields:
- banco: bank name
- valor: amount in reais (number)
- data: date in YYYY-MM-DD format
- pagador: payer name
- recebedor: receiver name  
- txId: transaction ID

Receipt text:
${text.substring(0, 2000)}

Return ONLY JSON, no explanation:
{
  "banco": "...",
  "valor": 150.50,
  "data": "2024-01-15",
  "pagador": "...",
  "recebedor": "...",
  "txId": "..."
} [/INST]`;
  }
}
