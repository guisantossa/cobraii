/*
 * FooterLembrii.jsx - Rodapé da Landing Page do Lembrii
 * 
 * Rodapé final com messaging de segurança, links de navegação e informações legais.
 */

import React from 'react'
import { Heart, Shield, Clock, Mail } from 'lucide-react'

const FooterLembrii = () => {
  return (
    <footer id="footer" className="bg-gray-900 text-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Mensagem principal */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={32} className="text-blue-400" />
            <Clock size={32} className="text-green-400" />
            <Heart size={32} className="text-red-400" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Seguro, simples e automático.
          </h3>
          <p className="text-xl text-gray-300">
            O Lembrii trabalha enquanto você vive.
          </p>
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Produto */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-blue-400">Produto</h4>
            <ul className="space-y-3 text-gray-300">
              <li>
                <a href="#pricing" className="hover:text-white transition-colors duration-200">
                  Planos e preços
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-white transition-colors duration-200">
                  Benefícios
                </a>
              </li>
              <li>
                <a href="#usecases" className="hover:text-white transition-colors duration-200">
                  Casos de uso
                </a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-white transition-colors duration-200">
                  Depoimentos
                </a>
              </li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-green-400">Suporte</h4>
            <ul className="space-y-3 text-gray-300">
              <li>
                <a href="/register" className="hover:text-white transition-colors duration-200">
                  Criar conta
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-white transition-colors duration-200">
                  Fazer login
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Central de ajuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-purple-400">Empresa</h4>
            <ul className="space-y-3 text-gray-300">
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Sobre nós
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Carreiras
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Imprensa
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-yellow-400">Contato</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:suporte@lembrii.com" className="hover:text-white transition-colors duration-200">
                  suporte@lembrii.com
                </a>
              </li>
              <li>
                <span className="text-sm">
                  Suporte: 24h para clientes Pro
                </span>
              </li>
              <li>
                <span className="text-sm">
                  Resposta em até 2h úteis
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Garantias e segurança */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-gray-400 text-sm">
            <div className="flex items-center justify-center gap-2">
              <Shield size={20} className="text-green-400" />
              <span>Dados criptografados SSL</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock size={20} className="text-blue-400" />
              <span>99.9% de uptime garantido</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Heart size={20} className="text-red-400" />
              <span>LGPD compliance</span>
            </div>
          </div>
        </div>

        {/* Links legais e copyright */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="hover:text-white transition-colors duration-200">
                Termos de Uso
              </a>
              <a href="#" className="hover:text-white transition-colors duration-200">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-white transition-colors duration-200">
                Cookies
              </a>
            </div>
            
            <div className="text-center">
              <p>© 2025 Lembrii. Todos os direitos reservados.</p>
              <p className="mt-1">CNPJ: 00.000.000/0001-00</p>
            </div>
          </div>
        </div>

        {/* CTA final no footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-300 mb-4">
            Pronto para nunca mais perder um cliente por esquecimento?
          </p>
          <button
            onClick={() => window.location.href = '/register'}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
          >
            Começar gratuitamente
          </button>
        </div>
      </div>
    </footer>
  )
}

export default FooterLembrii
