// src/services/analytics.js
import api from './api'

export const getOverview = (params) => api.get('/analytics/overview', { params })
export const getEnviosSeries = (params) => api.get('/analytics/envios-timeseries', { params })
export const getFaturasStatus = (params) => api.get('/analytics/faturas-status', { params })
export const getConversao = (params) => api.get('/analytics/conversao', { params })
