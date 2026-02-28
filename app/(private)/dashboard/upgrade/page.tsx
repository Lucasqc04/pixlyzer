'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, ArrowRight } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  monthlyLimit: number;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    monthlyLimit: 10,
    features: ['10 OCRs por mês', 'Acesso básico'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 29.9,
    monthlyLimit: 500,
    features: ['500 OCRs por mês', 'Acesso prioritário','API completa'],
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (plan: Plan) => {
    // Se for plano FREE, não precisa de pagamento
    if (plan.id === 'free') {
      // Redirecionar para dashboard
      router.push('/dashboard');
      return;
    }

    setSelectedPlan(plan.id);
    setLoading(true);

    try {
      // Redirecionar para checkout com o plano selecionado
      router.push(`/dashboard/checkout?plan=${plan.id}`);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Escolha seu Plano</h1>
        <p className="text-gray-600">
          Selecione o plano ideal para suas necessidades
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative transition-all ${
              selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                {plan.id === 'pro' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                    POPULAR
                  </span>
                )}
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/mês</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Limit Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {plan.monthlyLimit} OCRs por mês
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <Button
                className="w-full"
                variant={plan.id === 'pro' ? 'default' : 'outline'}
                onClick={() => handleSelectPlan(plan)}
                disabled={loading && selectedPlan === plan.id}
              >
                {loading && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : plan.id === 'free' ? (
                  'Usar Plano FREE'
                ) : (
                  <>
                    Fazer Upgrade
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Dúvidas sobre os planos?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>✓ Você pode fazer downgrade a qualquer momento</p>
          <p>✓ Sem compromisso de contrato longo</p>
 
        </CardContent>
      </Card>
    </div>
  );
}
