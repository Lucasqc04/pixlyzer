'use client';
import { useMemo, useState } from 'react';import toast from 'react-hot-toast';import { useRouter } from 'next/navigation';import { useErpData } from '@/components/erp/useErpData';import { PageHeader } from '@/components/erp/shared';import { Input } from '@/components/ui/input';import { Button } from '@/components/ui/button';

export default function NewSalePage() {
  const { data } = useErpData(); const router = useRouter();
  const [step, setStep] = useState(1); const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'MANUAL'|'OCR_PIX'>('MANUAL');
  const [form, setForm] = useState<any>({ customerId:'', sellerId:'', discount:0, freight:0, paymentMethod:'PIX', status:'CONFIRMED', notes:'', uploadId:'', items:[{ productId:'', quantity:1, unitPrice:0 }] });
  const addItem = () => setForm({ ...form, items: [...form.items, { productId:'', quantity:1, unitPrice:0 }]});
  const updateItem = (i:number, key:string, value:any) => { const items=[...form.items]; items[i]={...items[i],[key]:value}; if(key==='productId'){const p=data?.products?.find((x:any)=>x.id===value);items[i].unitPrice=p?.price||0;} setForm({...form,items}); };
  const subtotal = useMemo(()=> form.items.reduce((a:number,it:any)=>a+(Number(it.unitPrice||0)*Number(it.quantity||0)),0), [form.items]);
  const total = subtotal - Number(form.discount||0) + Number(form.freight||0);

  const submit = async () => {
    setLoading(true);
    const payload = { ...form, source: mode, discount:Number(form.discount), freight:Number(form.freight), items: form.items.map((it:any)=>({productId:it.productId,quantity:Number(it.quantity),unitPrice:Number(it.unitPrice)})) };
    const res = await fetch('/api/v1/erp/sales', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    const json = await res.json();
    if (res.ok && form.uploadId) await fetch(`/api/uploads/${form.uploadId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ linkedSaleId: json.data.id, matchStatus: 'CONFIRMED', reviewStatus: 'REVIEWED', customerId: form.customerId || undefined })});
    setLoading(false); if(!res.ok) return toast.error(json.error?.message || 'Erro ao criar venda'); toast.success('Venda registrada'); router.push('/dashboard/sales');
  };

  return <div className='space-y-4'><PageHeader title='Nova venda' subtitle='Fluxo completo: manual ou a partir de comprovante OCR PIX.'/>
    <div className='flex gap-2 text-sm'>{['MANUAL','OCR_PIX'].map(m=><button key={m} className={`px-3 py-1 rounded ${mode===m?'bg-blue-100':'bg-white border'}`} onClick={()=>setMode(m as any)}>{m==='MANUAL'?'Manual':'Com comprovante OCR'}</button>)}</div>
    <div className='bg-white border rounded p-4 space-y-3'>
      <div className='text-xs text-muted-foreground'>Passo {step} de 4</div>
      {step===1 && <div className='space-y-2'><select className='border rounded h-10 w-full px-2' value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})}><option value=''>Cliente</option>{data?.customers?.filter((c:any)=>c.active).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className='border rounded h-10 w-full px-2' value={form.sellerId} onChange={e=>setForm({...form,sellerId:e.target.value})}><option value=''>Vendedor</option>{data?.sellers?.filter((s:any)=>s.active).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>{mode==='OCR_PIX'&&<select className='border rounded h-10 w-full px-2' value={form.uploadId} onChange={e=>setForm({...form,uploadId:e.target.value})}><option value=''>Comprovante OCR (opcional)</option>{(data?.uploads||[]).map((u:any)=><option key={u.id} value={u.id}>{u.banco||'Banco'} • {u.valor||0}</option>)}</select>}</div>}
      {step===2 && <div className='space-y-2'>{form.items.map((it:any,i:number)=><div key={i} className='grid md:grid-cols-4 gap-2'><select className='border rounded h-10 px-2' value={it.productId} onChange={e=>updateItem(i,'productId',e.target.value)}><option value=''>Produto</option>{data?.products?.filter((p:any)=>p.active).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><Input type='number' min={1} value={it.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} placeholder='Qtd'/><Input type='number' value={it.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} placeholder='Preço unitário'/><Button type='button' variant='outline' onClick={addItem}>+ item</Button></div>)}</div>}
      {step===3 && <div className='grid md:grid-cols-2 gap-2'><Input type='number' value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})} placeholder='Desconto'/><Input type='number' value={form.freight} onChange={e=>setForm({...form,freight:e.target.value})} placeholder='Frete'/><select className='border rounded h-10 px-2' value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option>PIX</option><option>CARTAO</option><option>DINHEIRO</option><option>BOLETO</option></select><select className='border rounded h-10 px-2' value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option></select><Input className='md:col-span-2' value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder='Observações'/></div>}
      {step===4 && <div className='space-y-1 text-sm'><p>Subtotal: R$ {subtotal.toFixed(2)}</p><p>Desconto: R$ {Number(form.discount).toFixed(2)}</p><p>Frete: R$ {Number(form.freight).toFixed(2)}</p><p className='font-semibold'>Total: R$ {total.toFixed(2)}</p><p>Forma de pagamento: {form.paymentMethod}</p><p>Status: {form.status}</p></div>}
      <div className='flex justify-between'><Button type='button' variant='outline' disabled={step===1} onClick={()=>setStep(step-1)}>Voltar</Button>{step<4?<Button type='button' onClick={()=>setStep(step+1)}>Avançar</Button>:<Button type='button' disabled={loading} onClick={submit}>{loading?'Salvando...':'Confirmar venda'}</Button>}</div>
    </div>
  </div>;
}
