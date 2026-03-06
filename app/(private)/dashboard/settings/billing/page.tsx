'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { PageHeader, TableSkeleton } from '@/components/erp/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function BillingSettings() {
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/usage').then((r) => r.json()).then((j) => setUsage(j.data?.stats));
  }, []);

  if (!usage) return <TableSkeleton rows={4} />;
  const percent = usage.monthlyLimit ? Math.min(100, Math.round((usage.currentUsage / usage.monthlyLimit) * 100)) : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Plano e upgrade" subtitle="Consumo mensal, limites e próximos passos para escalar." />

      <Card className="overflow-hidden border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-blue-600" /> Plano atual: {usage.plan || 'FREE'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Uso no mês</span>
              <span className="font-medium">{usage.currentUsage || 0}/{usage.monthlyLimit || 0}</span>
            </div>
            <Progress value={percent} />
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border p-3"><CheckCircle2 className="mb-1 h-4 w-4 text-green-600" /> Dashboard e ERP integrados</div>
            <div className="rounded-lg border p-3"><CheckCircle2 className="mb-1 h-4 w-4 text-green-600" /> OCR e conciliação de comprovantes</div>
            <div className="rounded-lg border p-3"><CheckCircle2 className="mb-1 h-4 w-4 text-green-600" /> Gestão de clientes, vendedores e produtos</div>
            <div className="rounded-lg border p-3"><CheckCircle2 className="mb-1 h-4 w-4 text-green-600" /> API pronta para automações</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/upgrade"><Button size="lg">Fazer upgrade</Button></Link>
            <Link href="/pricing"><Button variant="outline">Comparar planos</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
