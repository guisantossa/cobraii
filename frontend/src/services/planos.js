// src/services/planos.js
import api from './api';

export async function getPlanos() {
  // GET /api/v1/planos/ -> [{ id, nome, usa_email, usa_sms, usa_zap, valor_mensal, valor_anual, limites }]
  const { data } = await api.get('/planos/');
  return data;
}

export async function getPlano(planoId) {
  const { data } = await api.get(`/planos/${planoId}`);
  return data;
}
