'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useErpData } from '@/components/erp/useErpData';
import { EmptyState, PageHeader, TableToolbar } from '@/components/erp/shared';
import { formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/erp/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProductsPage() {
  const { data, loading, refresh } = useErpData();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const low = params.get('low') === '1';

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    router.replace(`/dashboard/products?${n.toString()}`);
  };

  const rows = useMemo(
    () =>
      (data?.products || []).filter(
        (p: any) =>
          (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase())) &&
          (!low || p.stock <= p.minStock)
      ),
    [data, q, low]
  );

  const archive = async (id: string) => {
    if (!window.confirm('Inativar produto?')) return;
    const res = await fetch(`/api/v1/erp/products/${id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Falha ao inativar produto');
    toast.success('Produto arquivado com sucesso');
    refresh();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Produtos"
        subtitle="Catálogo, custo, estoque e status."
        actions={
          <Link href="/dashboard/products/new"><Button><Plus className="mr-1 h-4 w-4" />Novo produto</Button></Link>
        }
      />

      <TableToolbar>
        <Input value={q} onChange={(e) => setParam('q', e.target.value)} className="sm:max-w-xs" placeholder="Buscar por nome ou SKU" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={low} onChange={(e) => setParam('low', e.target.checked ? '1' : '')} />
          Apenas estoque baixo
        </label>
      </TableToolbar>

      <DataTable
        rows={rows}
        loading={loading}
        emptyState={
          <EmptyState
            title="Sem produtos cadastrados"
            description="Cadastre seu primeiro produto para iniciar o controle de estoque."
            action={<Link href="/dashboard/products/new"><Button>Cadastrar primeiro produto</Button></Link>}
          />
        }
        columns={[
          { key: 'name', label: 'Nome', render: (r: any) => <Link className="font-medium text-blue-700 hover:underline" href={`/dashboard/products/${r.id}`}>{r.name}</Link> },
          { key: 'sku', label: 'SKU' },
          { key: 'category', label: 'Categoria' },
          { key: 'price', label: 'Preço', render: (r: any) => formatCurrency(r.price) },
          { key: 'stock', label: 'Estoque' },
          { key: 'active', label: 'Status', render: (r: any) => <Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Ativo' : 'Inativo'}</Badge> },
          {
            key: 'actions',
            label: 'Ações',
            render: (r: any) => (
              <div className="flex gap-2">
                <Link href={`/dashboard/products/${r.id}`}><Button size="sm" variant="outline">Editar</Button></Link>
                <Button size="sm" variant="danger" onClick={() => archive(r.id)}>Arquivar</Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
