import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { normalizeComprovanteText } from './bancoTemplate';

/**
 * Parser para comprovantes Banco do Brasil (BB)
 * Baseado nos padrões técnicos fornecidos
 */
export const bbParser: BankParser = {
  bankName: 'BANCO DO BRASIL',

  detect(text: string): boolean {
    const norm = normalizeComprovanteText(text);
    return (
      norm.includes('COMPROVANTE BB') ||
      norm.includes('AUTENTICACAO SISBB') ||
      norm.includes('BCO DO BRASIL S.A')
    );
  },

  parse(text: string): ParsedPix {
    const norm = normalizeComprovanteText(text);
    // Valor: "Pix - QR Code R$ 120.00" ou "Pix Enviado R$ 120.00"
    const valorMatch = norm.match(/PIX (?:-|ENVIADO)?\s*(?:QR CODE)?\s*R\$\s*([\d.,]+)/i);
    const valor = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) : undefined;

    // Data: "Comprovante emitido em DD/MM/AAAA às HH:MM:SS"
    const dataMatch = norm.match(/COMPROVANTE EMITIDO EM (\d{2}\/\d{2}\/\d{4})\s+AS?\s+(\d{2}:\d{2}:\d{2})/i);
    const data = dataMatch ? `${dataMatch[1]} ${dataMatch[2]}` : undefined;

    // ID Pix: "ID: E..."
    const idMatch = norm.match(/ID:\s*(E[0-9A-Z]{10,})/i);
    const txId = idMatch ? idMatch[1].replace(/\s/g, '') : undefined;

    // Recebedor: após "Recebedor" até "CNPJ" ou "CPF"
    let recebedor;
    const recMatch = norm.match(/RECEBEDOR\s+([A-Z\s]+?)(?=\s+(CNPJ|CPF|INSTITUICAO|$))/i);
    if (recMatch) recebedor = recMatch[1].trim();

    // Pagador: após "Pagador" até "CPF" ou "Agencia"
    let pagador;
    const pagMatch = norm.match(/PAGADOR\s+([A-Z\s]+?)(?=\s+(CPF|AGENCIA|INSTITUICAO|$))/i);
    if (pagMatch) pagador = pagMatch[1].trim();

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
