/**
 * Utilities para logging seguro
 * Remove ou abrevia dados sensíveis/grandes como imageData
 */

/**
 * Sanitiza um objeto para logging removendo ou abreviando campos grandes
 */
export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Error) {
    return {
      message: obj.message,
      name: obj.name,
      stack: obj.stack,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }

  const sanitized: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      // Abreviar fields grandes
      if (key === 'imageData' && typeof value === 'string' && value.length > 100) {
        sanitized[key] = '(base64)';
      } else if (typeof value === 'string' && value.length > 5000) {
        // Abreviar strings muito grandes
        sanitized[key] = value.substring(0, 100) + '... (truncated)';
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Wrapper para console.log que sanitiza argumentos
 */
export function logSafe(...args: any[]): void {
  const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
  console.log(...sanitizedArgs);
}

/**
 * Wrapper para console.error que sanitiza argumentos
 */
export function logErrorSafe(...args: any[]): void {
  const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
  console.error(...sanitizedArgs);
}
