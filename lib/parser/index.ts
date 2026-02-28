/**
 * Módulo Parser - Exporta todas as funcionalidades de parsing
 */

export { 
  orchestrateParse, 
  parseWithBankDetectionOnly,
  getParserStats 
} from './parserOrchestrator';
export type { ParseOptions } from './parserOrchestrator';

export { detectBank, detectBankWithConfidence, getBankDisplayName } from './bankDetector';
export { 
  calculateConfidence, 
  isConfidenceAcceptable, 
  getConfidenceMessage,
  getMissingFields,
  CONFIDENCE_THRESHOLD 
} from './confidenceService';

// Parsers de banco
export { bankParsers, getSupportedBanks, getParserByName } from './banks';
export type { BankParser } from '@/types/pix';
