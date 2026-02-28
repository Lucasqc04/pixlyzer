/**
 * Servico de normalizacao de texto OCR
 *
 * O OCR frequentemente produz texto com:
 * - Espacos irregulares
 * - Caracteres confundidos (O vs 0, l vs 1)
 * - Quebras de linha inconsistentes
 * - Caracteres especiais mal interpretados
 *
 * Esta funcao padroniza o texto para melhorar a precisao dos parsers
 */

/**
 * Normaliza texto extraido por OCR
 * @param text - Texto bruto do OCR
 * @returns Texto normalizado e limpo
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text;

  // 1. Normalizar quebras de linha (Windows \r\n, Mac \r -> Unix \n)
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remover multiplos espacos consecutivos
  // Regex: \s+ significa "um ou mais caracteres de espaco"
  normalized = normalized.replace(/\s+/g, ' ');

  // 3. Corrigir O por 0 quando em contexto numerico
  // Regex: O seguido de digitos, ou digitos seguidos de O, ou entre digitos
  // Exemplos: "R$ O50" -> "R$ 050", "15O,00" -> "150,00"
  normalized = normalized.replace(/(\d)O(\d)/g, '$10$2'); // 1O2 -> 102
  normalized = normalized.replace(/O(\d{2,})/g, '0$1'); // O50 -> 050
  normalized = normalized.replace(/(\d)O(?=\D|$)/g, '$10'); // 15O -> 150

  // 4. Corrigir l (minusculo L) por 1 em contextos numericos
  // Regex: l seguido de digitos ou entre digitos
  normalized = normalized.replace(/(\d)l(\d)/g, '$11$2');
  normalized = normalized.replace(/l(\d)/g, '1$1');

  // 5. Corrigir S por 5 em contextos de valores monetarios
  // Regex: R$ seguido de espaco opcional e S
  normalized = normalized.replace(/(R\$\s?)S(\d)/g, '$15$2');

  // 6. Padronizar separador decimal
  // Regex: virgula entre digitos -> ponto
  // Mas preservar virgula como separador de milhar se houver ponto depois
  // Exemplo: "1.234,56" -> "1234.56", "1234,56" -> "1234.56"
  normalized = normalized.replace(/(\d),(?=\d{2}(?:\D|$))/g, '$1.');

  // 7. Remover caracteres de controle (exceto espaco e nova linha)
  // Regex: [\x00-\x1F] sao caracteres ASCII de controle
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 8. Remover caracteres Unicode invalidos comuns em OCR
  normalized = normalized.replace(/[\uFFFD\uFEFF]/g, '');

  // 9. Normalizar espacos em branco no inicio e fim de cada linha
  normalized = normalized
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // 10. Remover linhas vazias excessivas (mais de 2 consecutivas)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 11. Trim final
  normalized = normalized.trim();

  return normalized;
}

/**
 * Extrai linhas nao vazias do texto
 * @param text - Texto normalizado
 * @returns Array de linhas limpas
 */
export function extractLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Encontra linhas que contem uma palavra-chave
 * @param lines - Array de linhas
 * @param keyword - Palavra-chave a buscar (case insensitive)
 * @returns Array de linhas que contem a palavra-chave
 */
export function findLinesWithKeyword(lines: string[], keyword: string): string[] {
  const lowerKeyword = keyword.toLowerCase();
  return lines.filter((line) => line.toLowerCase().includes(lowerKeyword));
}

/**
 * Extrai valor apos um label especifico
 * @param text - Texto completo
 * @param label - Label a buscar (ex: "Valor:", "R$")
 * @returns Valor encontrado ou null
 */
export function extractAfterLabel(text: string, label: string): string | null {
  const regex = new RegExp(`${label}\\s*([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
