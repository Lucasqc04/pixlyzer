'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader, EmptyState } from '@/components/erp/shared';
import { DataTable } from '@/components/erp/DataTable';

export default function InboxPage(){
  const [rows,setRows]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [status,setStatus]=useState('');const [selected,setSelected]=useState<string[]>([]);
  const load=()=>{setLoading(true);fetch(`/api/uploads?status=${status||''}`).then(r=>r.json()).then(j=>setRows(j.data?.uploads||[])).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[status]);
  const toggle=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const bulkPatch=async(payload:any)=>{await Promise.all(selected.map(id=>fetch(`/api/uploads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})));toast.success('Ação em lote concluída');setSelected([]);load();};
  const display=useMemo(()=>rows.map(r=>({...r,preview:r.imageData?`data:image/png;base64,${r.imageData}`:''})),[rows]);

  return <div className='space-y-4'><PageHeader title='Inbox de comprovantes' subtitle='Caixa operacional para reconciliar comprovantes PIX rapidamente.'/>
    <div className='flex flex-wrap gap-2'><select className='border rounded h-9 px-2' value={status} onChange={e=>setStatus(e.target.value)}><option value=''>Todos</option><option value='PENDING'>PENDING</option><option value='REVIEWED'>REVIEWED</option><option value='ARCHIVED'>ARCHIVED</option></select>
      <button className='border rounded px-3 py-1 text-sm' onClick={()=>bulkPatch({reviewStatus:'REVIEWED'})} disabled={!selected.length}>Marcar revisados</button>
      <button className='border rounded px-3 py-1 text-sm' onClick={()=>bulkPatch({reviewStatus:'ARCHIVED'})} disabled={!selected.length}>Arquivar</button>
    </div>
    {loading?<div className='h-32 bg-white border rounded animate-pulse'/>:!display.length?<EmptyState title='Inbox vazia' description='Nenhum comprovante para processar.'/>:<DataTable rows={display} columns={[
      {key:'sel',label:'',render:(r:any)=><input type='checkbox' checked={selected.includes(r.id)} onChange={()=>toggle(r.id)}/>},
      {key:'valor',label:'Valor',render:(r:any)=>`R$ ${Number(r.valor||0).toFixed(2)}`},
      {key:'banco',label:'Banco'},
      {key:'data',label:'Data',render:(r:any)=>r.data?new Date(r.data).toLocaleDateString('pt-BR'):'-'},
      {key:'pagador',label:'Cliente detectado',render:(r:any)=>r.pagador||'-'},
      {key:'reviewStatus',label:'Status'},
      {key:'matchStatus',label:'Reconciliação',render:(r:any)=>r.matchStatus==='SUGGESTED'?'MATCH':r.matchStatus==='CONFIRMED'?'LINKED':'NEEDS REVIEW'},
      {key:'actions',label:'Ações',render:(r:any)=><div className='flex gap-2'><Link className='underline' href={`/dashboard/uploads/${r.id}`}>Abrir</Link></div>},
    ]}/>} </div>
}
