'use client';
import Link from 'next/link';import { useMemo } from 'react';import { useRouter, useSearchParams } from 'next/navigation';import toast from 'react-hot-toast';import { useErpData } from '@/components/erp/useErpData';import { PageHeader, EmptyState } from '@/components/erp/shared';import { formatCurrency, formatDate } from '@/lib/utils';import { DataTable } from '@/components/erp/DataTable';

export default function SalesPage() {
  const { data, loading, refresh } = useErpData(); const router = useRouter(); const params = useSearchParams();
  const q = params.get('q') || ''; const status = params.get('status') || '';
  const setParam=(k:string,v:string)=>{const n=new URLSearchParams(params.toString());v?n.set(k,v):n.delete(k);router.replace(`/dashboard/sales?${n}`)};
  const sales = useMemo(() => (data?.sales || []).filter((s: any) => (!q || (s.customer?.name || '').toLowerCase().includes(q.toLowerCase()) || s.id.includes(q)) && (!status || s.status === status)), [data, q, status]);
  const cancel = async (id: string) => { if (!confirm('Cancelar venda?')) return; const res = await fetch(`/api/v1/erp/sales/${id}`, { method: 'DELETE' }); if (!res.ok) return toast.error('Erro ao cancelar'); toast.success('Venda cancelada'); refresh(); };
  return <div className="space-y-4">
    <PageHeader title="Vendas" subtitle="Listagem operacional com filtros e ações." actions={<Link className="underline text-sm" href="/dashboard/sales/new">Nova venda</Link>} />
    <div className='flex gap-2'><input className='border rounded h-9 px-3' placeholder='Buscar por ID/cliente' value={q} onChange={e=>setParam('q',e.target.value)} /><select className='border rounded h-9 px-2' value={status} onChange={e=>setParam('status',e.target.value)}><option value=''>Todos status</option><option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option></select></div>
    {loading ? <div className="h-40 bg-white border rounded animate-pulse" /> : !sales.length ? <EmptyState title="Nenhuma venda" description="Cadastre sua primeira venda manual ou por OCR." /> :
      <DataTable rows={sales} columns={[
        { key:'id',label:'ID',render:(s:any)=><Link href={`/dashboard/sales/${s.id}`} className='underline'>{s.id.slice(0,8)}</Link> },
        { key:'customer',label:'Cliente',render:(s:any)=>s.customer?.name||'-' },{ key:'seller',label:'Vendedor',render:(s:any)=>s.seller?.name||'-' },
        { key:'total',label:'Valor',render:(s:any)=>formatCurrency(s.total-s.discount+s.freight) },{ key:'status',label:'Status' },{ key:'paymentMethod',label:'Pagamento',render:(s:any)=>s.paymentMethod||'-' },
        { key:'saleDate',label:'Data',render:(s:any)=>formatDate(s.saleDate) },
        { key:'actions',label:'Ações',render:(s:any)=><div className='flex gap-2'><Link className='underline' href={`/dashboard/sales/${s.id}`}>Editar</Link><button className='underline text-red-600' onClick={()=>cancel(s.id)}>Cancelar</button></div> }
      ]} />}
  </div>;
}
