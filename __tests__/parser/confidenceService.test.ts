/**
 * Testes unitários para Confidence Service
 */

import { 
  calculateConfidence, 
  isConfidenceAcceptable,
  getConfidenceMessage,
  getMissingFields,
  CONFIDENCE_THRESHOLD 
} from '@/lib/parser/confidenceService';
import { ParsedPix } from '@/types/pix';

describe('Confidence Service', () => {
  describe('calculateConfidence', () => {
    it('should return 1.0 for complete data', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        pagador: 'João Silva',
        recebedor: 'Maria Silva',
        txId: 'ABC123DEF456GHI789JKL012MNO345PQ',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(1.0);
    });

    it('should return 0.6 for valor + data only', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.6);
    });

    it('should return 0 for empty data', () => {
      const parsed: ParsedPix = {
        banco: 'DESCONHECIDO',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0);
    });

    it('should reject invalid valor (zero)', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 0,
        data: '2024-01-15',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.3); // só data conta
    });

    it('should reject invalid valor (negative)', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: -100,
        data: '2024-01-15',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.3); // só data conta
    });

    it('should reject invalid valor (too large)', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 2000000, // > 1 milhão
        data: '2024-01-15',
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.3); // só data conta
    });

    it('should reject invalid data (future date)', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: futureDate.toISOString().split('T')[0],
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.3); // só valor conta
    });

    it('should reject invalid txId (too short)', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        txId: 'ABC123', // muito curto
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.6); // valor + data
    });

    it('should reject invalid nome (too short)', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        pagador: 'A', // muito curto
        rawText: 'test',
        confidence: 0,
      };

      const confidence = calculateConfidence(parsed);
      expect(confidence).toBe(0.6); // valor + data
    });
  });

  describe('isConfidenceAcceptable', () => {
    it('should return true for confidence >= 0.8', () => {
      expect(isConfidenceAcceptable(0.8)).toBe(true);
      expect(isConfidenceAcceptable(0.9)).toBe(true);
      expect(isConfidenceAcceptable(1.0)).toBe(true);
    });

    it('should return false for confidence < 0.8', () => {
      expect(isConfidenceAcceptable(0.79)).toBe(false);
      expect(isConfidenceAcceptable(0.5)).toBe(false);
      expect(isConfidenceAcceptable(0)).toBe(false);
    });
  });

  describe('getConfidenceMessage', () => {
    it('should return excellent message for >= 0.9', () => {
      expect(getConfidenceMessage(0.9)).toContain('Excelente');
      expect(getConfidenceMessage(1.0)).toContain('Excelente');
    });

    it('should return good message for >= 0.8', () => {
      expect(getConfidenceMessage(0.8)).toContain('Bom');
      expect(getConfidenceMessage(0.89)).toContain('Bom');
    });

    it('should return regular message for >= 0.6', () => {
      expect(getConfidenceMessage(0.6)).toContain('Regular');
      expect(getConfidenceMessage(0.79)).toContain('Regular');
    });

    it('should return low message for >= 0.4', () => {
      expect(getConfidenceMessage(0.4)).toContain('Baixo');
      expect(getConfidenceMessage(0.59)).toContain('Baixo');
    });

    it('should return very low message for < 0.4', () => {
      expect(getConfidenceMessage(0.39)).toContain('Muito baixo');
      expect(getConfidenceMessage(0)).toContain('Muito baixo');
    });
  });

  describe('getMissingFields', () => {
    it('should return all fields for empty data', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        rawText: 'test',
        confidence: 0,
      };

      const missing = getMissingFields(parsed);
      expect(missing).toContain('valor');
      expect(missing).toContain('data');
      expect(missing).toContain('txId');
      expect(missing).toContain('pagador');
      expect(missing).toContain('recebedor');
    });

    it('should return empty array for complete data', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        pagador: 'João Silva',
        recebedor: 'Maria Silva',
        txId: 'ABC123DEF456GHI789JKL012MNO345PQ',
        rawText: 'test',
        confidence: 0,
      };

      const missing = getMissingFields(parsed);
      expect(missing).toEqual([]);
    });

    it('should return only missing fields', () => {
      const parsed: ParsedPix = {
        banco: 'NUBANK',
        valor: 150.50,
        data: '2024-01-15',
        rawText: 'test',
        confidence: 0,
      };

      const missing = getMissingFields(parsed);
      expect(missing).toContain('txId');
      expect(missing).toContain('pagador');
      expect(missing).toContain('recebedor');
      expect(missing).not.toContain('valor');
      expect(missing).not.toContain('data');
    });
  });
});
