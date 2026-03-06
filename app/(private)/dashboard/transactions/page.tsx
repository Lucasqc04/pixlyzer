'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useErpData } from '@/components/erp/useErpData';
import { DataTable } from '@/components/erp/DataTable';
import { EmptyState, PageHeader, SubmitButton, TableToolbar } from '@/components/erp/shared';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Transactions() {
  const { data, refresh, loading } = useErpData();
  const params = useSearchParams();
  const router = useRouter();
  const [f, setF] = useState({ kind: 'INCOME', description: '', amount: '', category: '', status: 'CONFIRMED', notes: '', paidAt: '' });
  const [saving, setSaving] = useState(false);
  const type = params.get('type') || '';
  const q = params.get('q') || '';

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params.toString());
    if (v) n.set(k, v); else n.delete(k);
    router.replace(`/dashboard/transactions?${n}`);
  };

  const rows = useMemo(
    () =>
      (data?.transactions || []).filter(
        (t: any) => (!type || t.kind === type) && (!q || t.description.toLowerCase().includes(q.toLowerCase()) || String(t.category || '').toLowerCase().includes(q.toLowerCase()))
      ),
    [data, type, q]
  );

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await fetch('/api/v1/erp/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, amount: Number(f.amount.replace(',', '.')) || 0, paidAt: f.paidAt ? new Date(f.paidAt).toISOString() : undefined }),
    });
    setSaving(false);
    if (!r.ok) return toast.error('Falha ao salvar transação');
    toast.success('Transação criada com sucesso');
    setF({ kind: 'INCOME', description: '', amount: '', category: '', status: 'CONFIRMED', notes: '', paidAt: '' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Transações financeiras" subtitle="Entradas e saídas manuais, por vendas e OCR." />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={save} className="grid items-end gap-3 md:grid-cols-4">
            <select className="h-10 rounded-md border px-3" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
            <Input required placeholder="Descrição da transação" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <NumberInput placeholder="Valor (ex: 150,00)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            <Input placeholder="Categoria" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
            <Input type="date" value={f.paidAt} onChange={(e) => setF({ ...f, paidAt: e.target.value })} />
            <Input placeholder="Observação" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            <select className="h-10 rounded-md border px-3" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option>
            </select>
            <SubmitButton loading={saving} className="w-full">Criar transação</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <TableToolbar>
        <Input className="sm:max-w-xs" placeholder="Buscar descrição/categoria" value={q} onChange={(e) => setParam('q', e.target.value)} />
        <select className="h-10 rounded-md border px-3" value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">Todos tipos</option><option value="INCOME">Entrada</option><option value="EXPENSE">Saída</option>
        </select>
      </TableToolbar>

      <DataTable
        rows={rows}
        loading={loading}
        emptyState={<EmptyState title="Sem transações" description="Crie sua primeira transação para acompanhar o fluxo financeiro." action={<Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Criar transação</Button>} />}
        columns={[
          { key: 'kind', label: 'Tipo' },
          { key: 'source', label: 'Origem' },
          { key: 'category', label: 'Categoria' },
          { key: 'description', label: 'Descrição' },
          { key: 'amount', label: 'Valor', render: (t: any) => formatCurrency(t.amount) },
          { key: 'status', label: 'Status' },
          { key: 'paidAt', label: 'Data', render: (t: any) => formatDate(t.paidAt) },
        ]}
      />
    </div>
  );
}
