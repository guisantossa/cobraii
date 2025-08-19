import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import Autocomplete from '../components/ui/Autocomplete'
import { getCobranca, createCobranca, updateCobranca } from '../services/cobrancas'
import { getClientes } from '../services/clientes'

const RECORRENCIAS = [
  { value: 'unica', label: 'Única' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
]

function formatCurrencyBRL(v) {
  if (v === null || v === undefined) return ''
  const onlyDigits = v.toString().replace(/\D/g, '')
  const centavos = (parseInt(onlyDigits || '0', 10) / 100).toFixed(2)
  const [int, dec] = centavos.split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intFmt},${dec}`
}

function unmaskCurrencyBRL(v) {
  if (!v) return 0
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

export default function CobrancasForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = useMemo(() => Boolean(id), [id])

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    cliente_id: '',
    cliente_busca: '',
    valor: '',
    recorrencia: 'unica',
    vencimento: '',
  })

  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // carrega clientes para o autocomplete
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await getClientes()
        if (mounted) setClientes(Array.isArray(data) ? data : [])
      } catch {
        // silencioso
      }
    })()
    return () => { mounted = false }
  }, [])

  // carrega cobrança se editar
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isEdit) return
      try {
        setLoading(true)
        const { data } = await getCobranca(id)
        if (mounted && data) {
          const valorMasked = formatCurrencyBRL(data.valor)
          setForm(prev => ({
            ...prev,
            titulo: data.titulo || '',
            descricao: data.descricao || '',
            cliente_id: data.cliente_id || '',
            cliente_busca: '',
            valor: valorMasked,
            recorrencia: data.recorrencia || 'unica',
            vencimento: data.vencimento || '',
          }))
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Falha ao carregar cobrança')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, isEdit])

  // quando clientes carregarem e houver cliente_id (criação), sincroniza o texto do autocomplete
  useEffect(() => {
    if (!form.cliente_id || !clientes?.length) return
    const found = clientes.find((c) => c.id === form.cliente_id)
    if (found && found.nome && form.cliente_busca !== found.nome && !isEdit) {
      setForm((prev) => ({ ...prev, cliente_busca: found.nome }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleChangeValor(e) {
    const raw = e.target.value
    const masked = formatCurrencyBRL(raw)
    setForm((prev) => ({ ...prev, valor: masked }))
  }

  function onClienteText(text) {
    if (isEdit) return // impede troca de cliente ao editar
    setForm((prev) => ({ ...prev, cliente_busca: text, cliente_id: '' }))
  }

  function onClienteSelect(item) {
    if (isEdit) return // impede troca de cliente ao editar
    setForm(prev => ({
      ...prev,
      cliente_id: item?.id || '',
      cliente_busca: item?.nome || ''
    }))
  }

  function validatePayload(p) {
    if (!p.titulo?.trim()) return 'Informe o título'
    if (!p.vencimento) return 'Informe o vencimento'
    const valorNum = unmaskCurrencyBRL(p.valor)
    if (!valorNum || Number.isNaN(valorNum) || valorNum <= 0) return 'Valor inválido'
    if (!p.cliente_id) return 'Selecione um cliente (autocomplete)'
    return ''
  }

  function parseApiError(err) {
    const detail = err?.response?.data?.detail
    if (Array.isArray(detail)) {
      return detail
        .map(d => {
          const path = Array.isArray(d.loc) ? d.loc.join('.') : ''
          return `${path ? `[${path}] ` : ''}${d.msg}`
        })
        .join(' | ')
    }
    if (typeof detail === 'string') return detail
    return err?.message || 'Falha ao salvar cobrança'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const msg = validatePayload(form)
      if (msg) throw new Error(msg)

      const payload = {
        titulo: form.titulo?.trim(),
        descricao: form.descricao?.trim() || null,
        cliente_id: form.cliente_id || null,
        valor: unmaskCurrencyBRL(form.valor),
        recorrencia: form.recorrencia ?? 'unica',
        vencimento: form.vencimento?.trim() ?? null,
      }
      let saved
      if (isEdit) {
        saved = await updateCobranca(id, payload)
      } else {
        saved = await createCobranca(payload)
      }

      navigate(`/cobrancas/${saved.id}`)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // bloco somente leitura do cliente no modo edição
  function ClienteReadOnly() {
    const nomeClientePre = (() => {
      if (!form.cliente_id) return ''
      const found = clientes.find(c => c.id === form.cliente_id)
      return found?.nome || form.cliente_busca || ''
    })()

    return (
      <div className="md:col-span-2">
        <Label>Cliente</Label>
        <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3 text-slate-700">
          <div className="text-xs uppercase tracking-wide text-slate-500">Cliente</div>
          <div className="mt-1 font-medium">{nomeClientePre || '-'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <h1 className="h1 mb-4 text-center">{isEdit ? 'Editar Cobrança' : 'Nova Cobrança'}</h1>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2 mx-auto" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" value={form.titulo} onChange={handleChange} required />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" name="descricao" value={form.descricao} onChange={handleChange} />
            </div>

            {/* Cliente */}
            {!isEdit ? (
              <div className="md:col-span-2">
                <Label htmlFor="cliente_busca">Cliente (obrigatório)</Label>
                <Autocomplete
                  value={form.cliente_busca}
                  onChangeText={onClienteText}
                  onSelect={onClienteSelect}
                  items={clientes}
                  getItemLabel={(c) => c?.nome || ''}
                  placeholder="Digite para buscar clientes..."
                  inputProps={{ id: 'cliente_busca', name: 'cliente_busca', required: true }}
                />
                {form.cliente_id === '' && form.cliente_busca && (
                  <p className="text-xs text-slate-500 mt-1">Selecione um item da lista para vincular.</p>
                )}
              </div>
            ) : (
              <ClienteReadOnly />
            )}

            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                name="valor"
                value={form.valor}
                onChange={handleChangeValor}
                placeholder="0,00"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="recorrencia">Recorrência</Label>
              <Select
                id="recorrencia"
                name="recorrencia"
                value={form.recorrencia}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              >
                {RECORRENCIAS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="vencimento">Próximo Vencimento</Label>
              <Input id="vencimento" name="vencimento" type="date" value={form.vencimento} onChange={handleChange} />
            </div>

            {error && (
              <div className="md:col-span-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/cobrancas')}>Cancelar</Button>
              <Button type="submit" disabled={submitting || !form.cliente_id}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
