'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ShoppingCart, Receipt, Upload, FileText, Package, Users, UserCheck, Code2, Settings, Menu, X, Plus, LogOut, Inbox } from 'lucide-react';

const nav = [
  { group: 'PRINCIPAL', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'OPERAÇÃO', items: [
    { href: '/dashboard/sales/new', label: 'Nova venda', icon: Plus },
    { href: '/dashboard/sales', label: 'Vendas', icon: ShoppingCart },
    { href: '/dashboard/transactions', label: 'Transações', icon: Receipt },
    { href: '/dashboard/upload', label: 'Uploads PIX', icon: Upload },
    { href: '/dashboard/uploads', label: 'Histórico de comprovantes', icon: FileText },
    { href: '/dashboard/inbox', label: 'Inbox de comprovantes', icon: Inbox },
  ]},
  { group: 'CADASTROS', items: [
    { href: '/dashboard/products', label: 'Produtos', icon: Package },
    { href: '/dashboard/customers', label: 'Clientes', icon: Users },
    { href: '/dashboard/vendors', label: 'Vendedores', icon: UserCheck },
  ]},
  { group: 'SISTEMA', items: [
    { href: '/dashboard/api', label: 'API', icon: Code2 },
    { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
  ]}
];

function Nav({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return <div className="space-y-4">{nav.map(section => <div key={section.group}>
    <p className="px-3 text-[11px] font-semibold text-muted-foreground">{section.group}</p>
    <div className="mt-1 space-y-1">{section.items.map(item => <Link key={item.href} href={item.href} onClick={close}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted'}`}>
      <item.icon className="h-4 w-4"/>{item.label}</Link>)}</div>
  </div>)}</div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:block w-72 border-r bg-white p-4"><Nav /></aside>
      {open && <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
        <aside className="w-72 h-full bg-white p-4" onClick={(e) => e.stopPropagation()}>
          <button className="mb-3" onClick={() => setOpen(false)}><X /></button><Nav close={() => setOpen(false)} />
        </aside></div>}
      <div className="flex-1">
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button><p className="font-semibold">Loja Principal</p></div>
          <div className="flex items-center gap-2"><input className="hidden md:block border rounded-md px-3 py-1 text-sm" placeholder="Busca global (em breve)"/>
            <Link href="/dashboard/sales/new"><Button size="sm">Nova venda</Button></Link>
            <Link href="/dashboard/upload"><Button size="sm" variant="outline">Novo upload</Button></Link>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1"/>Sair</Button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
