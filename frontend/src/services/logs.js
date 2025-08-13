// src/services/logs.js
import api from './api'

export function getAuditLogs(params) {
  return api.get('/logs/audit', { params })
}
