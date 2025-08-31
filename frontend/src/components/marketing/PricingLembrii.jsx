/*
 * PricingLembrii.jsx - Seção de Preços da Landing Page do Lembrii
 * 
 * Exibe os 3 planos de assinatura (Free, Start, Pro) com destaque
 * visual no plano Pro e cálculo de descontos anuais.
 */

import React, { useState } from 'react'
import { Check, Star, Zap } from 'lucide-react'

const PricingLembrii = () => {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      name: 'Free',
      description: 'Perfeito para testar',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Grátis por 2 meses',
        'Até 2 lembretes',
        'WhatsApp + SMS + E-mail',
        'Suporte básico'
      ],
      cta: 'Começar grátis',
      popular: false,
      icon: null
    },
    {
      name: 'Start',
      description: 'Ideal para freelancers',
      monthlyPrice: 6.99,
      annualPrice: 4.99,
      features: [
        'Até 10 lembretes',
        'Todos os canais',
        'Templates personalizados',
        'Relatórios básicos',
        'Suporte prioritário'
      ],
      cta: 'Começar agora',
      popular: false,
      icon: Zap
    },
    {
      name: 'Pro',
      description: 'Para empresas sérias',
      monthlyPrice: 12.99,
      annualPrice: 9.99,
      features: [
        'Lembretes ilimitados',
        'Todos os canais',
        'Templates avançados',
        'Relatórios completos',
        'API para integrações',
        'Suporte 24/7'
      ],
      cta: 'Começar agora',
      popular: true,
      icon: Star
    }
  ]

  const calculateDiscount = (monthly, annual) => {
    if (monthly === 0) return 0
    return Math.round(((monthly - annual) / monthly) * 100)
  }

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Escolha seu plano
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Comece grátis e evolua conforme sua necessidade
          </p>

          {/* Toggle Mensal/Anual */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                !isAnnual
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isAnnual
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Anual
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Economize
              </span>
            </button>
          </div>
        </div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const discount = calculateDiscount(plan.monthlyPrice, plan.annualPrice)
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
            const IconComponent = plan.icon

            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                  plan.popular
                    ? 'ring-2 ring-blue-500 scale-105'
                    : 'hover:scale-105'
                }`}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star size={16} fill="currentColor" />
                      Mais Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Cabeçalho do Plano */}
                  <div className="text-center mb-8">
                    {IconComponent && (
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <IconComponent size={24} className="text-blue-600" />
                      </div>
                    )}
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {plan.description}
                    </p>

                    {/* Preço */}
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          R$ {price.toFixed(2).replace('.', ',')}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-gray-600">/mês</span>
                        )}
                      </div>

                      {/* Desconto anual */}
                      {isAnnual && plan.monthlyPrice > 0 && discount > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 line-through">
                            R$ {plan.monthlyPrice.toFixed(2).replace('.', ',')}/mês
                          </span>
                          <span className="ml-2 text-sm font-semibold text-green-600">
                            {discount}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check size={20} className="text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => window.location.href = '/register'}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Garantia */}
        <div className="text-center mt-12 text-gray-600">
          <p className="flex items-center justify-center gap-2">
            <Check size={20} className="text-green-500" />
            Cancele quando quiser • Sem compromisso • Setup em minutos
          </p>
        </div>
      </div>
    </section>
  )
}

export default PricingLembrii
