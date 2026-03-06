'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useErpData } from '@/components/erp/useErpData';
import { PageHeader, EmptyState } from '@/components/erp/shared';
import { formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/erp/DataTable';

export default function ProductsPage() {
  const { data, loading, refresh } = useErpData();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const low = params.get('low') === '1';
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(params.toString()); v ? n.set(k, v) : n.delete(k); router.replace(`/dashboard/products?${n.toString()}`); };

  const rows = useMemo(() => (data?.products || []).filter((p: any) => (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase())) && (!low || p.stock <= p.minStock)), [data, q, low]);
  const archive = async (id: string) => { if (!confirm('Inativar produto?')) return; const res = await fetch(`/api/v1/erp/products/${id}`, { method: 'DELETE' }); if (!res.ok) return toast.error('Falha ao inativar'); toast.success('Produto inativado'); refresh(); };

  return <div className='space-y-4'><PageHeader title='Produtos' subtitle='Catálogo, custo, estoque e status.' actions={<Link className='underline text-sm' href='/dashboard/products/new'>Novo produto</Link>} />
    <div className='flex flex-wrap gap-2'><input value={q} onChange={(e)=>setParam('q',e.target.value)} className='border rounded px-3 h-9' placeholder='Buscar por nome/SKU' /><label className='text-sm flex items-center gap-1'><input type='checkbox' checked={low} onChange={(e)=>setParam('low',e.target.checked?'1':'')} />estoque baixo</label></div>
    {loading ? <div className='h-36 bg-white border rounded animate-pulse'/> : !rows.length ? <EmptyState title='Nenhum produto encontrado' description='Crie um produto para iniciar a operação.'/> : <DataTable rows={rows} columns={[
      { key:'name', label:'Nome', render:(r:any)=><Link className='underline' href={`/dashboard/products/${r.id}`}>{r.name}</Link>},
      { key:'sku', label:'SKU' }, { key:'category', label:'Categoria' }, { key:'price', label:'Preço', render:(r:any)=>formatCurrency(r.price) }, { key:'stock', label:'Estoque' }, { key:'active', label:'Status', render:(r:any)=>r.active?'Ativo':'Inativo' },
      { key:'actions', label:'Ações', render:(r:any)=><div className='flex gap-2'><Link href={`/dashboard/products/${r.id}`} className='underline'>Editar</Link><button className='underline text-red-600' onClick={()=>archive(r.id)}>Arquivar</button></div>}
    ]} />}
  </div>;
}
