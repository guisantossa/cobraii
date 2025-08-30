// src/pages/Onboarding.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { checkFunnelProgress } from '../services/onboarding'

// Step compacto: tudo em UMA linha, botão alinhado e com tamanho fixo.
// Espaço extra abaixo de cada card (mb-5 pb-5).
function Step({ done, title, desc, actionLabel, onAction, disabled }) {
  return (
    <div
      className="flex items-center justify-between gap-6 p-4 rounded-lg border mb-5 pb-5"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Ícone + texto (uma linha, com truncamento) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 w-6 flex justify-center">
          {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="font-medium">{title}</span>
            {desc && <span className="text-slate-600"> — {desc}</span>}
          </div>
        </div>
      </div>

      {/* Botão: largura/altura fixas para todos ficarem iguais */}
      <div className="shrink-0 min-w-[180px]">
        {onAction && (
          <Button
            onClick={onAction}
            disabled={disabled}
            className="h-10 w-44 flex items-center justify-center gap-1"
          >
            {actionLabel} <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prog, setProg] = useState({ temCliente: false, temLembrete: false })

  async function load() {
    try {
      setLoading(true); setError('')
      const p = await checkFunnelProgress()
      setProg({ temCliente: !!p.temCliente, temLembrete: !!p.temLembrete })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Falha ao carregar progresso')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const steps = useMemo(() => ([
    {
      key: 'signup',
      title: 'Cadastro concluído',
      desc: 'Sua conta está ativa.',
      done: true,
      actionLabel: null,
      onAction: null,
      disabled: false,
    },
    {
      key: 'cliente',
      title: 'Crie seu primeiro cliente',
      desc: 'Cadastre um cliente para quem você enviará lembretes.',
      done: prog.temCliente,
      actionLabel: 'Novo cliente',
      onAction: () => navigate('/clientes/novo'),
      disabled: false,
    },
    {
      key: 'lembrete',
      title: 'Crie seu primeiro lembrete',
      desc: 'Defina título, mensagem, canal e recorrência.',
      done: prog.temLembrete,
      actionLabel: 'Novo lembrete',
      onAction: () => navigate('/lembretes/novo'),
      disabled: !prog.temCliente,
    },
  ]), [prog, navigate])

  const total = steps.length
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / total) * 100)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-3">
        <h1 className="h1">Comece em 3 passos</h1>
        <p className="text-slate-600">Siga o passo a passo abaixo para ativar seus lembretes.</p>
      </div>

      <Card className="p-6">
        {/* Progresso */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Progresso</span>
            <span>{doneCount}/{total} ({pct}%)</span>
          </div>
          <div className="h-2 rounded bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-9 w-full" />
            <div className="skeleton h-9 w-full" />
            <div className="skeleton h-9 w-full" />
          </div>
        ) : error ? (
          <div className="p-3 rounded bg-red-100 text-red-700 border border-red-200">{error}</div>
        ) : (
          // Sem space-y aqui; o Step já tem espaçamento inferior (mb-5 pb-5)
          <div>
            {steps.map(s => (
              <Step
                key={s.key}
                done={s.done}
                title={s.title}
                desc={s.desc}
                actionLabel={s.actionLabel}
                onAction={s.onAction}
                disabled={s.disabled}
              />
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={load}>Atualizar</Button>
          <Button className="h-10 w-44" onClick={() => navigate('/lembretes')}>Ir para Lembretes</Button>
        </div>
      </Card>
    </div>
  )
}
