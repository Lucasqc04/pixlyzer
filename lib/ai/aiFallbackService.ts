import { ParsedPix, AIProvider } from '@/types/pix';
import { calculateConfidence, CONFIDENCE_THRESHOLD } from '@/lib/parser/confidenceService';
import { extractWithSimpleAI } from './aiSimpleService';
import { GeminiProvider } from './providers/geminiProvider';
import { iaRateLimit } from './aiRateLimiter';
import { GroqProvider } from './providers/groqProvider';
import { OpenRouterProvider } from './providers/openrouterProvider';
import { HuggingFaceProvider } from './providers/huggingfaceProvider';
import { logSafe } from '@/lib/utils/logging';

/**
 * AI Fallback Service - Orquestra múltiplos providers de IA
 * 
 * Fluxo de fallback:
 * 1. Tenta AI Simple (heurísticas locais, sem API)
 * 2. Se confidence < 0.8, tenta Groq
 * 3. Se Groq falhar, tenta OpenRouter
 * 4. Se OpenRouter falhar, tenta HuggingFace
 * 5. Se todos falharem, retorna melhor resultado possível
 * 
 * Cada provider tem timeout de 10 segundos.
 */

// Ordem de prioridade dos providers
const PROVIDER_ORDER: (new () => AIProvider)[] = [
  GeminiProvider,
  GroqProvider,
  OpenRouterProvider,
  HuggingFaceProvider,
];

/**
 * Tenta extrair dados usando fallback de IAs
 * @param text - Texto do OCR
 * @returns Dados extraídos (melhor esforço)
 */
export async function extractWithAIFallback(text: string): Promise<ParsedPix> {
  // Tentar providers externos em ordem
  const errors: string[] = [];

  for (const ProviderClass of PROVIDER_ORDER) {
    try {
      const provider = new ProviderClass();
      logSafe(`[AIFallback] Trying ${provider.name}...`);

      const result = await iaRateLimit(() => provider.extract(text));
      // Se confidence for aceitável, retornar
      if (result.confidence >= CONFIDENCE_THRESHOLD) {
        logSafe(`[AIFallback] ${provider.name} success with confidence: ${result.confidence}`);
        return result;
      }

      logSafe(`[AIFallback] ${provider.name} confidence too low: ${result.confidence}`);

    } catch (error: any) {
      const errorMsg = `[${ProviderClass.name}] ${error.message}`;
      console.warn(`[AIFallback] ${errorMsg}`);
      errors.push(errorMsg);
      // Continuar para próximo provider
      continue;
    }
  }

  // Se chegou aqui, nenhum provider retornou resultado bom
  // Usar SimpleAI como fallback final
  logSafe(`[AIFallback] Todos os providers externos falharam ou retornaram baixa confiança. Usando SimpleAI como fallback final. Errors:`, errors);
  return extractWithSimpleAI(text);
}


/**
 * Tenta extrair dados usando um provider específico
 * @param text - Texto do OCR
 * @param providerName - Nome do provider (groq, openrouter, huggingface)
 * @returns Dados extraídos
 */
export async function extractWithSpecificProvider(
  text: string, 
  providerName: string
): Promise<ParsedPix> {
  const providerMap: Record<string, new () => AIProvider> = {
    'groq': GroqProvider,
    'openrouter': OpenRouterProvider,
    'huggingface': HuggingFaceProvider,
  };

  const ProviderClass = providerMap[providerName.toLowerCase()];
  
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const provider = new ProviderClass();
  return provider.extract(text);
}

/**
 * Verifica quais providers estão configurados
 * @returns Array com nomes dos providers disponíveis
 */
export function getAvailableProviders(): string[] {
  const available: string[] = ['simple']; // Simple sempre disponível

  if (process.env.GROQ_API_KEY) {
    available.push('groq');
  }

  if (process.env.OPENROUTER_API_KEY) {
    available.push('openrouter');
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    available.push('huggingface');
  }

  return available;
}

/**
 * Extrai dados tentando apenas heurísticas locais
 * Útil quando não se quer fazer chamadas de API
 * @param text - Texto do OCR
 * @returns Dados extraídos
 */
export function extractWithLocalAIOnly(text: string): ParsedPix {
  return extractWithSimpleAI(text);
}

/**
 * Extrai dados tentando apenas providers externos
 * Útil quando se quer forçar uso de IA avançada
 * @param text - Texto do OCR
 * @returns Dados extraídos ou erro se todos falharem
 */
export async function extractWithExternalAIOnly(text: string): Promise<ParsedPix> {
  const errors: string[] = [];

  for (const ProviderClass of PROVIDER_ORDER) {
    try {
      const provider = new ProviderClass();
      const result = await provider.extract(text);
      
      if (result.confidence >= CONFIDENCE_THRESHOLD) {
        return result;
      }
    } catch (error: any) {
      errors.push(`${ProviderClass.name}: ${error.message}`);
      continue;
    }
  }

  throw new Error(`All external AI providers failed: ${errors.join('; ')}`);
}
