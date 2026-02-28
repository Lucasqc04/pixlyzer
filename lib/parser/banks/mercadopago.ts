import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { parseValorString, extractData, extractTxId, extractNome } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser para comprovantes Mercado Pago
 * 
 * Mercado Pago é um provedor de pagamentos que oferece Pix
 * Layout típico:
 * - Valor: "R$ 147" ou "R$ 147.00"
 * - Data: dia, data, hora (ex: "Sexta-feira, 2 de janeiro de 2026, às 12:05:41")
 * - De/Para: "De" + nome, "Para" + nome
 * - ID: "ID da transação Pix" + código
 */
export const mercadoPagoParser: BankParser = {
  bankName: 'MERCADO PAGO',

  detect(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('mercado pago') ||
      lower.includes('mercadopago') ||
      lower.includes('psp: 323') ||
      lower.includes('atendimento ao cliente 0800 637 7246')
    );
  },

  parse(text: string): ParsedPix {
    const norm = text.replaceAll(/\s+/g, ' ').toUpperCase();

    // Valor: "R$ 147" ou "R$ 147.00" ou "TOTAL: R$ 147"
    let valor: number | undefined;
    const valorMatch = /(?:TOTAL[:\s])*R\$\s*([\d.,]+)/.exec(norm);
    if (valorMatch) {
      valor = parseValorString(valorMatch[1]);
    }

    // Data: padrão date word, DD de Month de AAAA, às HH:MM:SS
    let data: string | undefined;
    const meses: Record<string, string> = {
      'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
      'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
      'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12',
    };
    const dataMatch = /(\d{1,2})\s+DE\s+(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\s+DE\s+(\d{4})/.exec(norm);
    if (dataMatch) {
      const dia = dataMatch[1].padStart(2, '0');
      data = `${dataMatch[3]}-${meses[dataMatch[2]]}-${dia}`;
    } else {
      // Tentar padrão numérico como fallback
      data = extractData(text);
    }

    // TX ID: "ID DA TRANSAÇÃO PIX" + código ou após "ID DA TRANSAÇÃO PIX"
    let txId: string | undefined;
    const txIdMatch = /ID DA TRANSAÇÃO PIX[:\s]*(E[0-9A-Z]{20,})/i.exec(norm);
    if (txIdMatch) {
      txId = txIdMatch[1];
    } else {
      txId = extractTxId(text);
    }

    // Pagador: após "De" até "CPF" ou próximo campo
    let pagador: string | undefined;
    const pagadorMatch = /DE\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF[:\s]| PSP[:\s]|$)/.exec(norm);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    } else {
      pagador = extractNome(text, 'de');
    }

    // Recebedor: após "Para" até "CNPJ" ou próximo campo
    let recebedor: string | undefined;
    const recebedorMatch = /PARA\s+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ[:\s]| PSP[:\s]|$)/.exec(norm);
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
