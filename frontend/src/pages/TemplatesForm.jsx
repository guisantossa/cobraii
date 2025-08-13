import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'       // <- usa seu Select (named export)
import { Textarea } from '../components/ui/Textarea'   // <- novo Textarea (case correto)
import { getTemplate, createTemplate, updateTemplate } from '../services/templates'

const CANAIS = [
  { value: '', label: '—' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'sms', label: 'SMS' },
  { value: 'todos', label: 'Genérico' },
]

const RE_PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g

export default function TemplatesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = useMemo(() => Boolean(id), [id])

  const [form, setForm] = useState({ titulo: '', corpo: '', canal: '' })
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isEdit) return
      try {
        setLoading(true)
        const { data } = await getTemplate(id)
        if (mounted && data) {
          setForm({
            titulo: data.titulo || '',
            corpo: data.corpo || '',
            canal: data.canal || '',
          })
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Falha ao carregar template')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, isEdit])

  const placeholders = useMemo(() => {
    const text = form.corpo || ''
    const seen = new Set()
    const list = []
    let m
    while ((m = RE_PLACEHOLDER.exec(text)) !== null) {
      const key = m[1]
      if (!seen.has(key)) {
        seen.add(key)
        list.push(key)
      }
    }
    return list
  }, [form.corpo])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function insertPlaceholder(ph) {
    const textarea = document.getElementById('corpo')
    const token = `{{${ph}}}`
    if (textarea && textarea.selectionStart != null) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = form.corpo.slice(0, start)
      const after = form.corpo.slice(end)
      const novo = before + token + after
      setForm((prev) => ({ ...prev, corpo: novo }))
      setTimeout(() => {
        textarea.focus()
        const pos = start + token.length
        textarea.setSelectionRange(pos, pos)
      }, 0)
    } else {
      setForm((prev) => ({ ...prev, corpo: (prev.corpo || '') + token }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        titulo: form.titulo?.trim(),
        corpo: form.corpo || '',
        canal: form.canal || null,
      }

      if (!payload.titulo) {
        setError('Informe o título do template')
        setSubmitting(false)
        return
      }
      if (!payload.corpo) {
        setError('Informe o corpo do template')
        setSubmitting(false)
        return
      }

      if (isEdit) {
        await updateTemplate(id, payload)
      } else {
        await createTemplate(payload)
      }

      navigate('/templates')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao salvar template')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <h1 className="h1 mb-4 text-center">{isEdit ? 'Editar Template' : 'Novo Template'}</h1>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2 mx-auto" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-28 w-full" />
            <div className="skeleton h-10 w-1/2" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" value={form.titulo} onChange={handleChange} required />
            </div>

            <div>
              <Label htmlFor="canal">Canal (opcional)</Label>
              <Select
                id="canal"
                name="canal"
                value={form.canal}
                onChange={handleChange}
              >
                {CANAIS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Use <b>Genérico</b> para templates aplicáveis a qualquer canal.
              </p>
            </div>

            <div>
              <Label htmlFor="corpo">Corpo</Label>
              <Textarea
                id="corpo"
                name="corpo"
                value={form.corpo}
                onChange={handleChange}
                placeholder="Ex.: Olá {{Cliente}}, sua fatura vence em {{Vencimento}}."
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  Placeholders detectados: <b>{placeholders.length}</b>
                </span>

                <div className="flex flex-wrap gap-2">
                  {['Cliente', 'Vencimento', 'Valor', 'LinkPagamento', 'FaturaNumero'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p)}
                      className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                      style={{ borderColor: 'var(--border)' }}
                      title="Inserir no cursor"
                    >
                      {`{{${p}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {placeholders.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {placeholders.map((p) => (
                    <span key={p} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)' }}>
                      {`{{${p}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/templates')}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
