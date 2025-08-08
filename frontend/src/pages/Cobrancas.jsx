import { useEffect, useState } from 'react'
import {
  listarCobrancas,
  criarCobranca,
  atualizarCobranca,
  cancelarCobranca
} from '../services/cobrancas'
import CobrancasTabela from '../components/CobrancasTabela'
import CobrancasForm from '../components/CobrancasForm'

export default function Cobrancas() {
  const [cobrancas, setCobrancas] = useState([])
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const carregarCobrancas = async () => {
    try {
      const { data } = await listarCobrancas()
      setCobrancas(data)
    } catch (err) {
      alert('Erro ao carregar cobranças')
    }
  }

  const handleSalvar = async (dados) => {
    try {
      if (cobrancaSelecionada) {
        await atualizarCobranca(cobrancaSelecionada.id, dados)
      } else {
        await criarCobranca(dados)
      }
      setMostrarForm(false)
      setCobrancaSelecionada(null)
      carregarCobrancas()
    } catch (err) {
      alert('Erro ao salvar cobrança')
    }
  }

  const handleEditar = (cobranca) => {
    setCobrancaSelecionada(cobranca)
    setMostrarForm(true)
  }

  const handleCancelar = async (id) => {
    if (!window.confirm('Cancelar esta cobrança?')) return
    try {
      await cancelarCobranca(id)
      carregarCobrancas()
    } catch (err) {
      alert('Erro ao cancelar')
    }
  }

  useEffect(() => {
    carregarCobrancas()
  }, [])

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Cobranças</h1>
        <button
          onClick={() => {
            setCobrancaSelecionada(null)
            setMostrarForm(true)
          }}
          className="bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-xl shadow"
        >
          Nova Cobrança
        </button>
      </div>

      <CobrancasTabela
        cobrancas={cobrancas}
        onEditar={handleEditar}
        onCancelar={handleCancelar}
      />

      {mostrarForm && (
        <CobrancasForm
          cobranca={cobrancaSelecionada}
          onCancelar={() => setMostrarForm(false)}
          onSalvar={handleSalvar}
        />
      )}
    </div>
  )
}
