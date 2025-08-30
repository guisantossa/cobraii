// src/pages/UsuarioForm.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mask } from 'remask'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import UpgradeCTA from '../components/billing/UpgradeCTA'
import { getUsuarioLogado, updateUsuarioMe } from '../services/usuarios'
import { getPlanos } from '../services/planos'
import { getLembretesAtivosCount } from '../services/lembretes'

export default function UsuarioForm() {
  const navigate = useNavigate()

  // form
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', documento: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // plano
  const [planos, setPlanos] = useState([])
  const [planoAtual, setPlanoAtual] = useState(null)
  const [usados, setUsados] = useState(null)

  // CTA upgrade
  const [showUpgrade, setShowUpgrade] = useState(false)
  const upgradeReason = useMemo(() => (
    planoAtual
      ? `Você está no plano "${planoAtual.nome}". Faça upgrade para liberar mais canais/limites.`
      : `Veja planos disponíveis para liberar mais canais/limites.`
  ), [planoAtual])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true); setError('')

        const user = await getUsuarioLogado()
        if (!alive) return
        setForm({
          nome: user?.nome || '',
          email: user?.email || '',
          telefone: user?.telefone || '',
          documento: user?.documento || '',
        })

        // planos
        const dataPlanos = await getPlanos().catch(() => [])
        if (!alive) return
        const arr = Array.isArray(dataPlanos) ? dataPlanos : (dataPlanos?.items ?? [])
        setPlanos(arr)

        const planoById = arr.find(p => String(p.id) === String(user?.plano_id))
        setPlanoAtual(planoById || user?.plano || arr.find(p => (p?.nome || '').toLowerCase().includes('free')) || null)

        // contagem de lembretes ativos
        getLembretesAtivosCount()
          .then(v => alive && setUsados(typeof v === 'number' ? v : null))
          .catch(() => alive && setUsados(null))
      } catch (err) {
        if (alive) setError(err?.response?.data?.detail || 'Falha ao carregar seus dados')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }
  function handleChangeTelefone(e) {
    const v = (e.target.value || '').replace(/\D/g, '')
    const masked = mask(v, ['(99) 9999-9999', '(99) 9 9999-9999'])
    setForm((prev) => ({ ...prev, telefone: masked }))
  }
  function handleChangeDocumento(e) {
    const v = (e.target.value || '').replace(/\D/g, '')
    const masked = mask(v, ['999.999.999-99', '99.999.999/9999-99'])
    setForm((prev) => ({ ...prev, documento: masked }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        nome: form.nome?.trim(),
        email: form.email?.trim() || null,
        telefone: form.telefone?.trim() || null,
        documento: form.documento?.trim() || null,
      }
      await updateUsuarioMe(payload)
      setSuccess('Dados atualizados com sucesso.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao salvar seus dados')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- PLANO CARD (sem valores; botões maiores e layout refinado) -----------
  function PlanoCard({ plano }) {
    if (!plano) {
      return (
        <div className="rounded-xl border p-5 bg-slate-50/60" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm text-slate-600">Não foi possível identificar seu plano.</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button className="h-12 w-full text-[0.95rem] font-medium" onClick={() => setShowUpgrade(true)}>
              Upgrade de plano
            </Button>
            <Button className="h-12 w-full text-[0.95rem] font-medium" variant="ghost" onClick={() => navigate('/planos')}>
              Ver todos os planos
            </Button>
          </div>
        </div>
      )
    }

    const limite = plano.limites // null => ilimitado
    const usadosNum = typeof usados === 'number' ? usados : null
    const pct = limite == null || usadosNum == null ? null : Math.max(0, Math.min(100, Math.round((usadosNum / limite) * 100)))

    const chips = [
      { label: 'WhatsApp', ok: !!plano.usa_zap },
      { label: 'E-mail', ok: !!plano.usa_email },
      { label: 'SMS', ok: !!plano.usa_sms },
    ]

    return (
      <div className="rounded-xl border p-6 bg-gradient-to-b from-white to-slate-50 shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Plano atual</div>
            <div className="text-xl font-semibold">{plano.nome}</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs uppercase text-slate-500 mb-2">Canais incluídos</div>
            <div className="flex flex-wrap gap-2">
              {chips.map(c => (
                <span
                  key={c.label}
                  className={`px-2.5 py-1.5 rounded-full text-[12px] border ${
                    c.ok
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 line-through'
                  }`}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-slate-500 mb-2">Limite</div>
            {limite == null ? (
              <div className="text-sm">Lembretes ativos: <strong>Ilimitado</strong></div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>Lembretes ativos</span>
                  <span><strong>{usadosNum ?? '—'}</strong> / {limite}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded bg-slate-100 overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <div className="h-full bg-indigo-500 transition-[width]" style={{ width: `${pct ?? 0}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="pt-1 grid grid-cols-2 gap-3">
            <Button className="h-12 w-full text-[0.95rem] font-medium" onClick={() => setShowUpgrade(true)}>
              Upgrade de plano
            </Button>
            <Button className="h-12 w-full text-[0.95rem] font-medium" variant="ghost" onClick={() => navigate('/planos')}>
              Ver todos os planos
            </Button>
          </div>
        </div>
      </div>
    )
  }
  // ---------------------------------------------------------------------------

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-5xl w-full">
        <h1 className="h1 mb-4 text-center">Meus Dados</h1>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
              <div className="space-y-3">
                <div className="skeleton h-6 w-1/2" />
                <div className="skeleton h-28 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna esquerda: formulário */}
            <form onSubmit={handleSubmit} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" value={form.nome} onChange={handleChange} required />
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" name="email" value={form.email} onChange={handleChange} />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" value={form.telefone} onChange={handleChangeTelefone} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="documento">Documento (CPF/CNPJ)</Label>
                <Input id="documento" name="documento" value={form.documento} onChange={handleChangeDocumento} />
              </div>

              {error && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              {success && (
                <div className="md:col-span-2">
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              )}

              <div className="md:col-span-2 flex justify-between gap-3 pt-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" className="h-11 px-5 text-[0.95rem]" onClick={() => navigate('/configuracoes')}>
                    Configurações
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" className="h-11 px-5 text-[0.95rem]" onClick={() => navigate(-1)}>Cancelar</Button>
                  <Button type="submit" disabled={submitting} className="h-11 px-6 text-[0.95rem]">
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </form>

            {/* Coluna direita: plano (card melhorado, sem valores) */}
            <div className="md:col-span-1">
              <div className="text-sm mb-2 text-slate-600">Seu plano</div>
              <PlanoCard plano={planoAtual} />
            </div>
          </div>
        )}
      </Card>

      {/* CTA Upgrade (modal) */}
      <UpgradeCTA
        visible={showUpgrade}
        reason={upgradeReason}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}
