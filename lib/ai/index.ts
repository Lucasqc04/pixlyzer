/**
 * Módulo AI - Exporta todas as funcionalidades de IA
 */

export { 
  extractWithAIFallback, 
  extractWithSpecificProvider,
  extractWithLocalAIOnly,
  extractWithExternalAIOnly,
  getAvailableProviders 
} from './aiFallbackService';

export { extractWithSimpleAI } from './aiSimpleService';

// Providers
export { BaseAIProvider } from './providers/baseProvider';
export { GroqProvider } from './providers/groqProvider';
export { OpenRouterProvider } from './providers/openrouterProvider';
export { HuggingFaceProvider } from './providers/huggingfaceProvider';
