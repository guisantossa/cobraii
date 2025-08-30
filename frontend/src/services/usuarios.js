import api from './api';

export async function getUsuarioLogado() {
  const { data } = await api.get('/usuarios/me');
  return data;
}

// Criação de usuário público (sem token)
export async function createUsuario(payload) {
  // payload: { nome, email, telefone?, documento?, senha }
  const { data } = await api.post('/usuarios/', payload);
  return data;
}

export async function updateUsuarioMe(payload) {
  const { data } = await api.put('/usuarios/me', payload) // ajuste para PATCH se necessário
  return data
}