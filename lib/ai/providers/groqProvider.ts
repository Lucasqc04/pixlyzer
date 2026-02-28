import { ParsedPix } from '@/types/pix';
import { BaseAIProvider } from './baseProvider';
import { calculateConfidence } from '@/lib/parser/confidenceService';

/**
 * Provider Groq com Rotação Automática de Modelos
 */
export class GroqProvider extends BaseAIProvider {
  name = 'Groq';
  
  // Lista de modelos ordenada por disponibilidade/custo-benefício para PIX
  private models = [
    'groq/compound-mini',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.1-8b-instant'
  ];

  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string = process.env.GROQ_API_KEY || '', timeout: number = 10000) {
    super(apiKey, timeout);
  }

  async extract(text: string): Promise<ParsedPix> {
    if (!this.isConfigured()) {
      throw new Error('Groq API key not configured');
    }

    let lastError: any;

    // Tenta cada modelo da lista em sequência se houver erro de Rate Limit
    for (const modelName of this.models) {
      try {
        return await this.attemptExtraction(text, modelName);
      } catch (error: any) {
        lastError = error;

        // Se for erro 429 (Rate Limit), tenta o próximo modelo
        if (error.message.includes('429')) {
          console.warn(`[GroqProvider] Rate limit atingido no modelo ${modelName}. Tentando próximo...`);
          continue;
        }

        // Se for outro erro (ex: 401, 400), lança imediatamente
        throw error;
      }
    }

    throw new Error(`Todos os modelos da Groq falharam. Último erro: ${lastError?.message}`);
  }

  /**
   * Método privado para realizar a chamada de rede
   */
  private async attemptExtraction(text: string, model: string): Promise<ParsedPix> {
    const controller = this.createAbortController();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em extrair dados de comprovantes PIX. Responda apenas com JSON válido.',
          },
          {
            role: 'user',
            content: this.createPrompt(text),
          },
        ],
        temperature: 0, // 0 é melhor para extração de dados (mais preciso)
        max_tokens: 500,
        // Força a resposta a ser um objeto JSON (suportado pela Groq)
        response_format: { type: "json_object" } 
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response from Groq');

    const parsed = this.safeJsonParse(content);
    if (!parsed) throw new Error('Failed to parse Groq response');

    const result = this.convertToParsedPix(parsed, text);
    result.confidence = calculateConfidence(result);

    return result;
  }
}