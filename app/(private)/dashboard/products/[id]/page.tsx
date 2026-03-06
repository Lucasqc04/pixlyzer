'use client';
import { useParams, useRouter } from 'next/navigation';
import { useErpData } from '@/components/erp/useErpData';
import { PageHeader, SubmitButton } from '@/components/erp/shared';
import { FormEvent, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useErpData();
  const router = useRouter();
  const p = data?.products?.find((x: any) => x.id === id);
  const [f, setF] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (p) setF({ ...p, price: String(p.price), cost: String(p.cost || 0), stock: String(p.stock), minStock: String(p.minStock || 0) });
    fetch(`/api/v1/erp/activity?entityType=PRODUCT&entityId=${id}`).then((r) => r.json()).then((j) => setTimeline(j.data || []));
  }, [p, id]);

  if (!p || !f) return <div>Carregando...</div>;
  const save = async (e: FormEvent) => { e.preventDefault(); setLoading(true); const r = await fetch(`/api/v1/erp/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, price: Number(f.price), cost: Number(f.cost), stock: Number(f.stock), minStock: Number(f.minStock) }) }); setLoading(false); if (!r.ok) return toast.error('Erro ao atualizar'); toast.success('Produto atualizado'); router.push('/dashboard/products'); };

  return <div className='space-y-4'><PageHeader title={`Editar produto · ${p.name}`} subtitle='Atualize dados e estoque.' /><form onSubmit={save} className='bg-white border rounded p-4 space-y-2'><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input value={f.sku || ''} onChange={(e) => setF({ ...f, sku: e.target.value })} /><div className='grid md:grid-cols-4 gap-2'><Input type='number' value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /><Input type='number' value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /><Input type='number' value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /><Input type='number' value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} /></div><SubmitButton loading={loading}>Salvar alterações</SubmitButton></form><div className="bg-white border rounded p-4"><h3 className="font-medium mb-2">Activity timeline</h3>{timeline.map((t: any) => <div key={t.id} className="text-xs border-b py-1">{new Date(t.createdAt).toLocaleString('pt-BR')} • {t.action}</div>)}</div></div>;
}
