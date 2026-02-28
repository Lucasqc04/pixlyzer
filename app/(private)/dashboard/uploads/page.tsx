'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FileText, ArrowLeft, Download, Eye, Edit2, SlidersHorizontal } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import ImageViewer from '@/components/ImageViewer';
import UploadDetailModal from '@/components/UploadDetailModal';
import { exportToXLSX, exportToJSON, exportToPDF } from '@/lib/utils/exportUtils';
import { exportImagesZip } from '@/lib/utils/exportImagesZip';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend
} from '@/components/Charts';

const ALL_FIELDS = [
  { key: 'data', label: 'Data' },
  { key: 'valor', label: 'Valor' },
  { key: 'banco', label: 'Banco' },
  { key: 'pagador', label: 'Pagador' },
  { key: 'recebedor', label: 'Recebedor' },
  { key: 'txId', label: 'ID Transação' },
  { key: 'fileName', label: 'Arquivo' },
  { key: 'createdAt', label: 'Data do Upload' },
];

interface Upload {
  id: string;
  valor: number | null;
  data: string | null;
  banco: string | null;
  pagador: string | null;
  recebedor: string | null;
  txId: string | null;
  fileName: string | null;
  imageData: string | null;
  createdAt: string;
}

interface Summary {
  totalValor: number;
  totalUploads: number;
  byBanco: Record<string, { count: number; total: number }>;
}

