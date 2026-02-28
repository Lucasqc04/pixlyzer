import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { parseValorString } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser específico para comprovantes Nubank
 * 
 * O Nubank tem um layout característico com:
 * - Logo "nubank" ou "nu bank"
 * - Cores roxas (não relevante para OCR)
 * - Campos específicos como "Transferência enviada", "Pagamento recebido"
 * - QR code no comprovante
 * - ID da transação em formato específico
 */

export const nubankParser: BankParser = {
  bankName: 'NUBANK',

  /**
   * Detecta comprovantes do Nubank
   * Procura por palavras-chave únicas do Nubank
   */
  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Nubank
    return (
      norm.includes('NU COMPROVANTE DE PAGAMENTO') ||
      norm.includes('NU PAGAMENTOS - IP') ||
      norm.includes('ME AJUDA >') ||
      norm.includes('NUBANK')
    );
  },

  /**
   * Extrai dados de comprovantes Nubank
   * 
   * Layout típico do Nubank:
   * - Valor: "R$ 150,00" ou "R$ 1.234,56"
   * - Data: "15 JAN 2024" ou "15/01/2024"
   * - De/Para: "De: Nome" "Para: Nome"
   * - ID: "Id da transação: ABC123..."
   */
  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replaceAll(/\s+/g, ' ').toUpperCase();

    // Valor: após "VALOR" ou "VALOR DO PAGAMENTO" ou "R$"
    let valor: number | undefined;
    let valorMatch = /VALOR(?: DO PAGAMENTO)?[:\s]*R?\$\s*([\d.,]+)/.exec(norm);
    valorMatch ??= /R?\$\s*([\d.,]+)/.exec(norm);
    if (valorMatch) {
      valor = parseValorString(valorMatch[1]);
    }

    // Data: "DD MMM AAAA - HH:MM:SS" ou "DD/MM/AAAA"
    // Nota: OCR pode errar O por 0, então usamos \d ou [0O] para capturar
    let data: string | undefined;
    const meses: Record<string, string> = {
      'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
      'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12',
    };
    
    // Tentar padrão "DD/MMM/AAAA" ou com O em vez de 0
    const dataExtMatch = /[0O](\d)?\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/.exec(norm);
    if (dataExtMatch) {
      // Extrair dia (pode ter OCR ruim)
      const dia = dataExtMatch[1] ? `0${dataExtMatch[1]}` : '01';
      data = `${dataExtMatch[3]}-${meses[dataExtMatch[2]]}-${dia}`;
    } else {
      // Tentar padrão "DD/MM/AAAA"
      const dataNumMatch = /(\d{2})\/(\d{2})\/(\d{4})/.exec(norm);
      if (dataNumMatch) {
        data = `${dataNumMatch[3]}-${dataNumMatch[2]}-${dataNumMatch[1]}`;
      }
    }

    // TX ID: "ID DA TRANSAÇÃO:" (começa com E)
    let txId: string | undefined;
    const txIdMatch = /ID DA TRANSAÇÃO[:\s]+(E[0-9A-Z]{20,})/.exec(norm);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "ORIGEM NOME" até "INSTITUIÇÃO"/"AGÊNCIA"/"CONTA"/"CPF"/"CNPJ"
    let pagador: string | undefined;
    const pagadorMatch = /ORIGEM NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= INSTITUIÇÃO| AGÊNCIA| CONTA| CPF| CNPJ|$)/.exec(norm);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    } else {
      // fallback: "DE: NOME"
      const deMatch = /DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= INSTITUIÇÃO| AGÊNCIA| CONTA| CPF| CNPJ|$)/.exec(norm);
      if (deMatch) pagador = deMatch[1].trim();
    }

    // Recebedor: após "DESTINO NOME" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let recebedor: string | undefined;
    const recebedorMatch = /DESTINO NOME[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/.exec(norm);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    } else {
      // fallback: "PARA: NOME"
      const paraMatch = /PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/.exec(norm);
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
