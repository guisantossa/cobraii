/*
 * HeroLembrii.jsx - Seção Hero da Landing Page do Lembrii
 * 
 * Componente responsável pela primeira impressão da landing page.
 * Inclui headline principal, subtítulo explicativo e CTAs primário/secundário.
 * 
 * Props:
 * - onScrollToPricing: função para scroll suave até a seção de preços
 */

import React from 'react'
import { ArrowRight, Play } from 'lucide-react'

const HeroLembrii = ({ onScrollToPricing }) => {
  const handleGetStarted = () => {
    // Navegar para registro
    window.location.href = '/register'
  }

  return (
    <section id="hero" className="relative bg-gradient-to-b from-blue-50 to-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Headline Principal */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Chega de gente esquecida{' '}
          <span className="text-blue-600">atrapalhando</span>{' '}
          seus compromissos
        </h1>

        {/* Subtítulo */}
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          O Lembrii envia lembretes automáticos para clientes, alunos ou qualquer pessoa — 
          via <span className="font-semibold text-gray-800">WhatsApp, SMS e e-mail</span>.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Crie seu lembrete grátis agora
            <ArrowRight size={20} />
          </button>
          
          <button
            onClick={onScrollToPricing}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors duration-200 flex items-center gap-2"
          >
            <Play size={20} />
            Ver planos
          </button>
        </div>

        {/* Indicador de confiança */}
        <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Configure em segundos, esqueça o resto
        </div>
      </div>

      {/* Decoração visual */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-100 rounded-full opacity-50 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-16 h-16 bg-blue-200 rounded-full opacity-30 animate-pulse delay-1000"></div>
    </section>
  )
}

export default HeroLembrii
