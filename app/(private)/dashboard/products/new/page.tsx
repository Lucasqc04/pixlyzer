'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PageHeader, SubmitButton } from '@/components/erp/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function NewProductPage() {
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    name: '', sku: '', price: '', cost: '', stock: '', minStock: '', category: '', unit: '', description: '', internalNotes: '', active: true,
  });
  const router = useRouter();

  const toNumber = (v: string) => Number(v.replace(',', '.')) || 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await fetch('/api/v1/erp/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, price: toNumber(f.price), cost: toNumber(f.cost), stock: toNumber(f.stock), minStock: toNumber(f.minStock) }),
    });
    setLoading(false);
    if (!r.ok) return toast.error('Erro ao criar produto');
    toast.success('Produto criado com sucesso');
    router.push('/dashboard/products');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Novo produto" subtitle="Inclua dados comerciais e de estoque com clareza." />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nome *</Label><Input required placeholder="Ex: Refrigerante 2L" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>SKU</Label><Input placeholder="Ex: REF-2L" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Preço de venda</Label><NumberInput placeholder="Ex: 29,90" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Custo</Label><NumberInput placeholder="Ex: 18,00" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></div>
              <div className="space-y-2"><Label>Estoque atual</Label><NumberInput placeholder="Ex: 150" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Estoque mínimo</Label><NumberInput placeholder="Ex: 20" value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} /></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Categoria</Label><Input placeholder="Ex: Bebidas" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unidade</Label><Input placeholder="Ex: UN, KG, CX" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
            </div>

            <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Descrição comercial do produto" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observação interna</Label><Textarea placeholder="Anotações para operação interna" value={f.internalNotes} onChange={(e) => setF({ ...f, internalNotes: e.target.value })} /></div>

            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Produto ativo</label>

            <div className="flex flex-wrap gap-2">
              <SubmitButton loading={loading}>Salvar produto</SubmitButton>
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
