'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, TableSkeleton } from '@/components/erp/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sections = [
  { id: 'auth', title: 'Auth', endpoints: [{ method: 'POST', path: '/api/auth/register', goal: 'Criar conta e enviar código de verificação', auth: 'Pública', body: '{"email":"user@acme.com","password":"strongPass"}' }, { method: 'POST', path: '/api/auth/verify-email', goal: 'Validar código de 6 dígitos', auth: 'Pública', body: '{"email":"user@acme.com","code":"123456"}' }, { method: 'POST', path: '/api/auth/resend-verification-code', goal: 'Reenviar código', auth: 'Pública', body: '{"email":"user@acme.com"}' }] },
  { id: 'dashboard', title: 'Dashboard', endpoints: [{ method: 'GET', path: '/api/v1/erp/dashboard', goal: 'KPIs e blocos executivos', auth: 'Cookie auth-token', body: '-' }, { method: 'GET', path: '/api/v1/erp/all', goal: 'Snapshot de módulos ERP', auth: 'Cookie auth-token', body: '-' }] },
  { id: 'products', title: 'Products', endpoints: [{ method: 'GET', path: '/api/v1/erp/products', goal: 'Listar produtos', auth: 'Cookie auth-token', body: '-' }, { method: 'POST', path: '/api/v1/erp/products', goal: 'Criar produto', auth: 'Cookie auth-token', body: '{"name":"Produto","price":29.9,"stock":50}' }, { method: 'PATCH', path: '/api/v1/erp/products/:id', goal: 'Atualizar produto', auth: 'Cookie auth-token', body: '{"stock":45}' }, { method: 'DELETE', path: '/api/v1/erp/products/:id', goal: 'Arquivar produto', auth: 'Cookie auth-token', body: '-' }] },
  { id: 'customers', title: 'Customers', endpoints: [{ method: 'CRUD', path: '/api/v1/erp/customers', goal: 'Gestão de clientes', auth: 'Cookie auth-token', body: 'name, email, phone, document...' }] },
  { id: 'sellers', title: 'Sellers / Vendors', endpoints: [{ method: 'CRUD', path: '/api/v1/erp/sellers', goal: 'Gestão de vendedores', auth: 'Cookie auth-token', body: 'name, commissionRate, notes...' }] },
  { id: 'sales', title: 'Sales', endpoints: [{ method: 'CRUD', path: '/api/v1/erp/sales', goal: 'Criar/editar/cancelar vendas', auth: 'Cookie auth-token', body: '{"customerId":"uuid","items":[{"productId":"uuid","quantity":1,"unitPrice":10}]}' }] },
  { id: 'transactions', title: 'Transactions', endpoints: [{ method: 'CRUD', path: '/api/v1/erp/transactions', goal: 'Lançamentos financeiros', auth: 'Cookie auth-token', body: '{"kind":"INCOME","amount":150,"status":"CONFIRMED"}' }] },
  { id: 'team', title: 'Team / Invitations', endpoints: [{ method: 'POST', path: '/api/v1/erp/team/invite', goal: 'Convidar membro', auth: 'Cookie auth-token', body: '{"email":"membro@acme.com"}' }, { method: 'POST', path: '/api/v1/erp/team/accept', goal: 'Aceitar convite', auth: 'Cookie auth-token', body: '{"token":"..."}' }] },
  { id: 'store-profile', title: 'Store / Profile', endpoints: [{ method: 'GET/PATCH', path: '/api/v1/erp/store', goal: 'Configurações da loja', auth: 'Cookie auth-token', body: '{"name":"Minha Loja"}' }, { method: 'GET/PATCH', path: '/api/v1/erp/profile', goal: 'Perfil do usuário', auth: 'Cookie auth-token', body: '{"name":"Usuário"}' }] },
  { id: 'ocr', title: 'OCR / Uploads', endpoints: [{ method: 'POST', path: '/api/v1/ocr', goal: 'OCR público por API key', auth: 'Header x-api-key', body: 'multipart/form-data (file)' }, { method: 'GET', path: '/api/uploads', goal: 'Listar uploads', auth: 'Cookie auth-token', body: '-' }, { method: 'PATCH', path: '/api/uploads/:id', goal: 'Revisar e vincular upload', auth: 'Cookie auth-token', body: '{"saleId":"uuid","reviewStatus":"REVIEWED"}' }] },
];

function methodVariant(method: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (method.includes('POST')) return 'default';
  if (method.includes('DELETE')) return 'destructive';
  if (method.includes('PATCH')) return 'secondary';
  return 'outline';
}

export default function ApiPage() {
  const [active, setActive] = useState(sections[0].id);

  const requestSample = useMemo(() => `curl -X POST "$BASE/api/v1/erp/sales" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: auth-token=..." \\
  -d '{
    "customerId":"uuid",
    "sellerId":"uuid",
    "status":"CONFIRMED",
    "paymentMethod":"PIX",
    "source":"MANUAL",
    "items":[{"productId":"uuid","quantity":1,"unitPrice":50}]
  }'`, []);

  const fetchSample = useMemo(() => `const res = await fetch('/api/v1/erp/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'INCOME',
    description: 'Recebimento PIX',
    amount: 150,
    status: 'CONFIRMED'
  })
});
const data = await res.json();`, []);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Código copiado');
  };

  if (!sections.length) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-4">
      <PageHeader title="API do Pixlyzer ERP" subtitle="Documentação interna completa com autenticação, parâmetros, exemplos e erros comuns." />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Índice</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)} className={`w-full rounded px-2 py-1.5 text-left text-sm ${active === s.id ? 'bg-blue-50 font-medium text-blue-700' : 'hover:bg-slate-100'}`}>
                {s.title}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sections.filter((s) => s.id === active).map((section) => (
            <Card key={section.id}>
              <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {section.endpoints.map((ep) => (
                  <div key={`${ep.path}-${ep.method}`} className="rounded-lg border p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={methodVariant(ep.method)}>{ep.method}</Badge>
                      <code className="text-sm font-semibold">{ep.path}</code>
                    </div>
                    <p className="text-sm"><span className="font-medium">Objetivo:</span> {ep.goal}</p>
                    <p className="text-sm"><span className="font-medium">Autenticação:</span> {ep.auth}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Parâmetros de rota e query variam por endpoint. Campos obrigatórios e opcionais devem seguir o schema da rota.</p>
                    <pre className="mt-2 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{ep.body}</pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader><CardTitle className="text-base">Exemplos de request</CardTitle></CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium">curl</p><Button variant="ghost" size="sm" onClick={() => copy(requestSample)}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button></div>
                <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{requestSample}</pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium">fetch</p><Button variant="ghost" size="sm" onClick={() => copy(fetchSample)}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button></div>
                <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{fetchSample}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Erros comuns e códigos HTTP</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" /> 400 validação, 401 não autenticado, 403 sem permissão, 404 não encontrado, 409 conflito, 500 erro interno.</p>
              <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "fields": { "email": ["Email inválido"] }
  }
}`}</pre>
              <p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Todas as respostas seguem envelope padrão: <code>{`{ success, data | error }`}</code>.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
