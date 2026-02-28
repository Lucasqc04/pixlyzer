import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractValor, extractData, extractTxId, extractNome, normalizeComprovanteText } from './bancoTemplate';

/**
 * Parser para comprovantes Banco Inter
 */
export const interParser: BankParser = {
  bankName: 'INTER',

  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Inter
    return (
      norm.includes('INTER PIX ENVIADO') ||
      norm.includes('BANCO INTER S.A') ||
      norm.includes('SOBRE A TRANSAÇÃO') ||
      norm.includes('QUEM RECEBEU')
    );
  },

  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replace(/\s+/g, ' ').toUpperCase();

    // Valor: após "PIX ENVIADO" ou "R$"
    let valor: number | undefined;
    const valorMatch = norm.match(/PIX ENVIADO[:\s]*R?\$\s*([\d.,]+)/) || norm.match(/R?\$\s*([\d.,]+)/);
    if (valorMatch) {
      valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Data: "DATA DO PAGAMENTO" ou "DATA DA TRANSAÇÃO" ou "DIA DA SEMANA, DD/MM/AAAA"
    let data: string | undefined;
    const dataMatch = norm.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "ID DA TRANSAÇÃO" (começa com E)
    let txId: string | undefined;
    const txIdMatch = norm.match(/ID DA TRANSAÇÃO[:\s]+(E[0-9A-Z]{20,})/);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "QUEM PAGOU NOME" até "CPF"/"CNPJ"/"INSTITUIÇÃO"/"AGÊNCIA"/"CONTA"/"BANCO"
    let pagador: string | undefined;
    const pagadorMatch = norm.match(/QUEM PAGOU NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| INSTITUIÇÃO| AGÊNCIA| CONTA| BANCO|$)/);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    }

    // Recebedor: após "QUEM RECEBEU NOME" até "CPF"/"CNPJ"/"INSTITUIÇÃO"/"AGÊNCIA"/"CONTA"/"BANCO"
    let recebedor: string | undefined;
    const recebedorMatch = norm.match(/QUEM RECEBEU NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| INSTITUIÇÃO| AGÊNCIA| CONTA| BANCO|$)/);
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

function extractInterPagador(text: string): string | undefined {
  const match = text.match(/QUEM PAGOU\s+NOME\s+([A-Z\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|AGENCIA|CONTA|BANCO|$))/i);
  if (match) {
    return match[1].trim();
  }

  return extractNome(text, 'QUEM PAGOU') || extractNome(text, 'DE') || extractNome(text, 'PAGADOR');
}

function extractInterRecebedor(text: string): string | undefined {
  const match = text.match(/QUEM RECEBEU\s+NOME\s+([A-Z\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|AGENCIA|CONTA|BANCO|$))/i);
  if (match) {
    return match[1].trim();
  }

  return extractNome(text, 'QUEM RECEBEU') || extractNome(text, 'PARA') || extractNome(text, 'FAVORECIDO');
}
