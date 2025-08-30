// src/services/feedback.js
import api from './api'

export async function sendFeedback(payload) {
  const { data } = await api.post('/feedbacks', payload)
  return data
}
