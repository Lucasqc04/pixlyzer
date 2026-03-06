'use client';
import { useParams, useRouter } from 'next/navigation';
import { useErpData } from '@/components/erp/useErpData';
import { PageHeader } from '@/components/erp/shared';
import { formatCurrency } from '@/lib/utils';
import { FormEvent, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useErpData();
  const router = useRouter();
  const sale = data?.sales?.find((s: any) => s.id === id);
  const [f, setF] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (sale) setF({ ...sale, discount: String(sale.discount), freight: String(sale.freight || 0) });
    fetch(`/api/v1/erp/activity?entityType=SALE&entityId=${id}`).then((r) => r.json()).then((j) => setTimeline(j.data || []));
  }, [sale, id]);

  if (!sale || !f) return <div>Venda não encontrada.</div>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/v1/erp/sales/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: f.status, paymentMethod: f.paymentMethod, notes: f.notes, discount: Number(f.discount), freight: Number(f.freight) }) });
    if (!r.ok) return toast.error('Erro ao salvar');
    toast.success('Venda atualizada');
    router.push('/dashboard/sales');
  };

  return <div className="space-y-4"><PageHeader title={`Venda ${sale.id.slice(0, 8)}`} subtitle="Detalhes, itens e status da operação." />
    <div className='bg-white border rounded p-4 text-sm space-y-2'><p>Cliente: {sale.customer?.name || '-'}</p><p>Vendedor: {sale.seller?.name || '-'}</p><p>Origem: {sale.source}</p><p>Total bruto: {formatCurrency(sale.total)}</p>{sale.items?.map((it: any) => <p key={it.id}>• {it.product?.name || it.productId} x{it.quantity} = {formatCurrency(it.subtotal)}</p>)}</div>
    <form onSubmit={save} className='bg-white border rounded p-4 grid md:grid-cols-2 gap-2'><select className='border rounded h-10 px-2' value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option><option>PAID</option><option>UNPAID</option></select><select className='border rounded h-10 px-2' value={f.paymentMethod || ''} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}><option value=''>Pagamento</option><option>PIX</option><option>CARTAO</option><option>DINHEIRO</option></select><Input type='number' value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} placeholder='Desconto' /><Input type='number' value={f.freight} onChange={(e) => setF({ ...f, freight: e.target.value })} placeholder='Frete' /><Input className='md:col-span-2' value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder='Observações' /><Button className='md:col-span-2'>Salvar alterações</Button></form>
    <div className="bg-white border rounded p-4"><h3 className="font-medium mb-2">Activity timeline</h3>{timeline.map((t: any) => <div key={t.id} className="text-xs border-b py-1">{new Date(t.createdAt).toLocaleString('pt-BR')} • {t.action}</div>)}</div>
  </div>;
}
