'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { PageHeader } from '@/components/erp/shared';
import { useErpData } from '@/components/erp/useErpData';

export default function NewSalePage() {
  const { data, loading } = useErpData();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'MANUAL' | 'OCR_PIX'>('MANUAL');
  const [form, setForm] = useState<any>({
    customerId: '', sellerId: '', discount: '', freight: '', paymentMethod: 'PIX', status: 'CONFIRMED', notes: '', uploadId: '',
    items: [{ productId: '', quantity: '1', unitPrice: '' }],
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: '1', unitPrice: '' }] });
  const updateItem = (i: number, key: string, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [key]: value };
    if (key === 'productId') {
      const p = data?.products?.find((x: any) => x.id === value);
      items[i].unitPrice = p?.price ? String(p.price) : '';
    }
    setForm({ ...form, items });
  };

  const subtotal = useMemo(() => form.items.reduce((a: number, it: any) => a + (Number((it.unitPrice || '').replace(',', '.')) || 0) * (Number(it.quantity) || 0), 0), [form.items]);
  const total = subtotal - (Number((form.discount || '').replace(',', '.')) || 0) + (Number((form.freight || '').replace(',', '.')) || 0);

  const submit = async () => {
    setSaving(true);
    const payload = {
      ...form,
      source: mode,
      discount: Number((form.discount || '').replace(',', '.')) || 0,
      freight: Number((form.freight || '').replace(',', '.')) || 0,
      items: form.items.map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity) || 0, unitPrice: Number((it.unitPrice || '').replace(',', '.')) || 0 })),
    };

    const res = await fetch('/api/v1/erp/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();

    if (res.ok && form.uploadId) {
      await fetch(`/api/uploads/${form.uploadId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedSaleId: json.data.id, matchStatus: 'CONFIRMED', reviewStatus: 'REVIEWED', customerId: form.customerId || undefined }),
      });
    }

    setSaving(false);
    if (!res.ok) return toast.error(json.error?.message || 'Erro ao criar venda');
    toast.success('Venda registrada com sucesso');
    router.push('/dashboard/sales');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Nova venda" subtitle="Fluxo completo: manual ou a partir de comprovante OCR PIX." />

      <div className="flex flex-wrap gap-2">
        <Button variant={mode === 'MANUAL' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('MANUAL')}>Manual</Button>
        <Button variant={mode === 'OCR_PIX' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('OCR_PIX')}>Com comprovante OCR</Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="text-xs text-muted-foreground">Passo {step} de 4</div>
          {loading ? <div className="h-32 animate-pulse rounded-lg border bg-slate-100" /> : null}

          {!loading && step === 1 ? (
            <div className="space-y-2">
              <select className="h-10 w-full rounded-md border px-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Selecione o cliente</option>
                {data?.customers?.filter((c: any) => c.active).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="h-10 w-full rounded-md border px-2" value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })}>
                <option value="">Selecione o vendedor</option>
                {data?.sellers?.filter((s: any) => s.active).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {mode === 'OCR_PIX' ? (
                <select className="h-10 w-full rounded-md border px-2" value={form.uploadId} onChange={(e) => setForm({ ...form, uploadId: e.target.value })}>
                  <option value="">Comprovante OCR (opcional)</option>
                  {(data?.uploads || []).map((u: any) => <option key={u.id} value={u.id}>{u.banco || 'Banco'} • {u.valor || 0}</option>)}
                </select>
              ) : null}
            </div>
          ) : null}

          {!loading && step === 2 ? (
            <div className="space-y-2">
              {form.items.map((it: any, i: number) => (
                <div key={i} className="grid gap-2 md:grid-cols-4">
                  <select className="h-10 rounded-md border px-2" value={it.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)}>
                    <option value="">Produto</option>
                    {data?.products?.filter((p: any) => p.active).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <NumberInput placeholder="Quantidade" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                  <NumberInput placeholder="Preço unitário" value={it.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
                  <Button type="button" variant="outline" onClick={addItem}>+ Adicionar item</Button>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && step === 3 ? (
            <div className="grid gap-2 md:grid-cols-2">
              <NumberInput value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="Desconto (opcional)" />
              <NumberInput value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} placeholder="Frete (opcional)" />
              <select className="h-10 rounded-md border px-2" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option>PIX</option><option>CARTAO</option><option>DINHEIRO</option><option>BOLETO</option></select>
              <select className="h-10 rounded-md border px-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option></select>
              <Input className="md:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações" />
            </div>
          ) : null}

          {!loading && step === 4 ? (
            <div className="space-y-1 rounded-lg border bg-slate-50 p-3 text-sm">
              <p>Subtotal: R$ {subtotal.toFixed(2)}</p>
              <p>Desconto: R$ {(Number((form.discount || '').replace(',', '.')) || 0).toFixed(2)}</p>
              <p>Frete: R$ {(Number((form.freight || '').replace(',', '.')) || 0).toFixed(2)}</p>
              <p className="font-semibold">Total: R$ {total.toFixed(2)}</p>
              <p>Forma de pagamento: {form.paymentMethod}</p>
              <p>Status: {form.status}</p>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Voltar</Button>
            {step < 4 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>Avançar</Button>
            ) : (
              <Button type="button" loading={saving} loadingText="Confirmando..." onClick={submit}>Confirmar venda</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
