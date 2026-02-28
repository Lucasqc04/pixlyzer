import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';

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
    const norm = text.replace(/\s+/g, ' ').toUpperCase();

    // Valor: "VALOR: R$10.00" ou "R$10.00" (sem espaço)
    let valor: number | undefined;
    const valorMatch = norm.match(/VALOR[:\s]*R?\$\s*([\d.,]+)/) || norm.match(/R?\$\s*([\d.,]+)/);
    if (valorMatch) {
      valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Data: "DATA DO DÉBITO" ou "DATA: DD/MM/AAAA - HH:MM:SS"
    let data: string | undefined;
    const dataMatch = norm.match(/DATA[\w\s]*[:\-]*\s*(\d{2})\/(\d{2})\/(\d{4})/);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "NÚMERO DE CONTROLE" ou "ID DA TRANSAÇÃO" (começa com E)
    let txId: string | undefined;
    const txIdMatch = norm.match(/(E[0-9A-Z]{20,})/);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DADOS DE QUEM PAGOU" ou "NOME" até "CPF"/"CNPJ"/"AGÊNCIA"/"CONTA"
    let pagador: string | undefined;
    const pagadorMatch = norm.match(/DADOS DE QUEM PAGOU.*?NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| AG[EÊ]NCIA| CONTA|$)/);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    } else {
      // fallback: "DE: NOME"
      const deMatch = norm.match(/DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPF| CNPJ| AG[EÊ]NCIA| CONTA|$)/);
      if (deMatch) pagador = deMatch[1].trim();
    }

    // Recebedor: após "DADOS DE QUEM RECEBEU" ou "NOME" até "CPFICNPJ"/"CNPJ"/"CPF"
    let recebedor: string | undefined;
    const recebedorMatch = norm.match(/DADOS DE QUEM RECEBEU.*?NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPFICNPJ| CNPJ| CPF| AG[EÊ]NCIA| CONTA|$)/);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    } else {
      // fallback: "PARA: NOME"
      const paraMatch = norm.match(/PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CPFICNPJ| CNPJ| CPF| AG[EÊ]NCIA| CONTA|$)/);
      if (paraMatch) recebedor = paraMatch[1].trim();
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
