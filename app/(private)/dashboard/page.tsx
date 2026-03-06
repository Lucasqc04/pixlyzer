'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, StatCard, EmptyState } from '@/components/erp/shared';
import { useErpData } from '@/components/erp/useErpData';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { dashboard, loading } = useErpData();
  if (loading) return <div className="grid md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-white border rounded-lg animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Executivo" subtitle="KPIs de vendas, financeiro, OCR e estoque." actions={<Link href="/dashboard/sales/new" className="text-sm underline">Nova venda</Link>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Vendas (volume)" value={formatCurrency(dashboard?.metrics?.salesVolume || 0)} />
        <StatCard title="Fluxo líquido" value={formatCurrency(dashboard?.metrics?.netCashflow || 0)} />
        <StatCard title="OCR processados" value={dashboard?.metrics?.ocrCount || 0} helper={`${Math.round((dashboard?.metrics?.reviewRate || 0) * 100)}% revisados`} />
        <StatCard title="Uploads pendentes" value={dashboard?.metrics?.pendingUploads || 0} />
        <StatCard title="Uploads reconciliados" value={dashboard?.metrics?.reconciledUploads || 0} />
      </div>

      <div className='grid lg:grid-cols-2 gap-4'>
        <Card><CardHeader><CardTitle>Top produtos</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'>{dashboard?.topProducts?.length ? dashboard.topProducts.map((p:any)=><div key={p.id} className='border rounded p-2'>{p.name} • estoque {p.stock}</div>) : <EmptyState title='Sem dados' description='Sem produtos suficientes para ranking.'/>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Top clientes</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'>{dashboard?.topCustomers?.length ? dashboard.topCustomers.map((c:any)=><div key={c.id} className='border rounded p-2'>{c.name} • {formatCurrency(c.total||0)}</div>) : <EmptyState title='Sem dados' description='Sem movimentação de clientes.'/ >}</CardContent></Card>
      </div>

      <div className='grid lg:grid-cols-3 gap-4'>
        <Card><CardHeader><CardTitle>Top vendedores</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'>{dashboard?.topSellers?.length ? dashboard.topSellers.map((s:any)=><div key={s.id} className='border rounded p-2'>{s.name} • {formatCurrency(s.total||0)}</div>) : '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>Entradas x Saídas por origem</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'>{dashboard?.bySource?.map((x:any)=><div key={x.source} className='border rounded p-2'>{x.source}: {x.count}</div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Últimos comprovantes OCR</CardTitle></CardHeader><CardContent className='space-y-2 text-sm'>{dashboard?.recentUploads?.length ? dashboard.recentUploads.map((u:any)=><div key={u.id} className='border rounded p-2'>{u.banco||'-'} • {u.valor||0} • {formatDate(u.createdAt)}</div>) : '-'}</CardContent></Card>
      </div>
    </div>
  );
}
