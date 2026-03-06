'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const t = setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submit = async () => {
    setLoading(true);
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(j.error?.message || 'Código inválido');
    toast.success('Email verificado com sucesso!');
    router.push('/dashboard');
  };

  const resend = async () => {
    setResending(true);
    const res = await fetch('/api/auth/resend-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json();
    setResending(false);
    if (!res.ok) return toast.error(j.error?.message || 'Erro ao reenviar código');
    setCountdown(60);
    toast.success('Código reenviado');
  };

  const digitSlots = Array.from({ length: 6 }).map((_, idx) => code[idx] || '•');

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700"><MailCheck className="h-5 w-5" /></div>
          <CardTitle>Verifique seu email</CardTitle>
          <CardDescription>Enviamos um código de 6 dígitos para <span className="font-medium text-slate-700">{email}</span>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-md border px-3 py-2 text-center text-xl tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Código de verificação"
          />

          <div className="grid grid-cols-6 gap-2" aria-hidden="true">
            {digitSlots.map((digit, idx) => <div key={idx} className="rounded-md border bg-slate-50 py-2 text-center text-sm font-medium">{digit}</div>)}
          </div>

          <Button className="w-full" disabled={loading || code.length !== 6} loading={loading} loadingText="Validando..." onClick={submit}>Confirmar código</Button>
          <Button variant="outline" className="w-full" onClick={resend} disabled={countdown > 0 || resending} loading={resending} loadingText="Reenviando...">
            {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
