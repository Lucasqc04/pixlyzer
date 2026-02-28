import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractValor, extractData, extractTxId, extractNome } from './bancoTemplate';

/**
 * Parser para comprovantes PagBank/PagSeguro
 */
export const pagbankParser: BankParser = {
  bankName: 'PAGBANK',

  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Pagbank
    return (
      norm.includes('COMPROVANTE DE PAGAMENTO PIX') ||
      norm.includes('PAGBANK') ||
      norm.includes('PAGSEGURO INTERNET') ||
      norm.includes('CÓDIGO DA TRANSAÇÃO PAGBANK')
    );
  },

  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replace(/\s+/g, ' ').toUpperCase();

    // Valor: "VALOR DO PAGAMENTO R$ X" ou "R$ X"
    let valor: number | undefined;
    const valorMatch = norm.match(/VALOR DO PAGAMENTO[:\s]*R?\$\s*([\d.,]+)/) || norm.match(/R?\$\s*([\d.,]+)/);
    if (valorMatch) {
      valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Data: "DD/MM/AAAA ÀS HH:MM:SS"
    let data: string | undefined;
    const dataMatch = norm.match(/(\d{2})\/(\d{2})\/(\d{4})\s+ÀS\s+\d{2}:\d{2}:\d{2}/);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "CÓDIGO DA TRANSAÇÃO PIX" (começa com E)
    let txId: string | undefined;
    const txIdMatch = norm.match(/CÓDIGO DA TRANSAÇÃO PIX[:\s]+(E[0-9A-Z]{20,})/);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DE" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let pagador: string | undefined;
    const pagadorMatch = norm.match(/DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    }

    // Recebedor: após "PARA" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let recebedor: string | undefined;
    const recebedorMatch = norm.match(/PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/);
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
