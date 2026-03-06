'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Copy, Loader2, AlertCircle, ArrowLeft, Clock3 } from 'lucide-react';

interface PaymentData {
  paymentId: string;
  status: string;
  amount: number;
  qrCodeUrl?: string;
  qrCopyPaste?: string;
  expiresAt?: string;
}

const planPrices: Record<string, number> = {
  pro: 29.9,
};

const PAYMENT_WINDOW_SECONDS = 10 * 60;

const formatRemainingTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_WINDOW_SECONDS);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isExpired = !paid && remainingSeconds <= 0;

  useEffect(() => {
    createPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!paymentData?.expiresAt || paid) return;

    const expiresAt = new Date(paymentData.expiresAt).getTime();
    const updateRemaining = () => {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
    };

    updateRemaining();
    const countdownInterval = setInterval(updateRemaining, 1000);

    return () => clearInterval(countdownInterval);
  }, [paymentData?.expiresAt, paid]);

  // Polling automático
  useEffect(() => {
    if (!paymentData?.paymentId || paid || isExpired) return;

    pollingRef.current && clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 10000);

    return () => {
      pollingRef.current && clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData?.paymentId, paid, isExpired]);

  const checkPaymentStatus = async () => {
    if (!paymentData?.paymentId || isExpired) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/v1/payments/status?id=${paymentData.paymentId}`);
      const data = await res.json();

      if (data.success && data.data.status === 'APPROVED') {
        setPaid(true);
        setTimeout(() => router.push('/dashboard'), 2000);
      }

      if (data.success && data.data.expired) {
        setRemainingSeconds(0);
      }
    } catch {
      // Ignora erro de polling
    } finally {
      setChecking(false);
    }
  };

  const createPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/payments/create-pro', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao criar pagamento');
      }

      setPaymentData(data.data);
      setRemainingSeconds(PAYMENT_WINDOW_SECONDS);
      setPaid(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar PIX. Tente novamente.');
      console.error('Error creating payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (paymentData?.qrCopyPaste) {
      await navigator.clipboard.writeText(paymentData.qrCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Gerando QR Code do PIX...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto space-y-4 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push('/dashboard/upgrade')}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Planos
        </Button>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-left text-red-800">Erro ao Processar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button className="w-full" onClick={createPayment}>
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/upgrade')}
              >
                Escolher Outro Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/dashboard/upgrade')}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Planos
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              PIX Gerado com Sucesso
            </span>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                isExpired
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Clock3 className="h-4 w-4" />
              {isExpired
                ? 'PIX expirado'
                : `Pague em ${formatRemainingTime(remainingSeconds)}`}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6 lg:grid-cols-2 lg:gap-8 items-start">
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 md:p-6 flex justify-center">
              {paymentData?.qrCopyPaste ? (
                <QRCodeSVG
                  value={paymentData.qrCopyPaste}
                  size={260}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#111827"
                  imageSettings={{
                    src: '/logo.png',
                    height: 52,
                    width: 52,
                    excavate: true,
                  }}
                />
              ) : paymentData?.qrCodeUrl ? (
                <img src={paymentData.qrCodeUrl} alt="QR Code PIX" className="h-[260px] w-[260px]" />
              ) : null}
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Escaneie o QR Code com seu app bancário ou use o PIX Copia e Cola.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600">Plano</p>
                  <p className="text-xl font-bold text-gray-900">PRO</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="text-2xl font-bold text-green-600">R$ {planPrices[plan]?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {paymentData?.qrCopyPaste && (
              <div className="space-y-3">
                <div className="bg-gray-100 p-4 rounded-lg max-h-36 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-600 mb-2">PIX Copia e Cola:</p>
                  <code className="text-xs break-all text-gray-900 select-all">
                    {paymentData.qrCopyPaste}
                  </code>
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copiado!' : 'Copiar Código'}
                </Button>
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-600">
              {paid ? (
                <p className="text-green-700 font-bold">Pagamento confirmado! Redirecionando...</p>
              ) : isExpired ? (
                <>
                  <p className="text-red-600 font-semibold">Este PIX expirou após 10 minutos.</p>
                  <p>Gere um novo código para concluir o upgrade com segurança.</p>
                </>
              ) : (
                <>
                  <p>✓ Você será redirecionado automaticamente após a confirmação</p>
                  <p>✓ O tempo limite para pagamento é de 10 minutos</p>
                  <p>✓ Não feche esta página antes de concluir</p>
                </>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button className="w-full sm:col-span-2" onClick={checkPaymentStatus} disabled={checking || paid || isExpired}>
                {checking ? 'Verificando...' : 'Já paguei, verificar agora'}
              </Button>

              {isExpired ? (
                <Button className="w-full sm:col-span-2" onClick={createPayment}>
                  Gerar novo PIX
                </Button>
              ) : null}

              <Button className="w-full" onClick={() => router.push('/dashboard')} variant="secondary">
                Ir para Dashboard
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/upgrade')}>
                Ver Outros Planos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
