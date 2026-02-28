'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  TrendingUp,
  CreditCard,
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Stats {
  totalUploads: number;
  totalValor: number;
  currentMonthUploads: number;
  currentMonthValor: number;
  plan: string;
  monthlyLimit: number;
  currentUsage: number;
  remaining: number;
}

interface Upload {
  id: string;
  valor: number | null;
  data: string | null;
  banco: string | null;
  pagador: string | null;
  recebedor: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showUpgrade = searchParams.get('upgrade') === 'true';

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUploads, setRecentUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showUpgrade) {
      handleUpgrade();
    }
  }, [showUpgrade]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/v1/usage');
      const data = await response.json();

      if (data.success) {
        setStats(data.data.stats);
        setRecentUploads(data.data.recentUploads);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setCreatingPayment(true);
    try {
      const response = await fetch('/api/v1/payments/create-pro', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setPaymentData(data.data);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setCreatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const usagePercentage = stats
    ? (stats.currentUsage / stats.monthlyLimit) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Visão geral dos seus comprovantes PIX
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Novo Upload
          </Button>
        </Link>
      </div>

      {/* Plan Alert */}
      {stats?.plan === 'FREE' && usagePercentage >= 80 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Zap className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Você está próximo do limite do plano FREE. Faça upgrade para continuar usando.
            </span>
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={creatingPayment}
            >
              {creatingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Upgrade PRO'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Upload className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUploads || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.currentMonthUploads || 0} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalValor || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {formatCurrency(stats?.currentMonthValor || 0)} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plano</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats?.plan}</span>
              {stats?.plan === 'PRO' && (
                <Badge className="bg-blue-500">PRO</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.plan === 'FREE' ? '10 OCR/mês' : '500 OCR/mês'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso Mensal</CardTitle>
            <Zap className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.currentUsage || 0} / {stats?.monthlyLimit || 10}
            </div>
            <Progress value={usagePercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Uploads Recentes</CardTitle>
            <Link href="/dashboard/uploads">
              <Button variant="ghost" size="sm" className="gap-2">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentUploads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum upload ainda</p>
              <Link href="/dashboard/upload">
                <Button variant="outline" className="mt-4">
                  Fazer primeiro upload
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Data</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Banco</th>
                    <th className="text-left py-3 px-4">Pagador</th>
                    <th className="text-left py-3 px-4">Recebedor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploads.map((upload) => (
                    <tr key={upload.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {formatDate(upload.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {upload.valor ? formatCurrency(upload.valor) : '-'}
                      </td>
                      <td className="py-3 px-4">{upload.banco || '-'}</td>
                      <td className="py-3 px-4">{upload.pagador || '-'}</td>
                      <td className="py-3 px-4">{upload.recebedor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Pagamento Criado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Escaneie o QR Code abaixo com seu aplicativo bancário para completar o pagamento.
              </p>

              {paymentData.qrCodeUrl && (
                <div className="flex justify-center">
                  <img
                    src={paymentData.qrCodeUrl}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}

              {paymentData.qrCopyPaste && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Pix Copia e Cola:</p>
                  <code className="text-xs break-all">{paymentData.qrCopyPaste}</code>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Fechar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => router.push('/dashboard/payments')}
                >
                  Ver Pagamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
