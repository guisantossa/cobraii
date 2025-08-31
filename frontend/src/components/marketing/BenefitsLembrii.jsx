/*
 * BenefitsLembrii.jsx - Seção de Benefícios da Landing Page do Lembrii
 * 
 * Exibe os principais benefícios do produto em formato de grid responsivo
 * com ícones visuais e textos curtos e impactantes.
 */

import React from 'react'
import { Bell, Calendar, MessageCircle, Clock, DollarSign } from 'lucide-react'

const BenefitsLembrii = () => {
  const benefits = [
    {
      icon: Bell,
      title: 'Lembre clientes de pagamentos e evite prejuízo',
      description: 'Reduza inadimplência com lembretes automáticos'
    },
    {
      icon: Calendar,
      title: 'Confirme consultas e reuniões automaticamente',
      description: 'Diminua faltas e otimize sua agenda'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp, SMS e e-mail em um só lugar',
      description: 'Alcance seus clientes em todos os canais'
    },
    {
      icon: Clock,
      title: 'Configure em segundos, esqueça o resto',
      description: 'Setup rápido, funcionamento automático'
    },
    {
      icon: DollarSign,
      title: 'Mais barato que perder uma venda',
      description: 'ROI garantido desde o primeiro uso'
    }
  ]

  return (
    <section id="benefits" className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho da seção */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Por que escolher o Lembrii?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transforme esquecimentos em oportunidades. Automatize lembretes e foque no que realmente importa.
          </p>
        </div>

        {/* Grid de benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon
            return (
              <div
                key={index}
                className="group bg-gray-50 rounded-xl p-6 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Ícone */}
                <div className="mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                    <IconComponent size={24} className="text-blue-600" />
                  </div>
                </div>

                {/* Conteúdo */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA secundário */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.location.href = '/register'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
          >
            Começar agora mesmo
            <Bell size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default BenefitsLembrii
