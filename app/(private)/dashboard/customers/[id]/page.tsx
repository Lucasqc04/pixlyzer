'use client';
import { useParams, useRouter } from 'next/navigation';
import { useErpData } from '@/components/erp/useErpData';
import { PageHeader, SubmitButton } from '@/components/erp/shared';
import { FormEvent, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useErpData();
  const c = data?.customers?.find((x: any) => x.id === id);
  const [f, setF] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (c) setF({ ...c, tags: (c.tags || []).join(',') });
    fetch(`/api/v1/erp/activity?entityType=CUSTOMER&entityId=${id}`).then((r) => r.json()).then((j) => setTimeline(j.data || []));
  }, [c, id]);

  if (!f) return <div>Carregando...</div>;
  const save = async (e: FormEvent) => { e.preventDefault(); setLoading(true); const r = await fetch(`/api/v1/erp/customers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, tags: String(f.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean) }) }); setLoading(false); if (!r.ok) return toast.error('Erro'); toast.success('Atualizado'); router.push('/dashboard/customers'); };

  return <div className='space-y-4'><PageHeader title={`Editar cliente · ${f.name}`} subtitle='Dados cadastrais e status.' /><form onSubmit={save} className='bg-white border rounded p-4 space-y-2'><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input value={f.email || ''} onChange={(e) => setF({ ...f, email: e.target.value })} /><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /><Input value={f.document || ''} onChange={(e) => setF({ ...f, document: e.target.value })} /><label className='text-sm flex items-center gap-2'><input type='checkbox' checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Ativo</label><SubmitButton loading={loading}>Salvar alterações</SubmitButton></form><div className="bg-white border rounded p-4"><h3 className="font-medium mb-2">Activity timeline</h3>{timeline.map((t: any) => <div key={t.id} className="text-xs border-b py-1">{new Date(t.createdAt).toLocaleString('pt-BR')} • {t.action}</div>)}</div></div>;
}
