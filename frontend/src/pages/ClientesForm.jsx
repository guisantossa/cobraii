import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mask } from 'remask'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card } from '../components/ui/Card'
import { getCliente, createCliente, updateCliente } from '../services/clientes'

export default function ClientesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = useMemo(() => Boolean(id), [id])

  const [form, setForm] = useState({ nome: '', email: '', telefone: '', documento: '' })
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isEdit) return
      try {
        setLoading(true)
        const { data } = await getCliente(id)
        if (mounted && data) {
          setForm({
            nome: data.nome || '',
            email: data.email || '',
            telefone: data.telefone || '',
            documento: data.documento || '',
          })
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Falha ao carregar cliente')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, isEdit])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleChangeTelefone(e) {
    const v = e.target.value.replace(/\D/g, '')
    const masked = mask(v, ['(99) 9999-9999', '(99) 9 9999-9999'])
    setForm((prev) => ({ ...prev, telefone: masked }))
  }

  function handleChangeDocumento(e) {
    const v = e.target.value.replace(/\D/g, '')
    const masked = mask(v, ['999.999.999-99', '99.999.999/9999-99'])
    setForm((prev) => ({ ...prev, documento: masked }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        nome: form.nome?.trim(),
        email: form.email?.trim() || null,
        telefone: form.telefone?.trim() || null,
        documento: form.documento?.trim() || null,
      }

      if (isEdit) {
        await updateCliente(id, payload)
      } else {
        await createCliente(payload)
      }

      navigate('/clientes')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Falha ao salvar cliente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <h1 className="h1 mb-4 text-center">{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h1>
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

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/clientes')}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
