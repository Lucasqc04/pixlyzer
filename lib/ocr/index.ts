/**
 * Módulo OCR - Exporta todas as funcionalidades de OCR
 */

export { processImage, isValidImage, getImageInfo, processMultipleImages } from './ocrService';
export { normalizeText, extractLines, findLinesWithKeyword, extractAfterLabel } from './normalizeText';
