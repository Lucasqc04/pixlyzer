'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/usage').then((res) => {
      if (res.status === 401) router.push('/login');
      setLoading(false);
    }).catch(() => { router.push('/login'); setLoading(false); });
  }, [router]);

  if (loading) return <div className="min-h-screen grid place-items-center">Carregando...</div>;
  return <AppShell>{children}</AppShell>;
}
