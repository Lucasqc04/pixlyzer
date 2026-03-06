'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ErpPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  const [product, setProduct] = useState({ name: '', price: '0', stock: '0', sku: '' });
  const [customer, setCustomer] = useState({ name: '', email: '' });
  const [seller, setSeller] = useState({ name: '', email: '' });
  const [transaction, setTransaction] = useState({ kind: 'INCOME', description: '', amount: '0' });
  const [invite, setInvite] = useState({ email: '', role: 'VIEWER', permissions: 'sales.view' });

  const fetchAll = async () => {
    const [allRes, dashRes] = await Promise.all([fetch('/api/v1/erp/all'), fetch('/api/v1/erp/dashboard')]);
    const allJson = await allRes.json();
    const dashJson = await dashRes.json();
    if (allJson.success) setData(allJson.data);
    if (dashJson.success) setDashboard(dashJson.data);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const submit = async (url: string, payload: any) => {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await fetchAll();
  };


  const acceptInvite = async () => {
    const token = searchParams.get('inviteToken');
    if (!token) return;
    await submit('/api/v1/erp/team/accept', { token });
  };

  const pieData = useMemo(() => {
    if (!data?.transactions) return [];
    const income = data.transactions.filter((t: any) => t.kind === 'INCOME').reduce((a: number, b: any) => a + b.amount, 0);
    const expense = data.transactions.filter((t: any) => t.kind === 'EXPENSE').reduce((a: number, b: any) => a + b.amount, 0);
    return [{ name: 'Entradas', value: income }, { name: 'Saídas', value: expense }];
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ERP da Loja</h1>
        <p className="text-gray-600">Gestão de clientes, produtos, vendas, financeiro, equipe e analytics.</p>
        {searchParams.get('inviteToken') && <Button className="mt-3" onClick={acceptInvite}>Aceitar convite pendente</Button>}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle>Produtos</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{dashboard?.metrics?.productCount || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Clientes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{dashboard?.metrics?.customerCount || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Vendedores</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{dashboard?.metrics?.sellerCount || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(dashboard?.metrics?.netCashflow || 0)}</CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Vendas por Mês</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.monthlySales || []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Entradas vs Saídas</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                  {pieData.map((_: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Novo Produto</CardTitle></CardHeader><CardContent className="space-y-3">
            <Label>Nome</Label><Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
            <Label>SKU</Label><Input value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} />
            <Label>Preço</Label><Input type="number" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} />
            <Label>Estoque</Label><Input type="number" value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} />
            <Button onClick={() => submit('/api/v1/erp/products', { ...product, price: Number(product.price), stock: Number(product.stock) })}>Salvar Produto</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Catálogo</CardTitle></CardHeader><CardContent className="space-y-2 max-h-80 overflow-auto">{data?.products?.map((p: any) => <div key={p.id} className="border p-2 rounded text-sm">{p.name} • {formatCurrency(p.price)} • Estoque {p.stock}</div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="customers" className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Novo Cliente</CardTitle></CardHeader><CardContent className="space-y-3">
            <Label>Nome</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <Label>Email</Label><Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <Button onClick={() => submit('/api/v1/erp/customers', customer)}>Salvar Cliente</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Base de Clientes</CardTitle></CardHeader><CardContent className="space-y-2 max-h-80 overflow-auto">{data?.customers?.map((c: any) => <div key={c.id} className="border p-2 rounded text-sm">{c.name} • {c.email || '-'}</div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="sellers" className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Novo Vendedor</CardTitle></CardHeader><CardContent className="space-y-3">
            <Label>Nome</Label><Input value={seller.name} onChange={(e) => setSeller({ ...seller, name: e.target.value })} />
            <Label>Email</Label><Input value={seller.email} onChange={(e) => setSeller({ ...seller, email: e.target.value })} />
            <Button onClick={() => submit('/api/v1/erp/sellers', seller)}>Salvar Vendedor</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Equipe de Vendas</CardTitle></CardHeader><CardContent className="space-y-2 max-h-80 overflow-auto">{data?.sellers?.map((s: any) => <div key={s.id} className="border p-2 rounded text-sm">{s.name} • {s.email || '-'}</div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="sales"><Card><CardHeader><CardTitle>Vendas Registradas</CardTitle></CardHeader><CardContent className="space-y-2">{data?.sales?.map((s: any) => <div key={s.id} className="border p-3 rounded text-sm">{formatCurrency(s.total - s.discount)} • {s.customer?.name || 'Sem cliente'} • {s.seller?.name || 'Sem vendedor'}</div>)}</CardContent></Card></TabsContent>

        <TabsContent value="transactions" className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Nova Transação Manual</CardTitle></CardHeader><CardContent className="space-y-3">
            <Label>Tipo</Label>
            <select className="border rounded h-10 px-2 w-full" value={transaction.kind} onChange={(e) => setTransaction({ ...transaction, kind: e.target.value })}><option value="INCOME">Entrada</option><option value="EXPENSE">Saída</option></select>
            <Label>Descrição</Label><Input value={transaction.description} onChange={(e) => setTransaction({ ...transaction, description: e.target.value })} />
            <Label>Valor</Label><Input type="number" value={transaction.amount} onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })} />
            <Button onClick={() => submit('/api/v1/erp/transactions', { ...transaction, amount: Number(transaction.amount) })}>Salvar Transação</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Extrato</CardTitle></CardHeader><CardContent className="space-y-2 max-h-80 overflow-auto">{data?.transactions?.map((t: any) => <div key={t.id} className="border p-2 rounded text-sm">{t.kind === 'INCOME' ? '⬆' : '⬇'} {t.description} • {formatCurrency(t.amount)}</div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="team" className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Convidar Usuário</CardTitle></CardHeader><CardContent className="space-y-3">
            <Label>Email</Label><Input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <Label>Role</Label>
            <select className="border rounded h-10 px-2 w-full" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              <option>VIEWER</option><option>SELLER</option><option>FINANCE</option><option>MANAGER</option>
            </select>
            <Label>Permissões (csv)</Label><Input value={invite.permissions} onChange={(e) => setInvite({ ...invite, permissions: e.target.value })} />
            <Button onClick={() => submit('/api/v1/erp/team/invite', { email: invite.email, role: invite.role, permissions: invite.permissions.split(',').map((p) => p.trim()).filter(Boolean) })}>Enviar Convite</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Usuários da Loja</CardTitle></CardHeader><CardContent className="space-y-2">{data?.team?.map((m: any) => <div key={m.id} className="border p-2 rounded text-sm">{m.user.email} • {m.role}</div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="api"><Card><CardHeader><CardTitle>API ERP Disponível</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          {['GET /api/v1/erp/all','GET /api/v1/erp/dashboard','POST /api/v1/erp/products','POST /api/v1/erp/customers','POST /api/v1/erp/sellers','POST /api/v1/erp/sales','POST /api/v1/erp/transactions','POST /api/v1/erp/team/invite','POST /api/v1/erp/team/accept'].map((e) => <div key={e} className="border rounded p-2">{e}</div>)}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
