import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { parseValorString } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser específico para comprovantes Bradesco
 * 
 * O Bradesco tem um layout tradicional com:
 * - Logo "Bradesco" ou "Banco Bradesco"
 * - Cores vermelhas (não relevante para OCR)
 * - Campos estruturados: "Valor", "Data/Hora", "Origem", "Destino"
 * - Número de controle específico
 */

export const bradescoParser: BankParser = {
  bankName: 'BRADESCO',

  /**
   * Detecta comprovantes do Bradesco
   */
  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Bradesco
    return (
      norm.includes('BRADESCO') ||
      norm.includes('CONFIRMAÇÃO DE OPERAÇÃO') ||
      norm.includes('DADOS DE QUEM RECEBEU')
    );
  },

  /**
   * Extrai dados de comprovantes Bradesco
   * 
   * Layout típico do Bradesco:
   * - Valor: "Valor: R$ 150,00" ou "R$ 150,00"
   * - Data: "Data: 15/01/2024" ou "Data/Hora: 15/01/2024 14:30"
   * - Origem: "Origem: Nome"
   * - Destino: "Destino: Nome"
   * - Controle: "Número de Controle: ABC123..."
   */
  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replaceAll(/\s+/g, ' ').toUpperCase();

    // Valor: "VALOR: R$10.00" ou "R$10.00" (sem espaço)
    let valor: number | undefined;
    let valorMatch = /VALOR[:\s]*R?\$\s*([\d.,]+)/.exec(norm);
    valorMatch ??= /R?\$\s*([\d.,]+)/.exec(norm);
    if (valorMatch) {
      valor = parseValorString(valorMatch[1]);
    }

    // Data: "DATA DO DÉBITO" ou "DATA: DD/MM/AAAA - HH:MM:SS"
    let data: string | undefined;
    const dataMatch = /DATA[\w\s]*[:-]*\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(norm);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "NÚMERO DE CONTROLE" ou "ID DA TRANSAÇÃO" (começa com E)
    let txId: string | undefined;
    const txIdMatch = /(E[0-9A-Z]{20,})/.exec(norm);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DADOS DE QUEM PAGOU" ou "NOME" até "CPF"/"CNPJ"/"AGÊNCIA"/"CONTA"
    let pagador: string | undefined;
    const pagadorMatch = /DADOS DE QUEM PAGOU.*?NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| AG[EÊ]NCIA| CONTA|$)/.exec(norm);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    } else {
      // fallback: "DE: NOME"
      const deMatch = /DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| AG[EÊ]NCIA| CONTA|$)/.exec(norm);
      if (deMatch) pagador = deMatch[1].trim();
    }

    // Recebedor: após "DADOS DE QUEM RECEBEU" ou "NOME" até "CPFICNPJ"/"CNPJ"/"CPF"
    let recebedor: string | undefined;
    const recebedorMatch = /DADOS DE QUEM RECEBEU.*?NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPFICNPJ| CNPJ| CPF| AG[EÊ]NCIA| CONTA|$)/.exec(norm);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    } else {
      // fallback: "PARA: NOME"
      const paraMatch = /PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPFICNPJ| CNPJ| CPF| AG[EÊ]NCIA| CONTA|$)/.exec(norm);
      if (paraMatch) recebedor = paraMatch[1].trim();
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
