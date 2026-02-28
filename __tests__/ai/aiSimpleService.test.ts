/**
 * Testes unitários para AI Simple Service
 */

import { extractWithSimpleAI } from '@/lib/ai/aiSimpleService';

describe('AI Simple Service', () => {
  describe('extractWithSimpleAI', () => {
    it('should extract valor from R$ format', () => {
      const text = 'Comprovante de transferência R$ 150,50';
      const result = extractWithSimpleAI(text);
      
      expect(result.valor).toBe(150.50);
    });

    it('should extract valor from VALOR label', () => {
      const text = 'VALOR: 200,00';
      const result = extractWithSimpleAI(text);
      
      expect(result.valor).toBe(200.00);
    });

    it('should extract valor from REAIS format', () => {
      const text = 'Valor da transferência: 500,00 reais';
      const result = extractWithSimpleAI(text);
      
      expect(result.valor).toBe(500.00);
    });

    it('should extract data from DD/MM/YYYY format', () => {
      const text = 'Data: 15/01/2024';
      const result = extractWithSimpleAI(text);
      
      expect(result.data).toBe('2024-01-15');
    });

    it('should extract data from DD-MM-YYYY format', () => {
      const text = 'Data: 15-01-2024';
      const result = extractWithSimpleAI(text);
      
      expect(result.data).toBe('2024-01-15');
    });

    it('should extract data from DD.MM.YYYY format', () => {
      const text = 'Data: 15.01.2024';
      const result = extractWithSimpleAI(text);
      
      expect(result.data).toBe('2024-01-15');
    });

    it('should extract txId from TXID label', () => {
      const text = 'TXID: ABC123DEF456GHI789JKL012MNO345PQ';
      const result = extractWithSimpleAI(text);
      
      expect(result.txId).toBe('ABC123DEF456GHI789JKL012MNO345PQ');
    });

    it('should extract txId from PROTOCOLO label', () => {
      const text = 'PROTOCOLO: XYZ789ABC123DEF456GHI789JKL01';
      const result = extractWithSimpleAI(text);
      
      expect(result.txId).toBe('XYZ789ABC123DEF456GHI789JKL01');
    });

    it('should extract txId from generic alphanumeric', () => {
      const text = 'Código: ABC123DEF456GHI789JKL012MNO345PQ';
      const result = extractWithSimpleAI(text);
      
      expect(result.txId).toBe('ABC123DEF456GHI789JKL012MNO345PQ');
    });

    it('should extract pagador from DE label', () => {
      const text = 'De: João Silva';
      const result = extractWithSimpleAI(text);
      
      expect(result.pagador).toBe('João Silva');
    });

    it('should extract recebedor from PARA label', () => {
      const text = 'Para: Maria Silva';
      const result = extractWithSimpleAI(text);
      
      expect(result.recebedor).toBe('Maria Silva');
    });

    it('should extract pagador from ORIGEM label', () => {
      const text = 'Origem: João Silva';
      const result = extractWithSimpleAI(text);
      
      expect(result.pagador).toBe('João Silva');
    });

    it('should extract recebedor from DESTINO label', () => {
      const text = 'Destino: Maria Silva';
      const result = extractWithSimpleAI(text);
      
      expect(result.recebedor).toBe('Maria Silva');
    });

    it('should detect Nubank', () => {
      const text = 'Comprovante Nubank';
      const result = extractWithSimpleAI(text);
      
      expect(result.banco).toBe('NUBANK');
    });

    it('should detect Itaú', () => {
      const text = 'Comprovante Itaú';
      const result = extractWithSimpleAI(text);
      
      expect(result.banco).toBe('ITAU');
    });

    it('should detect Bradesco', () => {
      const text = 'Comprovante Bradesco';
      const result = extractWithSimpleAI(text);
      
      expect(result.banco).toBe('BRADESCO');
    });

    it('should return DESCONHECIDO for unknown bank', () => {
      const text = 'Comprovante de transferência';
      const result = extractWithSimpleAI(text);
      
      expect(result.banco).toBe('DESCONHECIDO');
    });

    it('should extract complete data from full receipt', () => {
      const text = `
        Comprovante de Transferência PIX
        Nubank
        
        De: João Silva
        Para: Maria Silva
        
        Valor: R$ 150,50
        Data: 15/01/2024
        
        TXID: ABC123DEF456GHI789JKL012MNO345PQ
      `;
      
      const result = extractWithSimpleAI(text);
      
      expect(result.banco).toBe('NUBANK');
      expect(result.valor).toBe(150.50);
      expect(result.data).toBe('2024-01-15');
      expect(result.pagador).toBe('João Silva');
      expect(result.recebedor).toBe('Maria Silva');
      expect(result.txId).toBe('ABC123DEF456GHI789JKL012MNO345PQ');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should calculate confidence correctly', () => {
      const textWithAllFields = `
        Valor: R$ 100,00
        Data: 01/01/2024
        De: João
        Para: Maria
        TXID: ABC123DEF456GHI789JKL012MNO345PQ
      `;
      
      const result = extractWithSimpleAI(textWithAllFields);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle empty text', () => {
      const result = extractWithSimpleAI('');
      
      expect(result.banco).toBe('DESCONHECIDO');
      expect(result.valor).toBeUndefined();
      expect(result.data).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it('should limit rawText to 1000 chars', () => {
      const longText = 'A'.repeat(2000);
      const result = extractWithSimpleAI(longText);
      
      expect(result.rawText.length).toBeLessThanOrEqual(1000);
    });
  });
});
