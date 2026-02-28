/**
 * Índice de todos os parsers de banco
 * 
 * Para adicionar um novo banco:
 * 1. Crie um arquivo novo (ex: sicredi.ts)
 * 2. Implemente o BankParser
 * 3. Exporte aqui
 * 
 * NÃO precisa modificar mais nenhum arquivo!
 * O parserOrchestrator detecta automaticamente.
 */

import { BankParser } from '@/types/pix';
import { nubankParser } from './nubank';
import { itauParser } from './itau';
import { bradescoParser } from './bradesco';
import { mercadoPagoParser } from './mercadopago';
import { pagbankParser } from './pagbank';
import { corpxBankParser } from './corpxbank';
import { fx4BankParser } from './fx4bank';
import { celcoinParser } from './celcoin';
import { contaSimplesParser } from './contasimples';
import { interParser } from './inter';
import { santanderParser } from './santander';

/**
 * Array com TODOS os parsers de banco disponíveis
 * 
 * Adicione novos parsers aqui para registrá-los automaticamente
 */
export const bankParsers: BankParser[] = [
  santanderParser,
  itauParser,
  nubankParser,
  bradescoParser,
  mercadoPagoParser,
  pagbankParser,
  corpxBankParser,
  fx4BankParser,
  celcoinParser,
  contaSimplesParser,
  interParser,
  // Adicione novos parsers aqui:
  // sicrediParser,
  // sicoobParser,
  // etc...
];

/**
 * Retorna todos os nomes de bancos suportados
 */
export function getSupportedBanks(): string[] {
  return bankParsers.map((parser) => parser.bankName);
}

/**
 * Busca um parser específico pelo nome do banco
 * @param bankName - Nome do banco
 * @returns Parser do banco ou undefined
 */
export function getParserByName(bankName: string): BankParser | undefined {
  return bankParsers.find(
    (parser) => parser.bankName.toLowerCase() === bankName.toLowerCase()
  );
}

// Re-exportar parsers individuais (útil para testes)
export { nubankParser } from './nubank';
export { itauParser } from './itau';
export { bradescoParser } from './bradesco';
export * from './bancoTemplate'; // Funções utilitárias
