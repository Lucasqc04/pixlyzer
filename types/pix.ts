/**
 * Tipo padrão para dados extraídos de comprovantes PIX
 * Todas as funções de parsing devem retornar este formato
 */
export interface ParsedPix {
  /** Nome do banco identificado */
  banco: string;
  /** Valor da transação em reais */
  valor?: number;
  /** Data da transação no formato ISO (YYYY-MM-DD) */
  data?: string;
  /** Nome de quem pagou */
  pagador?: string;
  /** Nome de quem recebeu */
  recebedor?: string;
  /** Identificador único da transação PIX */
  txId?: string;
  /** Texto bruto extraído do OCR (para debug/auditoria) */
  rawText: string;
  /** Score de confiança (0.0 a 1.0) */
  confidence: number;
}

/**
 * Interface que todo parser de banco deve implementar
 * Permite adicionar novos bancos sem modificar o código existente
 */
export interface BankParser {
  /** Nome identificador do banco */
  bankName: string;
  
  /**
   * Detecta se o texto pertence a este banco
   * @param text - Texto normalizado do OCR
   * @returns true se o banco foi detectado
   */
  detect(text: string): boolean;
  
  /**
   * Extrai dados estruturados do texto
   * @param text - Texto normalizado do OCR
   * @returns Dados extraídos no formato padrão
   */
  parse(text: string): ParsedPix;
}

/**
 * Interface para providers de IA
 * Permite adicionar novos providers sem modificar o código existente
 */
export interface AIProvider {
  /** Nome identificador do provider */
  name: string;
  
  /**
   * Extrai dados estruturados usando IA
   * @param text - Texto do OCR
   * @returns Promise com dados extraídos
   */
  extract(text: string): Promise<ParsedPix>;
}

/**
 * Resultado do processamento OCR completo
 */
export interface OCRResult {
  /** Texto bruto extraído */
  text: string;
  /** Confiança do OCR (0-100) */
  confidence: number;
}

/**
 * Opções para processamento de OCR
 */
export interface OCROptions {
  /** Idioma do texto (padrão: 'por' para português) */
  language?: string;
  /** Timeout em ms */
  timeout?: number;
}

/**
 * Erro estruturado do sistema OCR
 */
export class OCRError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'OCRError';
  }
}