function groupBy<T, K extends string|number>(arr: T[], key: (item: T) => K) {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFields, setExportFields] = useState<string[]>(ALL_FIELDS.map(f => f.key).filter(f => f !== 'imageData'));
  const [exportType, setExportType] = useState<'csv'|'xlsx'|'json'|'pdf'>('csv');
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => [startOfMonth(new Date()), endOfMonth(new Date())]);

  const PERIODS = [
    { key: 'day', label: 'Dia', getRange: () => [startOfDay(new Date()), endOfDay(new Date())] as [Date, Date] },
    { key: 'week', label: 'Semana', getRange: () => [startOfWeek(new Date()), endOfWeek(new Date())] as [Date, Date] },
    { key: 'month', label: 'Mês', getRange: () => [startOfMonth(new Date()), endOfMonth(new Date())] as [Date, Date] },
    { key: 'year', label: 'Ano', getRange: () => [startOfYear(new Date()), endOfYear(new Date())] as [Date, Date] },
    { key: 'all', label: 'Tudo', getRange: () => [new Date(2000,0,1), new Date(2100,0,1)] as [Date, Date] },
  ];

  useEffect(() => {
    const p = PERIODS.find(p => p.key === period) || PERIODS[2];
    setDateRange(p.getRange());
  }, [period]);

  useEffect(() => {
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtragem e agrupamentos para gráficos
  const uploadsInPeriod = uploads.filter(u => {
    if (!u.data) return false;
    const d = new Date(u.data);
    return d >= dateRange[0] && d <= dateRange[1];
  });

  // Séries para gráficos
  const uploadsByDay = Object.entries(groupBy(uploadsInPeriod, u => u.data ? format(new Date(u.data), 'yyyy-MM-dd') : ''))
    .map(([date, arr]) => ({ date, count: arr.length }));

  const valorByDay = Object.entries(groupBy(uploadsInPeriod, u => u.data ? format(new Date(u.data), 'yyyy-MM-dd') : ''))
    .map(([date, arr]) => ({ date, valor: arr.reduce((sum, u) => sum + (u.valor || 0), 0) }));

  const byBanco = Object.entries(groupBy(uploadsInPeriod, u => u.banco || 'Desconhecido'))
    .map(([banco, arr]) => ({ banco, count: arr.length, valor: arr.reduce((sum, u) => sum + (u.valor || 0), 0) }));

  const byPagador = Object.entries(groupBy(uploadsInPeriod, u => u.pagador || 'Desconhecido'))
    .map(([pagador, arr]) => ({ pagador, count: arr.length, valor: arr.reduce((sum, u) => sum + (u.valor || 0), 0) }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const ticketMedioByDay = Object.entries(groupBy(uploadsInPeriod, u => u.data ? format(new Date(u.data), 'yyyy-MM-dd') : ''))
    .map(([date, arr]) => ({ date, ticket: arr.length ? arr.reduce((sum, u) => sum + (u.valor || 0), 0) / arr.length : 0 }));

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

  const handleViewImage = (upload: Upload) => {
    setSelectedUpload(upload);
    setSelectedImageSrc(upload.imageData || upload.fileName || '');
    setIsImageViewerOpen(true);
  };

  const handleEditClick = (upload: Upload) => {
    setSelectedUpload(upload);
    setIsDetailModalOpen(true);
  };

  const handleSaveChanges = async (id: string, data: Partial<Upload>) => {
    try {
      const response = await fetch(`/api/uploads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchUploads();
        alert('Comprovante atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar comprovante');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Erro ao salvar alterações');
    }
  };

  const handleExport = async () => {
    const data = uploads.map(u => {
      const obj: any = {};
      exportFields.forEach(f => obj[f] = u[f as keyof Upload]);
      return obj;
    });
    if (exportType === 'csv') {
      // CSV manual
      const headers = exportFields.map(f => ALL_FIELDS.find(ff => ff.key === f)?.label || f);
      const rows = data.map(row => exportFields.map(f => row[f] ?? ''));
      const csv = [headers, ...rows].map(r => r.map(val => String(val).replaceAll('"','""')).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixlyzer-uploads-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (exportType === 'xlsx') {
      exportToXLSX(data, exportFields);
    } else if (exportType === 'json') {
      exportToJSON(data, exportFields);
    } else if (exportType === 'pdf') {
      await exportToPDF(uploads, exportFields);
    }
    setExportModalOpen(false);
  };

  const handleExportImagesZip = async () => {
    // Gera nomes personalizados: valor_pagador_data.jpg
    const imgs = uploads.map(u => {
      let valor = u.valor ? String(u.valor).replace(/[^0-9.,]/g, '') : 'valor';
      let pagador = u.pagador ? u.pagador.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20) : 'pagador';
      let data = u.data ? format(new Date(u.data), 'yyyyMMdd') : 'data';
      let fileName = `${valor}_${pagador}_${data}.jpg`;
      return { ...u, fileName };
    });
    await exportImagesZip(imgs);
  };

  const filteredUploads = uploads.filter(
    (upload) =>
      upload.pagador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.recebedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.banco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.txId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportModalJSX = exportModalOpen && (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" /> Exportar comprovantes
        </h2>
        <div className="mb-4">
          <div className="font-medium mb-2">Campos a exportar:</div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FIELDS.filter(f => f.key !== 'imageData').map(f => (
              <label key={f.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportFields.includes(f.key)}
                  onChange={e => {
                    if (e.target.checked) setExportFields([...exportFields, f.key]);
                    else setExportFields(exportFields.filter(k => k !== f.key));
                  }}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="font-medium mb-2">Formato:</div>
          <div className="flex gap-2">
            <button onClick={() => setExportType('csv')} className={`px-3 py-1 rounded ${exportType==='csv'?'bg-blue-600 text-white':'bg-gray-100'}`}>CSV</button>
            <button onClick={() => setExportType('xlsx')} className={`px-3 py-1 rounded ${exportType==='xlsx'?'bg-blue-600 text-white':'bg-gray-100'}`}>XLSX</button>
            <button onClick={() => setExportType('json')} className={`px-3 py-1 rounded ${exportType==='json'?'bg-blue-600 text-white':'bg-gray-100'}`}>JSON</button>
            <button onClick={() => setExportType('pdf')} className={`px-3 py-1 rounded ${exportType==='pdf'?'bg-blue-600 text-white':'bg-gray-100'}`}>PDF</button>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={()=>setExportModalOpen(false)}>Cancelar</Button>
          <Button onClick={()=>handleExport()}>Exportar</Button>
        </div>
      </div>
    </div>
  );

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
        <div className="flex gap-2">
          <Button onClick={()=>setExportModalOpen(true)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={handleExportImagesZip} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Imagens (ZIP)
          </Button>
        </div>
        {exportModalJSX}
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

      {/* Filtros de período */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="font-medium">Período:</span>
        {PERIODS.map(p => (
          <Button key={p.key} variant={period===p.key?'default':'outline'} size="sm" onClick={()=>setPeriod(p.key)}>{p.label}</Button>
        ))}
      </div>

      {/* Gráficos do dashboard */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Comprovantes por dia */}
        <Card>
          <CardHeader><CardTitle>Comprovantes por Dia</CardTitle></CardHeader>
          <CardContent style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uploadsByDay} >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d=>format(new Date(d), 'dd/MM')} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Valor por dia */}
        <Card>
          <CardHeader><CardTitle>Valor Total por Dia</CardTitle></CardHeader>
          <CardContent style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valorByDay} >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d=>format(new Date(d), 'dd/MM')} />
                <YAxis />
                <Tooltip formatter={v=>formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Por banco */}
        <Card>
          <CardHeader><CardTitle>Comprovantes por Banco</CardTitle></CardHeader>
          <CardContent style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byBanco} dataKey="count" nameKey="banco" cx="50%" cy="50%" outerRadius={80} label>
                  {byBanco.map((entry, idx) => <Cell key={entry.banco} fill={["#2563eb","#22c55e","#f59e42","#ef4444","#a21caf","#0ea5e9"][idx%6]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Por pagador */}
        <Card>
          <CardHeader><CardTitle>Top Pagadores</CardTitle></CardHeader>
          <CardContent style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPagador} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="pagador" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#a21caf" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Ticket médio por dia */}
        <Card>
          <CardHeader><CardTitle>Ticket Médio por Dia</CardTitle></CardHeader>
          <CardContent style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ticketMedioByDay} >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d=>format(new Date(d), 'dd/MM')} />
                <YAxis />
                <Tooltip formatter={v=>formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="ticket" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
                    <th className="text-center py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUploads.map((upload) => {
                    const isMissing = !upload.valor || !upload.data || !upload.pagador || !upload.recebedor || !upload.banco;
                    return (
                      <tr key={upload.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {upload.data ? formatDate(upload.data) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {upload.valor ? (
                            <span className="font-medium">
                              {formatCurrency(upload.valor)}
                            </span>
                          ) : (
                            <span className={isMissing ? 'text-yellow-600 font-medium' : ''}>-</span>
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
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewImage(upload)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={isMissing ? 'default' : 'outline'}
                              onClick={() => handleEditClick(upload)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Image Viewer Modal */}
      <ImageViewer
        isOpen={isImageViewerOpen}
        imageData={selectedUpload?.imageData || undefined}
        src={selectedImageSrc}
        alt={selectedUpload?.fileName || 'Comprovante'}
        onClose={() => setIsImageViewerOpen(false)}
      />

      {/* Edit Detail Modal */}
      <UploadDetailModal
        isOpen={isDetailModalOpen}
        upload={selectedUpload}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={handleSaveChanges}
      />
    </div>
  );
}
