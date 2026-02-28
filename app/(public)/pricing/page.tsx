'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    // Redirecionar para dashboard onde o usuário pode fazer upgrade
    window.location.href = '/dashboard?upgrade=true';
  };

  const plans = [
    {
      name: 'FREE',
      price: 0,
      description: 'Para uso pessoal e testes',
      features: [
        { text: '10 OCR por mês', included: true },
        { text: 'Extração de dados básica', included: true },
        { text: 'Dashboard simples', included: true },
        { text: 'API pública', included: true },
        { text: 'OCR ilimitado', included: false },
        { text: 'Suporte prioritário', included: false },
      ],
      cta: 'Começar Grátis',
      href: '/register',
      popular: false,
    },
    {
      name: 'PRO',
      price: 29.9,
      description: 'Para profissionais e empresas',
      features: [
        { text: '500 OCR por mês', included: true },
        { text: 'Extração de dados avançada', included: true },
        { text: 'Dashboard completo', included: true },
        { text: 'API pública', included: true },
        { text: 'OCR ilimitado', included: true },
        { text: 'Suporte prioritário', included: true },
      ],
      cta: 'Fazer Upgrade',
      href: '#',
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Pixlyzer
          </Link>
          <nav className="flex gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="text-gray-600 hover:text-gray-900">
              Registrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Planos e Preços
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades. Comece grátis e faça upgrade quando precisar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Mais Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    R$ {plan.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500">/mês</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300" />
                      )}
                      <span className={feature.included ? '' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {plan.name === 'FREE' ? (
                  <Link href={plan.href} className="w-full">
                    <Button variant="outline" className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                O que acontece se eu exceder o limite do plano FREE?
              </h3>
              <p className="text-gray-600">
                Você precisará fazer upgrade para o plano PRO ou esperar até o próximo mês para resetar seu limite.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Posso cancelar o plano PRO a qualquer momento?
              </h3>
              <p className="text-gray-600">
                Sim, você pode cancelar a qualquer momento. Seu plano permanecerá PRO até o final do período pago.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Como funciona a API pública?
              </h3>
              <p className="text-gray-600">
                Você recebe uma API key única que permite integrar o Pixlyzer em suas aplicações. Consulte a documentação para mais detalhes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
