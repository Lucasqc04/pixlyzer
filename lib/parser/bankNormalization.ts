/**
 * Normalização de nomes de bancos
 * Mapeia variações diferentes para um nome padrão único
 */

export const BANK_NAME_MAPPING: Record<string, string> = {
  // BANCO DO BRASIL
  'BB': 'BANCO DO BRASIL',
  'BANCO DO BRASIL': 'BANCO DO BRASIL',
  'BANCO DO BRASIL S.A': 'BANCO DO BRASIL',
  'BANCO DO BRASIL S.A.': 'BANCO DO BRASIL',
  'BCO DO BRASIL': 'BANCO DO BRASIL',
  'BCO DO BRASIL S.A': 'BANCO DO BRASIL',
  'BCO DO BRASIL S.A.': 'BANCO DO BRASIL',

  // NUBANK
  'NUBANK': 'NUBANK',
  'NU BANK': 'NUBANK',
  'NU PAGAMENTOS': 'NUBANK',
  'NU PAGAMENTOS - IP': 'NUBANK',

  // SANTANDER
  'SANTANDER': 'SANTANDER',
  'BANCO SANTANDER': 'SANTANDER',
  'BANCO SANTANDER (BRASIL)': 'SANTANDER',
  'BANCO SANTANDER (BRASIL) S.A': 'SANTANDER',
  'BANCO SANTANDER (BRASIL) S.A.': 'SANTANDER',
  'BCO SANTANDER': 'SANTANDER',
  'BCO SANTANDER (BRASIL) S.A': 'SANTANDER',
  'BCO SANTANDER (BRASIL) S.A.': 'SANTANDER',

  // ITAÚ
  'ITAU': 'ITAÚ',
  'ITÁU': 'ITAÚ',
  'ITAU UNIBANCO': 'ITAÚ',
  'ITÁU UNIBANCO': 'ITAÚ',
  'ITAU UNIBANCO S.A': 'ITAÚ',
  'ITÁU UNIBANCO S.A': 'ITAÚ',
  'ITAU UNIBANCO S.A.': 'ITAÚ',
  'ITÁU UNIBANCO S.A.': 'ITAÚ',

  // PAGBANK
  'PAGBANK': 'PAGBANK',
  'PAG BANK': 'PAGBANK',
  'PAGSEGURO': 'PAGBANK',
  'PAGSEGURO INTERNET': 'PAGBANK',
  'PAGSEGURO INTERNET INSTITUIÇÃO DE PAGAMENTO S.A.': 'PAGBANK',
  'PAGBANK (PAGSEGURO INTERNET INSTITUIÇÃO DE PAGAMENTO S.A.)': 'PAGBANK',

  // INTER
  'INTER': 'INTER',
  'BANCO INTER': 'INTER',
  'BANCO INTER S.A': 'INTER',
  'BANCO INTER S.A.': 'INTER',

  // BRADESCO
  'BRADESCO': 'BRADESCO',
  'BANCO BRADESCO': 'BRADESCO',
  'BANCO BRADESCO S.A': 'BRADESCO',
  'BANCO BRADESCO S.A.': 'BRADESCO',

  // MERCADO PAGO
  'MERCADO PAGO': 'MERCADO PAGO',
  'MERCADOPAGO': 'MERCADO PAGO',
  'MERCADO PAGO S.A': 'MERCADO PAGO',
  'MERCADO PAGO S.A.': 'MERCADO PAGO',

  // CONTA SIMPLES
  'CONTA SIMPLES': 'CONTA SIMPLES',
  'CONTASIMPLES': 'CONTA SIMPLES',

  // CELCOIN
  'CELCOIN': 'CELCOIN',
  'CELCOIN IP S.A.': 'CELCOIN',
  'BANCO CELCOIN': 'CELCOIN',

  // CORPX BANK
  'CORPX BANK': 'CORPX BANK',
  'CORPX BANK INSTITUIÇÃO DE PAGAMENTO S.A.': 'CORPX BANK',
  'CORPX BANK INSTITUICAO DE PAGAMENTO S.A.': 'CORPX BANK',

  // FX4 BANK
  'FX4 BANK': 'FX4 BANK',
  'FX4 BANK MÚLTIPLO DAS AMÉRICAS': 'FX4 BANK',
};

/**
 * Normaliza o nome de um banco para o padrão único
 * @param bankName - Nome do banco (pode estar em qualquer variação)
 * @returns Nome normalizado do banco
 */
export function normalizeBankName(bankName: string | undefined): string | undefined {
  if (!bankName) return undefined;

  const cleaned = bankName.trim().toUpperCase();
  return BANK_NAME_MAPPING[cleaned] || bankName;
}

/**
 * Compara dois nomes de banco ignorando variações
 * @param bank1 - Primeiro nome de banco
 * @param bank2 - Segundo nome de banco
 * @returns true se são o mesmo banco (após normalização)
 */
export function isSameBank(bank1: string | undefined, bank2: string | undefined): boolean {
  if (!bank1 || !bank2) return false;
  
  const normalized1 = normalizeBankName(bank1);
  const normalized2 = normalizeBankName(bank2);
  
  return normalized1?.toUpperCase() === normalized2?.toUpperCase();
}
