import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { normalizeComprovanteText, parseValorString } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

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
    const valorMatch = /PIX (?:-|ENVIADO)?\s*(?:QR CODE)?\s*R\$\s*([\d.,]+)/i.exec(norm);
    const valor = valorMatch ? parseValorString(valorMatch[1]) : undefined;

    // Data: "Comprovante emitido em DD/MM/AAAA às HH:MM:SS"
    let data: string | undefined;
    const dataMatch = /COMPROVANTE EMITIDO EM (\d{2})\/(\d{2})\/(\d{4})/i.exec(norm);
    if (dataMatch) {
      const [, dd, mm, yyyy] = dataMatch;
      data = `${yyyy}-${mm}-${dd}`;
    }

    // ID Pix: "ID: E..."
    const idMatch = /ID:\s*(E[0-9A-Z]{10,})/i.exec(norm);
    const txId = idMatch ? idMatch[1].replaceAll(' ', '') : undefined;

    // Recebedor: após "Recebedor" até "CNPJ" ou "CPF"
    let recebedor;
    const recMatch = /RECEBEDOR\s+([A-Z\s]+?)(?=\s+(CNPJ|CPF|INSTITUICAO|$))/i.exec(norm);
    if (recMatch) recebedor = recMatch[1].trim();

    // Pagador: após "Pagador" até "CPF" ou "Agencia"
    let pagador;
    const pagMatch = /PAGADOR\s+([A-Z\s]+?)(?=\s+(CPF|AGENCIA|INSTITUICAO|$))/i.exec(norm);
    if (pagMatch) pagador = pagMatch[1].trim();

    const result: ParsedPix = {
      banco: normalizeBankName(this.bankName) || 'DESCONHECIDO',
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
