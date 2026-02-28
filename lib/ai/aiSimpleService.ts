import { ParsedPix } from '@/types/pix';
import { calculateConfidence } from '@/lib/parser/confidenceService';

/**
 * AI Simple Service - Extração de dados usando heurísticas locais
 * 
 * Este serviço NÃO usa APIs externas. Ele usa regex genéricas
 * e heurísticas simples para extrair dados quando o parser
 * específico do banco falha ou não existe.
 * 
 * É mais lento que parsers específicos, mas não requer
 * configuração de API keys.
 */

/**
 * Extrai dados usando heurísticas locais
 * @param text - Texto normalizado do OCR
 * @returns Dados extraídos no formato padrão
 */
export function extractWithSimpleAI(text: string): ParsedPix {
  const normalizedText = text.toUpperCase();

  // Extrair valor usando múltiplas estratégias
  const valor = extractValorGeneric(normalizedText);

  // Extrair data usando múltiplas estratégias
  const data = extractDataGeneric(normalizedText);

  // Extrair TX ID
  const txId = extractTxIdGeneric(normalizedText);

  // Extrair nomes (pagador e recebedor)
  const { pagador, recebedor } = extractNomesGeneric(normalizedText);

  // Tentar detectar banco
  const banco = detectBancoGeneric(normalizedText);

  const result: ParsedPix = {
    banco,
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
}

/**
 * Extrai valor usando estratégias genéricas
 */
function extractValorGeneric(text: string): number | undefined {
  // Estratégia 1: R$ seguido de valor (mais comum)
  // Regex: R$ opcional, espaço opcional, dígitos com separadores
  const match1 = text.match(/R\$\s*([\d.]+,\d{2})/i);
  if (match1) {
    return parseFloat(match1[1].replace(/\./g, '').replace(',', '.'));
  }

  // Estratégia 2: "VALOR:" seguido de número
  const match2 = text.match(/VALOR[\s:]+([\d.,]+)/i);
  if (match2) {
    const clean = match2[1].replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(clean);
    if (!isNaN(valor) && valor > 0 && valor < 1000000) {
      return valor;
    }
  }

  // Estratégia 3: Valor seguido de "REAIS"
  const match3 = text.match(/([\d.,]+)\s*REAIS/i);
  if (match3) {
    const clean = match3[1].replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(clean);
    if (!isNaN(valor) && valor > 0 && valor < 1000000) {
      return valor;
    }
  }

  // Estratégia 4: Qualquer número com 2 casas decimais
  // Regex: dígitos, vírgula/ponto, exatamente 2 dígitos
  // Evitar datas (DD/MM/AAAA)
  const match4 = text.match(/\b(\d+[.,]\d{2})\b(?!\d)/);
  if (match4) {
    const clean = match4[1].replace(',', '.');
    const valor = parseFloat(clean);
    // Verificar se é um valor razoável (não uma data)
    if (!isNaN(valor) && valor > 1 && valor < 1000000) {
      return valor;
    }
  }

  return undefined;
}

/**
 * Extrai data usando estratégias genéricas
 */
function extractDataGeneric(text: string): string | undefined {
  // Estratégia 1: DD/MM/AAAA (formato brasileiro mais comum)
  const match1 = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match1) {
    return `${match1[3]}-${match1[2]}-${match1[1]}`;
  }

  // Estratégia 2: "DATA:" seguido de data
  const match2 = text.match(/DATA[\s:]+(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/i);
  if (match2) {
    return `${match2[3]}-${match2[2]}-${match2[1]}`;
  }

  // Estratégia 3: DD-MM-AAAA
  const match3 = text.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match3) {
    return `${match3[3]}-${match3[2]}-${match3[1]}`;
  }

  // Estratégia 4: DD.MM.AAAA
  const match4 = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match4) {
    return `${match4[3]}-${match4[2]}-${match4[1]}`;
  }

  return undefined;
}

/**
 * Extrai TX ID usando estratégias genéricas
 */
