// src/components/feedback/FeedbackFab.jsx
import { useState } from 'react'
import Button from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { sendFeedback } from '../../services/feedback'

const TIPOS = [
  { v: 'sugestao', l: 'Sugestão' },
  { v: 'bug', l: 'Bug' },
  { v: 'usabilidade', l: 'Dificuldade de uso' },
  { v: 'elogio', l: 'Elogio' },
]

export default function FeedbackFab({ origem }) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState('sugestao')
  const [comentario, setComentario] = useState('')
  const [rating, setRating] = useState(5)
  const [sending, setSending] = useState(false)
  const [ok, setOk] = useState(''); const [err, setErr] = useState('')

  async function submit() {
    setSending(true); setErr(''); setOk('')
    try {
      await sendFeedback({
        tipo,
        comentario,
        rating,                // 1..10, tanto faz
        origem: origem || 'fab',
        contexto: {
          path: window.location.pathname,
          ua: navigator.userAgent,
        },
      })
      setOk('Obrigado pelo feedback!')
      setComentario('')
      setTimeout(() => { setOpen(false); setOk('') }, 1200)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Falha ao enviar feedback')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed right-5 bottom-5 z-40">
        <Button className="h-11 px-5 rounded-full shadow-lg" onClick={() => setOpen(true)}>
          Feedback
        </Button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center px-3" onClick={() => setOpen(false)}>
          <Card className="p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="h2">Enviar feedback</h2>
              <button className="c-btn c-btn--ghost" onClick={() => setOpen(false)}>Fechar</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm text-slate-600">Tipo</label>
                <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-600">Quão satisfeito você está? (1–10)</label>
                <Input
                  type="number" min={1} max={10}
                  value={rating} onChange={(e) => setRating(Number(e.target.value || 5))}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Comentário (opcional)</label>
                <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte rapidamente sua ideia, bug ou sugestão..." />
              </div>

              {err && <div className="text-red-600 text-sm">{err}</div>}
              {ok && <div className="text-emerald-700 text-sm">{ok}</div>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={sending || (!comentario && !rating)}>
                  {sending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
