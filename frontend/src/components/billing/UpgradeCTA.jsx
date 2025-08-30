// src/components/billing/UpgradeCTA.jsx
import { X } from 'lucide-react'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export default function UpgradeCTA({ visible, onClose, reason }) {
  if (!visible) return null

  const goPlanos = () => {
    // leve para sua página de planos/assinatura
    const from = encodeURIComponent(window.location.pathname)
    window.location.href = `/planos?from=${from}`
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-3xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold">Liberar mais lembretes</h2>
        {reason && <p className="mt-1 text-sm text-slate-600">{reason}</p>}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanoCard
            titulo="Free"
            preco="R$ 0"
            detalhe="/mês"
            itens={['WhatsApp', '2 lembretes ativos', 'Suporte básico']}
            destaque={false}
            disabled
          />
          <PlanoCard
            titulo="Start"
            preco="R$ 6,99"
            detalhe="/mês (ou R$ 4,99/m no anual)"
            itens={['WhatsApp, Email, SMS', '10 lembretes ativos', 'Suporte padrão']}
            destaque
            onSelect={goPlanos}
          />
          <PlanoCard
            titulo="Pro"
            preco="R$ 12,99"
            detalhe="/mês (ou R$ 9,99/m no anual)"
            itens={['Todos os canais', 'Lembretes ilimitados', 'Suporte prioritário']}
            destaque={false}
            onSelect={goPlanos}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Agora não</Button>
          <Button onClick={goPlanos}>Ver planos</Button>
        </div>
      </Card>
    </div>
  )
}

function PlanoCard({ titulo, preco, detalhe, itens, destaque, disabled, onSelect }) {
  return (
    <div className={`rounded-lg border p-4 ${destaque ? 'shadow-md ring-1 ring-slate-200' : ''}`} style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        {disabled && <span className="text-xs text-slate-500">(atual)</span>}
      </div>
      <div className="mt-1 text-2xl font-bold">{preco}</div>
      {detalhe && <div className="text-xs text-slate-500">{detalhe}</div>}

      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {itens.map((t, i) => <li key={i}>• {t}</li>)}
      </ul>

      <div className="mt-4">
        <Button
          disabled={disabled}
          className="w-full"
          onClick={onSelect}
          variant={destaque ? 'primary' : 'ghost'}
        >
          {disabled ? 'Seu plano' : 'Escolher'}
        </Button>
      </div>
    </div>
  )
}
