// lib/ai/aiRateLimiter.ts
// Rate limiter global para chamadas de IA externa
// Limita a 15 requisições por minuto. Se passar, aguarda para continuar.
// Erros de IA (429, etc) não afetam a fila - continua normal para próximo provider.

const MAX_REQUESTS_PER_MINUTE = 15;
const INTERVAL_MS = 60_000; // 1 minuto

let timestamps: number[] = [];

function cleanTimestamps() {
  const now = Date.now();
  timestamps = timestamps.filter(ts => now - ts < INTERVAL_MS);
}

export function iaRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tryRun = () => {
      cleanTimestamps();
      
      if (timestamps.length < MAX_REQUESTS_PER_MINUTE) {
        // Dentro do limite, executar imediatamente
        timestamps.push(Date.now());
        fn()
          .then(resolve)
          .catch(reject); // Apenas passa o erro adiante, não trata
      } else {
        // Fora do limite, aguardar e retentar
        const oldestTimestamp = timestamps[0];
        const waitTime = INTERVAL_MS - (Date.now() - oldestTimestamp) + 100; // +100ms buffer
        
        if (waitTime > 0) {
          console.log(`[RateLimit] Limite atingido. Aguardando ${waitTime}ms...`);
          setTimeout(tryRun, waitTime);
        } else {
          // Se tempo já passou, retentar imediatamente
          setTimeout(tryRun, 0);
        }
      }
    };
    
    tryRun();
  });
}

