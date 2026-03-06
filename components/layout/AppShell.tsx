'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import {
  Code2,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const nav = [
  { group: 'PRINCIPAL', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'OPERAÇÃO',
    items: [
      { href: '/dashboard/sales/new', label: 'Nova venda', icon: Plus },
      { href: '/dashboard/sales', label: 'Vendas', icon: ShoppingCart },
      { href: '/dashboard/transactions', label: 'Transações', icon: Receipt },
      { href: '/dashboard/upload', label: 'Uploads PIX', icon: Upload },
      { href: '/dashboard/uploads', label: 'Histórico de comprovantes', icon: FileText },
      { href: '/dashboard/inbox', label: 'Inbox de comprovantes', icon: Inbox },
    ],
  },
  {
    group: 'CADASTROS',
    items: [
      { href: '/dashboard/products', label: 'Produtos', icon: Package },
      { href: '/dashboard/customers', label: 'Clientes', icon: Users },
      { href: '/dashboard/vendors', label: 'Vendedores', icon: UserCheck },
    ],
  },
  {
    group: 'SISTEMA',
    items: [
      { href: '/dashboard/api', label: 'API', icon: Code2 },
      { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

const onboardingCards = [
  { title: 'Organize comprovantes PIX com OCR', href: '/dashboard/upload' },
  { title: 'Crie vendas e transações rapidamente', href: '/dashboard/sales/new' },
  { title: 'Concilie comprovantes com operações', href: '/dashboard/inbox' },
  { title: 'Gerencie produtos, clientes e vendedores', href: '/dashboard/products' },
  { title: 'Use a documentação da API', href: '/dashboard/api' },
  { title: 'Convide membros para a loja', href: '/dashboard/settings/team' },
];

function Nav({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      {nav.map((section) => (
        <div key={section.group}>
          <p className="px-3 text-[11px] font-semibold text-muted-foreground">{section.group}</p>
          <div className="mt-1 space-y-1">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!open) return null;

  const close = () => {
    if (dontShowAgain) localStorage.setItem('pixlyzer:onboarding:hidden', '1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <CardTitle>Bem-vindo ao Pixlyzer 👋</CardTitle>
          <CardDescription>Em poucos passos, você já começa a operar com OCR, ERP e conciliação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {onboardingCards.map((card) => (
              <Link key={card.title} href={card.href} className="rounded-lg border bg-slate-50 p-3 text-sm transition hover:border-blue-300 hover:bg-blue-50">
                {card.title}
              </Link>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
            Não mostrar novamente
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Pular
            </Button>
            <Link href="/dashboard/upload" onClick={close}><Button variant="outline">Novo upload</Button></Link>
            <Link href="/dashboard/sales/new" onClick={close}><Button>Começar tour</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem('pixlyzer:onboarding:hidden');
    if (!hidden) setShowOnboarding(true);
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-72 border-r bg-white p-4 lg:block">
        <Nav />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <IconButton className="mb-3" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </IconButton>
            <Nav close={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <IconButton className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="h-4 w-4" />
            </IconButton>
            <p className="font-semibold">Loja Principal</p>
          </div>
          <div className="flex items-center gap-2">
            <Input className="hidden w-52 md:block" placeholder="Busca global (em breve)" aria-label="Busca global" />
            <Link href="/dashboard/sales/new">
              <Button size="sm">Nova venda</Button>
            </Link>
            <Link href="/dashboard/upload" className="hidden sm:block">
              <Button size="sm" variant="outline">Novo upload</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>

      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
