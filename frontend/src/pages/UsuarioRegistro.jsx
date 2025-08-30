// src/pages/UsuariosRegister.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { mask } from 'remask';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { createUsuario } from '../services/usuarios';
import { getPlanos } from '../services/planos';

export default function UsuariosRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    senha: '',
    plano_id: '', // seleção do plano
  });

  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // carregar planos (público)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPlanos(true);
        const data = await getPlanos();
        if (!mounted) return;

        const arr = Array.isArray(data) ? data : (data?.items ?? []);
        setPlanos(arr);

        // default: se existir "free", seleciona ele; senão, primeiro da lista
        const free = arr.find(p => (p?.nome || '').toLowerCase().includes('free'));
        setForm(prev => ({ ...prev, plano_id: (free?.id || arr?.[0]?.id || '') }));
      } catch (err) {
        setError(err?.response?.data?.detail || 'Falha ao carregar planos');
      } finally {
        if (mounted) setLoadingPlanos(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleChangeTelefone(e) {
    const v = e.target.value.replace(/\D/g, '');
    const masked = mask(v, ['(99) 9999-9999', '(99) 9 9999-9999']);
    setForm(prev => ({ ...prev, telefone: masked }));
  }

  function handleChangeDocumento(e) {
    const v = e.target.value.replace(/\D/g, '');
    const masked = mask(v, ['999.999.999-99', '99.999.999/9999-99']);
    setForm(prev => ({ ...prev, documento: masked }));
  }

  // validação mínima
  const validationError = useMemo(() => {
    if (!form.nome.trim()) return 'Informe seu nome.';
    if (!form.email.trim()) return 'Informe seu e-mail.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'E-mail inválido.';
    if (!form.senha || form.senha.length < 6) return 'Senha deve ter ao menos 6 caracteres.';
    if (!form.plano_id) return 'Selecione um plano.';
    return '';
  }, [form.nome, form.email, form.senha, form.plano_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome?.trim(),
        email: form.email?.trim(),
        telefone: form.telefone?.trim() || null,
        documento: form.documento?.trim() || null,
        senha: form.senha,
        // Se o backend AINDA não aceita plano_id no cadastro, comente a linha abaixo.
        plano_id: form.plano_id,
      };

      await createUsuario(payload);

      // pós-criação: ir para login
      navigate('/login?next=/onboarding');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao criar conta.';
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="p-5 max-w-3xl w-full">
        <h1 className="h1 mb-4 text-center">Criar Conta</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" value={form.nome} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="senha">Senha (mín. 6)</Label>
            <Input id="senha" type="password" name="senha" value={form.senha} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" value={form.telefone} onChange={handleChangeTelefone} />
          </div>

          <div>
            <Label htmlFor="documento">Documento (CPF/CNPJ)</Label>
            <Input id="documento" name="documento" value={form.documento} onChange={handleChangeDocumento} />
          </div>

          

          {error && (
            <div className="md:col-span-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/login')}>Já tenho conta</Button>
            <Button type="submit" disabled={submitting || !!validationError}>
              {submitting ? 'Criando...' : 'Criar conta'}
            </Button>
          </div>
        </form>

        <div className="mt-3 text-sm text-slate-600 text-center">
          Ao criar a conta, você concorda com nossos termos de uso.
        </div>
      </Card>
    </div>
  );
}

// Helpers de exibição de preços/recursos
function formatPrecoPlano(p) {
  // Mostra preços de forma compacta (ex.: "— R$6,99/m ou R$4,99/a")
  const m = numToBrl(p?.valor_mensal);
  const a = numToBrl(p?.valor_anual);
  if (m && a) return `— ${m}/m ou ${a}/a`;
  if (m) return `— ${m}/m`;
  if (a) return `— ${a}/a`;
  return '';
}

function numToBrl(v) {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PlanoResumo({ plano }) {
  if (!plano) return null;
  const chips = [
    plano.usa_email ? 'E-mail' : null,
    plano.usa_sms ? 'SMS' : null,
    plano.usa_zap ? 'WhatsApp' : null,
    plano.limites === null ? 'Ilimitado' : `${plano.limites} lembretes`,
  ].filter(Boolean);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center text-xs px-2 py-1 rounded-full border"
          style={{ borderColor: 'var(--border)' }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
