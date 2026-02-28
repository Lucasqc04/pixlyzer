import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractNome, parseValorString } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser para comprovantes Conta Simples
 * 
 * Conta Simples é uma instituição de pagamento que oferece serviços Pix
 * Layout típico:
 * - Valor: "R$ 146,89"
 * - Data: "DD.MM.AAAA, HH:MM:SS" ou "DD/MM/AAAA"
 * - Dados do Pagador: "DADOS DO PAGADOR" + "NOME"
 * - Dados do Favorecido: "DADOS DO FAVORECIDO" + "NOME"
 * - ID: "ID DA TRANSAÇÃO (EZE)" ou "ID DA TRANSAÇÃO"
 */
export const contaSimplesParser: BankParser = {
  bankName: 'CONTA SIMPLES',

  detect(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('conta simples');
  },

  parse(text: string): ParsedPix {
    const norm = text.replaceAll(/\s+/g, ' ').toUpperCase();

    // Valor: "R$ 146,89" 
    let valor: number | undefined;
    const valorMatch = /R\$\s*([\d.,]+)/.exec(norm);
    if (valorMatch) {
      valor = parseValorString(valorMatch[1]);
    }

    // Data: "DD.MM.AAAA" ou "DD/MM/AAAA" ou "DD JAN 2026"
    let data: string | undefined;
    const dataMatch1 = /(\d{2})[/.](01|02|03|04|05|06|07|08|09|10|11|12)[/.](202\d)/.exec(norm);
    if (dataMatch1) {
      data = `${dataMatch1[3]}-${dataMatch1[2]}-${dataMatch1[1]}`;
    }

    // TX ID: após "ID DA TRANSAÇÃO (EZE)" ou "ID DA TRANSAÇÃO:"
    let txId: string | undefined;
    const txIdMatch = /ID DA TRANSAÇÃO\s*(?:\(EZE\))?[:\s]+(E[0-9A-Z]{20,})/.exec(norm);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DADOS DO PAGADOR" + "NOME" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let pagador: string | undefined;
    const pagadorMatch = /DADOS DO PAGADOR[:\s]*NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/.exec(norm);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    } else {
      pagador = extractNome(text, 'de') || extractNome(text, 'pagador');
    }

    // Recebedor: após "DADOS DO FAVORECIDO" + "NOME" até "CNPJ"/"CPF"
    let recebedor: string | undefined;
    const recebedorMatch = /DADOS DO FAVORECIDO[:\s]*NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF|$)/.exec(norm);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    } else {
      recebedor = extractNome(text, 'para') || extractNome(text, 'favorecido');
    }

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
