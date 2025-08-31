/*
 * UseCasesLembrii.jsx - Seção de Casos de Uso da Landing Page do Lembrii
 * 
 * Exibe casos práticos de uso do produto organizados por categorias,
 * mostrando como diferentes profissionais podem se beneficiar da solução.
 */

import React from 'react'
import { Users, Calendar, CreditCard, FileText, Building } from 'lucide-react'

const UseCasesLembrii = () => {
  const useCases = [
    {
      icon: CreditCard,
      title: 'Cobrança de clientes',
      description: 'Serviços, autônomos e lojas',
      examples: [
        'Mensalidades em atraso',
        'Parcelas de projetos',
        'Faturas pendentes',
        'Contratos vencidos'
      ],
      color: 'bg-green-100 text-green-700'
    },
    {
      icon: Calendar,
      title: 'Confirmação de consultas',
      description: 'Clínicas e profissionais da saúde',
      examples: [
        'Consultas médicas',
        'Sessões de estética',
        'Terapias e tratamentos',
        'Exames agendados'
      ],
      color: 'bg-blue-100 text-blue-700'
    },
    {
      icon: Building,
      title: 'Lembrete de pagamentos',
      description: 'Aluguéis e mensalidades',
      examples: [
        'Aluguel mensal',
        'Condomínio',
        'Cursos e escolas',
        'Assinaturas diversas'
      ],
      color: 'bg-purple-100 text-purple-700'
    },
    {
      icon: Users,
      title: 'Presença em eventos',
      description: 'Eventos e reuniões',
      examples: [
        'Reuniões de equipe',
        'Workshops e cursos',
        'Eventos corporativos',
        'Palestras e webinars'
      ],
      color: 'bg-orange-100 text-orange-700'
    },
    {
      icon: FileText,
      title: 'Prazos de documentos',
      description: 'Renovações e contratos',
      examples: [
        'CNH e documentos',
        'Contratos diversos',
        'Licenças e alvarás',
        'Certificados'
      ],
      color: 'bg-red-100 text-red-700'
    }
  ]

  return (
    <section id="usecases" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Casos práticos de uso
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Descubra como profissionais de diferentes áreas estão usando o Lembrii para 
            automatizar lembretes e melhorar seus resultados.
          </p>
        </div>

        {/* Grid de casos de uso */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => {
            const IconComponent = useCase.icon
            
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Ícone e título */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${useCase.color} group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {useCase.description}
                    </p>
                  </div>
                </div>

                {/* Exemplos */}
                <ul className="space-y-2">
                  {useCase.examples.map((example, exampleIndex) => (
                    <li
                      key={exampleIndex}
                      className="text-gray-700 text-sm flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* CTA final */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Encontrou seu caso de uso?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Junte-se a milhares de profissionais que já automatizaram seus lembretes 
              e nunca mais perderam oportunidades por esquecimento.
            </p>
            <button
              onClick={() => window.location.href = '/register'}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
            >
              Começar agora mesmo
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default UseCasesLembrii
