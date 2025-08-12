import api from "../services/api";

export const listLembretes = async (params = {}) => {
  const { page = 1, page_size = 20, tipo, estado } = params;
  const res = await api.get("/lembretes", { params: { page, page_size, tipo, estado } });
  return res.data;
};

export const getLembrete = async (id) => {
  const res = await api.get(`/lembretes/${id}`);
  return res.data;
};

export const createLembrete = async (payload) => {
  const res = await api.post("/lembretes", payload);
  return res.data;
};

export const updateLembrete = async (id, payload) => {
  const res = await api.put(`/lembretes/${id}`, payload);
  return res.data;
};

export const patchEstadoLembrete = async (id, acao) => {
  const res = await api.patch(`/lembretes/${id}/estado`, { acao });
  return res.data;
};

export const deleteLembrete = async (id) => {
  const res = await api.delete(`/lembretes/${id}`);
  return res.data;
};

export const previewMensagem = async ({ canal, conteudo, payload, exemplo_cliente_id }) => {
  const res = await api.post("/lembretes/preview", { canal, conteudo, payload, exemplo_cliente_id });
  return res.data; // { render }
};

export const simularRecorrencia = async ({ timezone, dt_inicio, dt_fim, rrule, limite }) => {
  const res = await api.post("/lembretes/simular-recorrencia", { timezone, dt_inicio, dt_fim, rrule, limite });
  return res.data; // { instantes: [...] }
};

export const listarOcorrencias = async (id, params = {}) => {
  const res = await api.get(`/lembretes/${id}/ocorrencias`, { params });
  return res.data;
};