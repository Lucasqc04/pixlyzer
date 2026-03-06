'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useErpData } from '@/components/erp/useErpData';
import { DataTable } from '@/components/erp/DataTable';
import { EmptyState, PageHeader, TableToolbar } from '@/components/erp/shared';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Vendors() {
  const { data, loading, refresh } = useErpData();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const sales = data?.sales || [];

  const rows = useMemo(
    () =>
      (data?.sellers || [])
        .filter((v: any) => !q || v.name.toLowerCase().includes(q.toLowerCase()))
        .map((v: any) => ({
          ...v,
          total: sales.filter((s: any) => s.sellerId === v.id).reduce((a: number, b: any) => a + (b.total - b.discount + b.freight), 0),
          count: sales.filter((s: any) => s.sellerId === v.id).length,
        })),
    [data, q, sales]
  );

  const setQ = (v: string) => {
    const n = new URLSearchParams(params.toString());
    if (v) n.set('q', v); else n.delete('q');
    router.replace(`/dashboard/vendors?${n}`);
  };

  const archive = async (id: string) => {
    if (!window.confirm('Inativar vendedor?')) return;
    const r = await fetch(`/api/v1/erp/sellers/${id}`, { method: 'DELETE' });
    if (!r.ok) return toast.error('Falha ao inativar vendedor');
    toast.success('Vendedor arquivado');
    refresh();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Vendedores" subtitle="Equipe comercial e comissão." actions={<Link href="/dashboard/vendors/new"><Button><Plus className="mr-1 h-4 w-4" />Novo vendedor</Button></Link>} />
      <TableToolbar><Input className="sm:max-w-xs" placeholder="Buscar vendedor" value={q} onChange={(e) => setQ(e.target.value)} /></TableToolbar>
      <DataTable
        rows={rows}
        loading={loading}
        emptyState={<EmptyState title="Sem vendedores" description="Cadastre sua equipe comercial." action={<Link href="/dashboard/vendors/new"><Button>Cadastrar vendedor</Button></Link>} />}
        columns={[
          { key: 'name', label: 'Nome', render: (r: any) => <Link href={`/dashboard/vendors/${r.id}`} className="font-medium text-blue-700 hover:underline">{r.name}</Link> },
          { key: 'phone', label: 'Telefone' },
          { key: 'email', label: 'Email' },
          { key: 'commissionRate', label: 'Comissão %', render: (r: any) => r.commissionRate ?? '-' },
          { key: 'count', label: '# vendas' },
          { key: 'total', label: 'Total vendido', render: (r: any) => formatCurrency(r.total) },
          { key: 'active', label: 'Status', render: (r: any) => <Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Ativo' : 'Inativo'}</Badge> },
          { key: 'actions', label: 'Ações', render: (r: any) => <Button size="sm" variant="danger" onClick={() => archive(r.id)}>Arquivar</Button> },
        ]}
      />
    </div>
  );
}
