/**
 * Tipo padrao para dados extraidos de comprovantes PIX
 * Todas as funcoes de parsing devem retornar este formato
 */
export interface ParsedPix {
  /** Nome do banco identificado */
  banco: string;
  /** Valor da transacao em reais */
  valor?: number;
  /** Data da transacao no formato ISO (YYYY-MM-DD) */
  data?: string;
  /** Nome de quem pagou */
  pagador?: string;
  /** Nome de quem recebeu */
  recebedor?: string;
  /** Identificador unico da transacao PIX */
  txId?: string;
  /** Texto bruto extraido do OCR (para debug/auditoria) */
  rawText: string;
  /** Score de confianca (0.0 a 1.0) */
  confidence: number;
}

/**
 * Interface que todo parser de banco deve implementar
 * Permite adicionar novos bancos sem modificar o codigo existente
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
   * @returns Dados extraidos no formato padrao
   */
  parse(text: string): ParsedPix;
}

/**
 * Interface para providers de IA
 * Permite adicionar novos providers sem modificar o codigo existente
 */
export interface AIProvider {
  /** Nome identificador do provider */
  name: string;

  /**
   * Extrai dados estruturados usando IA
   * @param text - Texto do OCR
   * @returns Promise com dados extraidos
   */
  extract(text: string): Promise<ParsedPix>;
}

/**
 * Resultado do processamento OCR completo
 */
export interface OCRResult {
  /** Texto bruto extraido */
  text: string;
  /** Confianca do OCR (0-100) */
  confidence: number;
}

/**
 * Opcoes para processamento de OCR
 */
export interface OCROptions {
  /** Idioma do texto (padrao: 'por' para portugues) */
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
