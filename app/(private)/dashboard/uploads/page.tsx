'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FileText, ArrowLeft, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Upload {
  id: string;
  valor: number | null;
  data: string | null;
  banco: string | null;
  pagador: string | null;
  recebedor: string | null;
  txId: string | null;
  fileName: string | null;
  createdAt: string;
}

interface Summary {
  totalValor: number;
  totalUploads: number;
  byBanco: Record<string, { count: number; total: number }>;
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/uploads');
      const data = await response.json();

      if (data.success) {
        setUploads(data.data.uploads);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUploads = uploads.filter(
    (upload) =>
      upload.pagador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.recebedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.banco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.txId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Data', 'Valor', 'Banco', 'Pagador', 'Recebedor', 'ID Transação'];
    const rows = uploads.map((u) => [
      new Date(u.createdAt).toLocaleDateString('pt-BR'),
      u.valor || '',
      u.banco || '',
      u.pagador || '',
      u.recebedor || '',
      u.txId || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixlyzer-uploads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Todos os Uploads</h1>
            <p className="text-gray-600">
              {summary?.totalUploads} comprovantes processados
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Processado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalValor)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalUploads}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bancos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {Object.keys(summary.byBanco).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por pagador, recebedor, banco ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Uploads Table */}
      <Card>
        <CardContent className="p-0">
          {filteredUploads.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum upload ainda'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Data</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Banco</th>
                    <th className="text-left py-3 px-4">Pagador</th>
                    <th className="text-left py-3 px-4">Recebedor</th>
                    <th className="text-left py-3 px-4">ID Transação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUploads.map((upload) => (
                    <tr key={upload.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {formatDate(upload.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {upload.valor ? (
                          <span className="font-medium">
                            {formatCurrency(upload.valor)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">{upload.banco || '-'}</td>
                      <td className="py-3 px-4">{upload.pagador || '-'}</td>
                      <td className="py-3 px-4">{upload.recebedor || '-'}</td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {upload.txId || '-'}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banks Summary */}
      {summary && Object.keys(summary.byBanco).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Banco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(summary.byBanco).map(([banco, data]) => (
                <div key={banco} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{banco}</p>
                  <p className="text-sm text-gray-500">
                    {data.count} transações · {formatCurrency(data.total)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
