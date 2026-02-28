"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Brain, BarChart3, Key, ArrowRight, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Upload,
      title: 'Upload Simples',
      description: 'Arraste e solte seus comprovantes PIX ou faça upload com um clique.',
    },
    {
      icon: Brain,
      title: 'OCR Inteligente',
      description: 'Tecnologia de reconhecimento óptico de caracteres de alta precisão.',
    },
    {
      icon: BarChart3,
      title: 'Dashboard Completo',
      description: 'Visualize e organize todos seus comprovantes em um só lugar.',
    },
    {
      icon: Key,
      title: 'API Pública',
      description: 'Integre o Pixlyzer em suas aplicações com nossa API REST.',
    },
  ];

  const steps = [
    'Faça upload do comprovante PIX',
    'Nosso OCR extrai os dados automaticamente',
    'Visualize os dados estruturados no dashboard',
    'Exporte ou integre via API',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Pixlyzer
          </Link>
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => {
                const menu = document.getElementById('mobile-menu');
                if (menu) menu.classList.toggle('hidden');
              }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href={process.env.NEXT_PUBLIC_APP_URL + '/docs'} className="text-gray-600 hover:text-gray-900">
              Documentação
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Preços
            </Link>
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Começar Grátis</Button>
            </Link>
          </nav>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden hidden" id="mobile-menu">
          <nav className="px-4 pt-2 pb-4 space-y-2 bg-white border-t">
            <Link href={process.env.NEXT_PUBLIC_APP_URL + '/docs'} className="block text-gray-600 hover:text-gray-900 py-2">
              Documentação
            </Link>
            <Link href="/pricing" className="block text-gray-600 hover:text-gray-900 py-2">
              Preços
            </Link>
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full text-left">Login</Button>
            </Link>
            <Link href="/register" className="block">
              <Button className="w-full text-left">Começar Grátis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            ✨ Novo: API Pública Disponível
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Organize seus Comprovantes PIX
            <span className="text-blue-600"> com Inteligência</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Extraia dados automaticamente de comprovantes PIX com OCR de alta precisão.
            Organize, analise e integre via API.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Começar Grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                Ver Documentação
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas para gerenciar seus comprovantes PIX de forma eficiente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-gray-600">
              Em poucos passos, seus comprovantes estão organizados.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-white p-6 rounded-lg shadow-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="text-lg">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Comece gratuitamente com 10 OCRs por mês. Faça upgrade quando precisar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="font-semibold text-xl mb-2">FREE</h3>
              <p className="text-3xl font-bold mb-4">R$ 0</p>
              <ul className="text-left space-y-2 text-blue-100">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  10 OCR/mês
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Dashboard básico
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  API pública
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 text-gray-900">
              <h3 className="font-semibold text-xl mb-2">PRO</h3>
              <p className="text-3xl font-bold mb-4">R$ 29,90</p>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  500 OCR/mês
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Dashboard completo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Suporte prioritário
                </li>
              </ul>
            </div>
          </div>

          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Criar Conta Grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Pixlyzer</h3>
              <p className="text-sm">
                Organizador inteligente de comprovantes PIX com OCR e API pública.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Preços
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-white">
                    Documentação
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Conta</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/login" className="hover:text-white">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white">
                    Registrar
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacidade
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            © 2024 Pixlyzer. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
