/*
 * LandingLembrii.jsx - Landing Page do Lembrii
 * 
 * COMO EDITAR:
 * - Textos: edite diretamente nos componentes em /components/marketing/
 * - Cores: paleta principal está definida no Tailwind (blue-600, gray-900, etc.)
 * - Seções: cada seção é um componente separado para facilitar manutenção
 * 
 * ESTRUTURA:
 * - Hero: título principal + CTAs
 * - Benefits: 5 benefícios principais com ícones
 * - Pricing: 3 planos com toggle mensal/anual
 * - Use Cases: exemplos práticos de uso
 * - Testimonials: depoimentos de clientes
 * - Footer: links + informações legais
 * 
 * NAVEGAÇÃO:
 * - CTAs principais redirecionam para /register
 * - Links internos usam scroll suave (#pricing, #benefits, etc.)
 */

import React, { useEffect } from 'react'
import HeroLembrii from '../components/marketing/HeroLembrii'
import BenefitsLembrii from '../components/marketing/BenefitsLembrii'
import PricingLembrii from '../components/marketing/PricingLembrii'
import UseCasesLembrii from '../components/marketing/UseCasesLembrii'
import TestimonialsLembrii from '../components/marketing/TestimonialsLembrii'
import FooterLembrii from '../components/marketing/FooterLembrii'

const LandingLembrii = () => {
  // Função para scroll suave até seções
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  // Configurar scroll suave para links de âncora
  useEffect(() => {
    // Interceptar cliques em links de âncora
    const handleAnchorClick = (e) => {
      if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        const sectionId = e.target.getAttribute('href').substring(1)
        scrollToSection(sectionId)
      }
    }

    // Adicionar event listener
    document.addEventListener('click', handleAnchorClick)

    // Cleanup
    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  // Verificar se há âncora na URL ao carregar
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash) {
      // Pequeno delay para garantir que a página carregou
      setTimeout(() => {
        scrollToSection(hash)
      }, 100)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Meta tags dinâmicas */}
      <div style={{ display: 'none' }}>
        <title>Lembrii - Lembretes Automáticos por WhatsApp, SMS e E-mail</title>
        <meta name="description" content="Chega de gente esquecida atrapalhando seus compromissos. O Lembrii envia lembretes automáticos para clientes via WhatsApp, SMS e e-mail. Configure em segundos!" />
      </div>

      {/* Seções da Landing Page */}
      <HeroLembrii onScrollToPricing={() => scrollToSection('pricing')} />
      <BenefitsLembrii />
      <PricingLembrii />
      <UseCasesLembrii />
      <TestimonialsLembrii />
      <FooterLembrii />

      {/* Botão flutuante de CTA (opcional - aparece no scroll) */}
      <FloatingCTA />
    </div>
  )
}

// Componente de CTA flutuante que aparece quando o usuário faz scroll
const FloatingCTA = () => {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 600) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => window.location.href = '/register'}
        className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
      >
        ⚡ Começar agora
      </button>
    </div>
  )
}

export default LandingLembrii
