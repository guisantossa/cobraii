import api from './api';

export async function getUsuarioLogado() {
  const { data } = await api.get('/usuarios/me');
  return data;
}
