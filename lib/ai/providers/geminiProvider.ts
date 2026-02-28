import { ParsedPix } from '@/types/pix';
import { BaseAIProvider } from './baseProvider';
import { calculateConfidence } from '@/lib/parser/confidenceService';


/**
 * Provider Google Gemini - Alta velocidade e limites generosos
 * * Modelo: gemini-1.5-flash
 * Documentação: https://ai.google.dev/docs
 * * Limites gratuitos:
 * - 15 requisições/minuto
 * - 1 milhão de tokens/minuto
 * - 1.500 requisições/dia
 */
export class GeminiProvider extends BaseAIProvider {
  name = 'Gemini';
  private model = 'gemini-2.0-flash-lite';
  // O Gemini usa uma estrutura de URL diferente (chave na query string)
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string = process.env.GEMINI_API_KEY || '', timeout: number = 10000) {
    super(apiKey, timeout);
  }

  async extract(text: string): Promise<ParsedPix> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const controller = this.createAbortController();

    try {
      // O endpoint do Gemini concatena o modelo e o método :generateContent
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: this.createPrompt(text),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Mantendo baixo para precisão no PIX
            maxOutputTokens: 500,
            // O Gemini suporta forçar o formato JSON nativamente
            responseMimeType: "application/json"
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      // A estrutura de resposta do Gemini é: candidates[0].content.parts[0].text
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      // Fazer parse do JSON usando o método herdado da BaseAIProvider
      const parsed = this.safeJsonParse(content);
      if (!parsed) {
        throw new Error('Failed to parse Gemini response');
      }

      // Converter para o formato padrão do PagueBit
      const result = this.convertToParsedPix(parsed, text);
      result.confidence = calculateConfidence(result);

      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Gemini request timeout');
      }
      throw error;
    }
  }
}