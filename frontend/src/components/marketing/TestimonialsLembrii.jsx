/*
 * TestimonialsLembrii.jsx - Seção de Depoimentos da Landing Page do Lembrii
 * 
 * Exibe depoimentos de clientes satisfeitos organizados em cards responsivos
 * com aspas visuais e informações dos autores.
 */

import React from 'react'
import { Quote, Star } from 'lucide-react'

const TestimonialsLembrii = () => {
  const testimonials = [
    {
      content: "Recuperei 3 clientes que sempre esqueciam de pagar.",
      author: "João",
      role: "autônomo",
      rating: 5,
      avatar: "J"
    },
    {
      content: "Reduzi faltas em 42% no consultório.",
      author: "Dra. Marina",
      role: "dermatologista",
      rating: 5,
      avatar: "M"
    },
    {
      content: "Nunca mais corri atrás de inquilino para cobrar aluguel.",
      author: "Carlos",
      role: "proprietário",
      rating: 5,
      avatar: "C"
    },
    {
      content: "Meus alunos nunca mais faltam aula sem avisar.",
      author: "Profª Ana",
      role: "professora particular",
      rating: 5,
      avatar: "A"
    },
    {
      content: "Automatizei todas as cobranças do escritório em minutos.",
      author: "Ricardo",
      role: "advogado",
      rating: 5,
      avatar: "R"
    },
    {
      content: "Finalmente meus clientes confirmam presença nos eventos.",
      author: "Beatriz",
      role: "event planner",
      rating: 5,
      avatar: "B"
    }
  ]

  return (
    <section id="testimonials" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Mais de 5.000 profissionais já automatizaram seus lembretes e transformaram 
            esquecimentos em resultados.
          </p>
        </div>

        {/* Grid de depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative"
            >
              {/* Ícone de aspas */}
              <div className="absolute -top-3 -left-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Quote size={16} className="text-white" fill="currentColor" />
                </div>
              </div>

              {/* Avaliação com estrelas */}
              <div className="flex items-center gap-1 mb-4 pt-2">
                {[...Array(testimonial.rating)].map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    size={16}
                    className="text-yellow-400"
                    fill="currentColor"
                  />
                ))}
              </div>

              {/* Conteúdo do depoimento */}
              <p className="text-gray-800 text-lg mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Autor */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {testimonial.avatar}
                  </span>
                </div>
                
                {/* Info do autor */}
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="mt-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">5.000+</div>
                <div className="text-gray-600">Profissionais ativos</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
                <div className="text-gray-600">Taxa de entrega</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">24h</div>
                <div className="text-gray-600">Suporte máximo</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.location.href = '/register'}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
          >
            Junte-se a eles agora
            <Star size={20} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default TestimonialsLembrii
