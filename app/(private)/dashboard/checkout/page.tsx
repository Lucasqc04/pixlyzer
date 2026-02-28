'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Copy, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface PaymentData {
  paymentId: string;
  status: string;
  amount: number;
  qrCodeUrl?: string;
  qrCopyPaste?: string;
}

const planPrices: Record<string, number> = {
  pro: 29.9,
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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCount = useRef(0);

  useEffect(() => {
    createPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling automático
  useEffect(() => {
    if (!paymentData?.paymentId || paid) return;
    pollingRef.current && clearInterval(pollingRef.current);
    pollingCount.current = 0;
    pollingRef.current = setInterval(() => {
      pollingCount.current++;
      checkPaymentStatus();
      if (pollingCount.current >= 20) {
        clearInterval(pollingRef.current!);
      }
    }, 30000); // 30 segundos
    return () => {
      pollingRef.current && clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData?.paymentId]);
  const checkPaymentStatus = async () => {
    if (!paymentData?.paymentId) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/v1/payments/status?id=${paymentData.paymentId}`);
      const data = await res.json();
      if (data.success && data.data.status === 'APPROVED') {
        setPaid(true);
        // Redireciona ou mostra mensagem de sucesso
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (e) {
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
      <div className="flex items-center justify-center min-h-screen">
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
      <div className="max-w-md mx-auto space-y-4">
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
    <div className="max-w-md mx-auto space-y-4">
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
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            PIX Gerado com Sucesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
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

          {/* QR Code */}
          {paymentData?.qrCodeUrl && (
            <div className="flex justify-center p-4 border rounded-lg bg-white">
              <img
                src={paymentData.qrCodeUrl}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
          )}

          {/* Instructions */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Escaneie o QR Code acima com seu aplicativo bancário ou use o código copia e cola abaixo.
            </AlertDescription>
          </Alert>

          {/* Copy Paste */}
          {paymentData?.qrCopyPaste && (
            <div className="space-y-3">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-2">PIX Copia e Cola:</p>
                <code className="text-xs break-all text-gray-900 select-all">
                  {paymentData.qrCopyPaste}
                </code>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copiado!' : 'Copiar Código'}
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="space-y-2 text-sm text-gray-600">
            {paid ? (
              <p className="text-green-700 font-bold">Pagamento confirmado! Redirecionando...</p>
            ) : (
              <>
                <p>✓ Você será redirecionado automaticamente após o pagamento ser confirmado</p>
                <p>✓ Pode levar alguns segundos para processar</p>
                <p>✓ Não feche esta página até confirmar o pagamento</p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={checkPaymentStatus}
              disabled={checking || paid}
            >
              {checking ? 'Verificando...' : 'Já paguei, verificar agora'}
            </Button>
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
              variant="secondary"
            >
              Ir para Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/dashboard/upgrade')}
            >
              Ver Outros Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
