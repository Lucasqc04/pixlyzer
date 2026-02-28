import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';

/**
 * Parser específico para comprovantes Itaú
 * 
 * O Itaú tem um layout tradicional com:
 * - Logo "Itaú" ou "itaú unibanco"
 * - Cores laranja (não relevante para OCR)
 * - Campos bem definidos: "Valor", "Data", "De", "Para"
 * - Código de transação específico
 */

export const itauParser: BankParser = {
  bankName: 'ITAU',

  /**
   * Detecta comprovantes do Itaú
   */
  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Itaú
    return (
      norm.includes('COMPROVANTE DE PIX') ||
      norm.includes('ITAÚ') ||
      norm.includes('ITAU') ||
      norm.includes('REALIZADO EM')
    );
  },

  /**
   * Extrai dados de comprovantes Itaú
   * 
   * Layout típico do Itaú:
   * - Valor: "Valor: R$ 150,00"
   * - Data: "Data: 15/01/2024" ou "15/01/2024 às 14:30"
   * - De: "De: Nome"
   * - Para: "Para: Nome"
   * - ID: "Código da transação: ABC123..."
   */
  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replace(/\s+/g, ' ').toUpperCase();

    // Valor: após "VALOR:" ou "R$"
    let valor: number | undefined;
    const valorMatch = norm.match(/VALOR[:\s]*R?\$\s*([\d.,]+)/) || norm.match(/R?\$\s*([\d.,]+)/);
    if (valorMatch) {
      valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Data: "REALIZADO EM DD/MM/AAAA ÀS HH:MM:SS" ou "DATA: DD/MM/AAAA"
    let data: string | undefined;
    const dataMatch = norm.match(/REALIZADO EM[:\s]*(\d{2})\/(\d{2})\/(\d{4})/) || norm.match(/DATA[:\s]*(\d{2})\/(\d{2})\/(\d{4})/);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "ID DA TRANSAÇÃO:" (começa com E)
    let txId: string | undefined;
    const txIdMatch = norm.match(/ID DA TRANSAÇÃO[:\s]+(E[0-9A-Z]{20,})/);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DE:" até "CPF:"/"CNPJ:"/"AGÊNCIA"/"CONTA"
    let pagador: string | undefined;
    const pagadorMatch = norm.match(/DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF:| CNPJ:| AGÊNCIA| CONTA|$)/);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    }

    // Recebedor: após "PARA:" até "CPF/CNPJ:"/"CNPJ:"/"CPF:"
    let recebedor: string | undefined;
    const recebedorMatch = norm.match(/PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF\/CNPJ:| CNPJ:| CPF:|$)/);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    }

    const result: ParsedPix = {
      banco: this.bankName,
      valor,
      data,
      pagador,
      recebedor,
      txId,
      rawText: text.substring(0, 1000),
      confidence: 0,
    };
    result.confidence = calculateConfidence(result);
    return result;
  },
};
