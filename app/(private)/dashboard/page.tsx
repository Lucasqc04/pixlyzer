'use client';

import Link from 'next/link';
import { AlertCircle, ArrowUpRight, Boxes, FileSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, PageSkeleton, StatCard } from '@/components/erp/shared';
import { useErpData } from '@/components/erp/useErpData';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { dashboard, loading } = useErpData();

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Executivo"
        subtitle="KPIs de vendas, financeiro, OCR e estoque em um só lugar."
        actions={
          <Button asChild>
            <Link href="/dashboard/sales/new">Nova venda</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Vendas (volume)" value={formatCurrency(dashboard?.metrics?.salesVolume || 0)} />
        <StatCard title="Fluxo líquido" value={formatCurrency(dashboard?.metrics?.netCashflow || 0)} />
        <StatCard title="OCR processados" value={dashboard?.metrics?.ocrCount || 0} helper={`${Math.round((dashboard?.metrics?.reviewRate || 0) * 100)}% revisados`} />
        <StatCard title="Uploads pendentes" value={dashboard?.metrics?.pendingUploads || 0} />
        <StatCard title="Uploads reconciliados" value={dashboard?.metrics?.reconciledUploads || 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top produtos</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard?.topProducts?.length ? (
              dashboard.topProducts.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-3 hover:bg-slate-50">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Estoque: {p.stock}</p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sem produtos suficientes"
                description="Cadastre produtos e realize vendas para gerar ranking."
                action={<Button asChild size="sm"><Link href="/dashboard/products/new">Cadastrar produto</Link></Button>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top clientes</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard?.topCustomers?.length ? (
              dashboard.topCustomers.map((c: any) => (
                <div key={c.id} className="rounded-lg border p-3 hover:bg-slate-50">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(c.total || 0)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Sem movimentação" description="Ainda não há dados de clientes para exibir." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Top vendedores</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard?.topSellers?.length ? dashboard.topSellers.map((s: any) => (
              <div key={s.id} className="rounded-lg border p-3">{s.name} • {formatCurrency(s.total || 0)}</div>
            )) : <EmptyState title="Sem vendas por vendedor" description="Quando houver vendas, esta seção será populada." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Entradas x Saídas por origem</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard?.bySource?.length ? dashboard.bySource.map((x: any) => (
              <div key={x.source} className="rounded-lg border p-3">{x.source}: {x.count}</div>
            )) : <EmptyState title="Sem dados financeiros" description="Crie transações para visualizar este painel." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos comprovantes OCR</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard?.recentUploads?.length ? dashboard.recentUploads.map((u: any) => (
              <div key={u.id} className="rounded-lg border p-3">
                <p className="font-medium">{u.banco || 'Banco não identificado'}</p>
                <p className="text-xs text-muted-foreground">{u.valor || 0} • {formatDate(u.createdAt)}</p>
              </div>
            )) : (
              <EmptyState
                icon={<AlertCircle className="h-5 w-5" />}
                title="Sem comprovantes"
                description="Comece enviando seu primeiro comprovante PIX."
                action={<Button asChild size="sm"><Link href="/dashboard/upload">Enviar comprovante</Link></Button>}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
