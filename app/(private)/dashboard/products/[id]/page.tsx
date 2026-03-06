'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useErpData } from '@/components/erp/useErpData';
import { PageHeader, SubmitButton, TableSkeleton } from '@/components/erp/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useErpData();
  const router = useRouter();
  const p = data?.products?.find((x: any) => x.id === id);
  const [f, setF] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (p) {
      setF({
        ...p,
        price: p.price ? String(p.price) : '',
        cost: p.cost ? String(p.cost) : '',
        stock: p.stock ? String(p.stock) : '',
        minStock: p.minStock ? String(p.minStock) : '',
      });
    }
    fetch(`/api/v1/erp/activity?entityType=PRODUCT&entityId=${id}`).then((r) => r.json()).then((j) => setTimeline(j.data || []));
  }, [p, id]);

  if (!p || !f) return <TableSkeleton rows={5} />;

  const toNumber = (v: string) => Number((v || '').replace(',', '.')) || 0;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await fetch(`/api/v1/erp/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, price: toNumber(f.price), cost: toNumber(f.cost), stock: toNumber(f.stock), minStock: toNumber(f.minStock) }),
    });
    setLoading(false);
    if (!r.ok) return toast.error('Erro ao atualizar produto');
    toast.success('Produto atualizado com sucesso');
    router.push('/dashboard/products');
  };

  return (
    <div className="space-y-4">
      <PageHeader title={`Editar produto · ${p.name}`} subtitle="Atualize dados, custos e estoque." />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>SKU</Label><Input placeholder="Ex: REF-2L" value={f.sku || ''} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Preço</Label><NumberInput placeholder="Ex: 99,90" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Custo</Label><NumberInput placeholder="Ex: 70,00" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></div>
              <div className="space-y-2"><Label>Estoque</Label><NumberInput placeholder="Ex: 35" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Estoque mínimo</Label><NumberInput placeholder="Ex: 8" value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SubmitButton loading={loading}>Salvar alterações</SubmitButton>
              <Button variant="outline" type="button" onClick={() => router.push('/dashboard/products')}>Voltar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline de atividade</CardTitle></CardHeader>
        <CardContent>
          {timeline.length ? timeline.map((t) => (
            <div key={t.id} className="border-b py-2 text-xs text-muted-foreground last:border-b-0">
              {new Date(t.createdAt).toLocaleString('pt-BR')} • {t.action}
            </div>
          )) : <p className="text-sm text-muted-foreground">Sem atividades registradas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
