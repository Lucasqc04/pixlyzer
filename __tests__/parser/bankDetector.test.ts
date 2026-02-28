/**
 * Testes unitários para Bank Detector
 */

import { 
  detectBank, 
  detectBankWithConfidence,
  detectMultipleBanks,
  getBankDisplayName 
} from '@/lib/parser/bankDetector';

describe('Bank Detector', () => {
  describe('detectBank', () => {
    it('should detect Nubank', () => {
      const text = 'Comprovante de transferência Nubank';
      expect(detectBank(text)).toBe('nubank');
    });

    it('should detect Itaú', () => {
      const text = 'Transferência realizada via Itaú';
      expect(detectBank(text)).toBe('itau');
    });

    it('should detect Bradesco', () => {
      const text = 'Comprovante Banco Bradesco';
      expect(detectBank(text)).toBe('bradesco');
    });

    it('should detect Santander', () => {
      const text = 'Transferência Santander';
      expect(detectBank(text)).toBe('santander');
    });

    it('should detect Banco do Brasil', () => {
      const text = 'Comprovante Banco do Brasil';
      expect(detectBank(text)).toBe('bb');
    });

    it('should detect Caixa', () => {
      const text = 'Transferência Caixa Econômica Federal';
      expect(detectBank(text)).toBe('caixa');
    });

    it('should detect Inter', () => {
      const text = 'Comprovante Banco Inter';
      expect(detectBank(text)).toBe('inter');
    });

    it('should detect C6 Bank', () => {
      const text = 'Transferência C6 Bank';
      expect(detectBank(text)).toBe('c6');
    });

    it('should detect PicPay', () => {
      const text = 'Comprovante PicPay';
      expect(detectBank(text)).toBe('picpay');
    });

    it('should detect Mercado Pago', () => {
      const text = 'Transferência Mercado Pago';
      expect(detectBank(text)).toBe('mercadopago');
    });

    it('should return desconhecido for unknown bank', () => {
      const text = 'Texto sem identificação de banco';
      expect(detectBank(text)).toBe('desconhecido');
    });

    it('should be case insensitive', () => {
      const text = 'COMPROVANTE NUBANK';
      expect(detectBank(text)).toBe('nubank');
    });

    it('should detect bank with multiple keywords', () => {
      const text = 'Nubank Pagamentos - Transferência enviada';
      expect(detectBank(text)).toBe('nubank');
    });
  });

  describe('detectBankWithConfidence', () => {
    it('should return high confidence for clear match', () => {
      const text = 'Nubank Nubank Nubank';
      const result = detectBankWithConfidence(text);
      
      expect(result.bank).toBe('nubank');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should return low confidence for unclear match', () => {
      const text = 'Transferência bancária';
      const result = detectBankWithConfidence(text);
      
      expect(result.bank).toBe('desconhecido');
      expect(result.confidence).toBe(0);
    });

    it('should return matched keywords', () => {
      const text = 'Comprovante Nubank';
      const result = detectBankWithConfidence(text);
      
      expect(result.matchedKeywords).toContain('nubank');
    });
  });

  describe('detectMultipleBanks', () => {
    it('should detect multiple banks in text', () => {
      const text = 'Transferência de Nubank para Itaú';
      const banks = detectMultipleBanks(text);
      
      expect(banks).toContain('nubank');
      expect(banks).toContain('itau');
    });

    it('should return unique banks only', () => {
      const text = 'Nubank Nubank Nubank';
      const banks = detectMultipleBanks(text);
      
      expect(banks).toEqual(['nubank']);
    });

    it('should return empty array for no banks', () => {
      const text = 'Texto sem banco';
      const banks = detectMultipleBanks(text);
      
      expect(banks).toEqual([]);
    });
  });

  describe('getBankDisplayName', () => {
    it('should return correct display names', () => {
      expect(getBankDisplayName('nubank')).toBe('NUBANK');
      expect(getBankDisplayName('itau')).toBe('Itaú');
      expect(getBankDisplayName('bradesco')).toBe('Bradesco');
      expect(getBankDisplayName('bb')).toBe('Banco do Brasil');
      expect(getBankDisplayName('caixa')).toBe('Caixa Econômica');
      expect(getBankDisplayName('desconhecido')).toBe('Desconhecido');
    });

    it('should return uppercase for unknown banks', () => {
      expect(getBankDisplayName('unknown')).toBe('UNKNOWN');
    });
  });
});
