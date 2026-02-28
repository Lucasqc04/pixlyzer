import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { normalizeComprovanteText, extractValor, extractData, extractTxId, extractNome } from './bancoTemplate';

/**
 * Parser específico para comprovantes Santander
 * Detecta sempre pelo banco do pagador
 */
export const santanderParser: BankParser = {
  bankName: 'SANTANDER',

  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Santander
    return (
      norm.includes('COMPROVANTE DE PIX') ||
      norm.includes('SANTANDER') ||
      norm.includes('REALIZADO EM') ||
      norm.includes('IDENTIFICADOR: HASTYDEV')
    );
  },

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

function extractSantanderPagador(text: string): string | undefined {
  const dadosPagadorMatch = text.match(
    /DADOS DO PAGADOR\s+NOME\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|BANCO|$))/i
  );
  if (dadosPagadorMatch) {
    return dadosPagadorMatch[1].trim();
  }

  const enviadoDeMatch = text.match(/ENVIADO DE\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|BANCO|$))/i);
  if (enviadoDeMatch) {
    return enviadoDeMatch[1].trim();
  }

  const deMatch = text.match(/DE\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|BANCO|$))/i);
  if (deMatch) {
    return deMatch[1].trim();
  }

  return extractNome(text, 'DE');
}

function extractSantanderRecebedor(text: string): string | undefined {
  const dadosRecebedorMatch = text.match(
    /DADOS DO RECEBEDOR\s+NOME\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|BANCO|$))/i
  );
  if (dadosRecebedorMatch) {
    return dadosRecebedorMatch[1].trim();
  }

  const paraMatch = text.match(/PARA\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?=\s+(CPF|CNPJ|INSTITUICAO|BANCO|$))/i);
  if (paraMatch) {
    return paraMatch[1].trim();
  }

  return extractNome(text, 'PARA');
}
