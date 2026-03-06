'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
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
    const res = await fetch('/api/auth/resend-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error?.message || 'Erro ao reenviar');
    setCountdown(60);
    toast.success('Código reenviado');
  };

  return (
    <div className='min-h-screen grid place-items-center p-4 bg-slate-50'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Verifique seu email</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>Enviamos um código de 6 dígitos para {email}.</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder='000000'
            className='text-center tracking-[0.5em] text-xl'
          />
          <Button className='w-full' disabled={loading || code.length !== 6} onClick={submit}>
            {loading ? 'Validando...' : 'Confirmar código'}
          </Button>
          <Button variant='outline' className='w-full' onClick={resend} disabled={countdown > 0}>
            {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
