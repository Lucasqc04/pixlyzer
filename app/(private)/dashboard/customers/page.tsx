'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useErpData } from '@/components/erp/useErpData';
import { DataTable } from '@/components/erp/DataTable';
import { EmptyState, PageHeader, TableToolbar } from '@/components/erp/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Customers() {
  const { data, loading, refresh } = useErpData();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';

  const rows = useMemo(
    () => (data?.customers || []).filter((c: any) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || String(c.phone || '').includes(q)),
    [data, q]
  );

  const setQ = (v: string) => {
    const n = new URLSearchParams(params.toString());
    if (v) n.set('q', v); else n.delete('q');
    router.replace(`/dashboard/customers?${n}`);
  };

  const archive = async (id: string) => {
    if (!window.confirm('Inativar cliente?')) return;
    const r = await fetch(`/api/v1/erp/customers/${id}`, { method: 'DELETE' });
    if (!r.ok) return toast.error('Falha ao inativar cliente');
    toast.success('Cliente arquivado');
    refresh();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" subtitle="Base de relacionamento e histórico." actions={<Button asChild><Link href="/dashboard/customers/new"><Plus className="mr-1 h-4 w-4" />Novo cliente</Link></Button>} />
      <TableToolbar><Input className="sm:max-w-xs" placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} /></TableToolbar>
      <DataTable
        rows={rows}
        loading={loading}
        emptyState={<EmptyState title="Sem clientes" description="Adicione seu primeiro cliente para iniciar a operação." action={<Button asChild><Link href="/dashboard/customers/new">Cadastrar cliente</Link></Button>} />}
        columns={[
          { key: 'name', label: 'Nome', render: (r: any) => <Link className="font-medium text-blue-700 hover:underline" href={`/dashboard/customers/${r.id}`}>{r.name}</Link> },
          { key: 'phone', label: 'Telefone' },
          { key: 'email', label: 'Email' },
          { key: 'document', label: 'Documento' },
          { key: 'city', label: 'Cidade/UF', render: (r: any) => `${r.city || '-'} / ${r.state || '-'}` },
          { key: 'active', label: 'Status', render: (r: any) => <Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Ativo' : 'Inativo'}</Badge> },
          { key: 'actions', label: 'Ações', render: (r: any) => <Button size="sm" variant="danger" onClick={() => archive(r.id)}>Arquivar</Button> },
        ]}
      />
    </div>
  );
}
