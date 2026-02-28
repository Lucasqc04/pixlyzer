import { ParsedPix } from '@/types/pix';
import { BaseAIProvider } from './baseProvider';
import { calculateConfidence } from '@/lib/parser/confidenceService';

/**
 * Provider OpenRouter - Acesso a múltiplos modelos de IA
 * 
 * OpenRouter oferece acesso a modelos como:
 * - GPT-3.5/4 (OpenAI)
 * - Claude (Anthropic)
 * - Llama (Meta)
 * - E muitos outros
 * 
 * Documentação: https://openrouter.ai/docs
 * 
 * Tem plano gratuito com limites generosos
 */

export class OpenRouterProvider extends BaseAIProvider {
  name = 'OpenRouter';
  private model = 'meta-llama/llama-3.1-8b-instruct:free';
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string = process.env.OPENROUTER_API_KEY || '', timeout: number = 10000) {
    super(apiKey, timeout);
  }

  /**
   * Extrai dados usando a API OpenRouter
   * @param text - Texto do OCR
   * @returns Dados extraídos
   */
  async extract(text: string): Promise<ParsedPix> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API key not configured');
    }

    const controller = this.createAbortController();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Pixlyzer OCR',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a specialized assistant for extracting data from Brazilian PIX payment receipts. Respond only with valid JSON.',
            },
            {
              role: 'user',
              content: this.createPrompt(text),
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenRouter');
      }

      const parsed = this.safeJsonParse(content);
      if (!parsed) {
        throw new Error('Failed to parse OpenRouter response');
      }

      const result = this.convertToParsedPix(parsed, text);
      result.confidence = calculateConfidence(result);

      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter request timeout');
      }
      throw error;
    }
  }
}