function extractTxIdGeneric(text: string): string | undefined {
  // Estratégia 1: "TXID", "TX ID", "ID TRANSACAO" seguido de código
  const match1 = text.match(/(?:TXID|TX\s*ID|ID\s*TRANSACAO|CODIGO\s*TRANSACAO)[\s:]+([A-Z0-9]{20,35})/i);
  if (match1) {
    return match1[1].toUpperCase();
  }

  // Estratégia 2: "PROTOCOLO:" seguido de código
  const match2 = text.match(/PROTOCOLO[\s:]+([A-Z0-9]{20,35})/i);
  if (match2) {
    return match2[1].toUpperCase();
  }

  // Estratégia 3: "NUMERO DE CONTROLE:" seguido de código
  const match3 = text.match(/NUMERO\s*DE\s*CONTROLE[\s:]+([A-Z0-9]{20,35})/i);
  if (match3) {
    return match3[1].toUpperCase();
  }

  // Estratégia 4: Qualquer código alfanumérico de 20-35 caracteres
  // Regex: \b = word boundary, [A-Z0-9] = alfanumérico, {20,35} = tamanho
  const match4 = text.match(/\b([A-Z0-9]{20,35})\b/);
  if (match4) {
    return match4[1].toUpperCase();
  }

  return undefined;
}

/**
 * Extrai nomes (pagador e recebedor) usando estratégias genéricas
 */
function extractNomesGeneric(text: string): { pagador?: string; recebedor?: string } {
  let pagador: string | undefined;
  let recebedor: string | undefined;

  // Estratégia 1: "DE:" e "PARA:"
  const deMatch = text.match(/DE[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|CHAVE|$)/i);
  if (deMatch) {
    pagador = deMatch[1].trim();
  }

  const paraMatch = text.match(/PARA[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|CHAVE|$)/i);
  if (paraMatch) {
    recebedor = paraMatch[1].trim();
  }

  // Estratégia 2: "ORIGEM:" e "DESTINO:"
  if (!pagador) {
    const origemMatch = text.match(/ORIGEM[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|$)/i);
    if (origemMatch) {
      pagador = origemMatch[1].trim();
    }
  }

  if (!recebedor) {
    const destinoMatch = text.match(/DESTINO[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|$)/i);
    if (destinoMatch) {
      recebedor = destinoMatch[1].trim();
    }
  }

  // Estratégia 3: "PAGADOR:" e "RECEBEDOR:"
  if (!pagador) {
    const pagadorMatch = text.match(/PAGADOR[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|$)/i);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    }
  }

  if (!recebedor) {
    const recebedorMatch = text.match(/(?:RECEBEDOR|FAVORECIDO)[\s:]+([A-Z\s]+?)(?:\n|CPF|CNPJ|$)/i);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    }
  }

  return { pagador, recebedor };
}

/**
 * Detecta banco usando heurísticas genéricas
 */
function detectBancoGeneric(text: string): string {
  const lowerText = text.toLowerCase();

  // Mapeamento de palavras-chave por banco
  const bankKeywords: Record<string, string[]> = {
    'NUBANK': ['nubank', 'nu bank', 'nubank pagamentos'],
    'ITAU': ['itaú', 'itau', 'itau unibanco'],
    'BRADESCO': ['bradesco', 'banco bradesco'],
    'SANTANDER': ['santander', 'banco santander'],
    'BANCO DO BRASIL': ['banco do brasil', 'bb'],
    'CAIXA': ['caixa', 'caixa economica', 'cef'],
    'INTER': ['banco inter', 'inter medium'],
    'C6 BANK': ['c6 bank', 'c6bank'],
    'PICPAY': ['picpay', 'pic pay'],
    'MERCADO PAGO': ['mercado pago', 'mercadopago'],
  };

  for (const [bank, keywords] of Object.entries(bankKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return bank;
      }
    }
  }

  return 'DESCONHECIDO';
}
