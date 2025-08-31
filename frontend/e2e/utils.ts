// e2e/utils.ts
import { APIRequestContext, Page, expect } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:8000'

export function randSuffix() {
  return Math.random().toString(36).slice(2, 8)
}

function randomDigits(n: number) {
  let s = ''
  while (s.length < n) s += Math.floor(Math.random() * 10).toString()
  return s.slice(0, n)
}

async function expectOk(resp: any, context: string) {
  if (resp.ok()) return
  const status = resp.status()
  let body: any
  try { body = await resp.json() } catch { body = await resp.text() }
  throw new Error(`${context} failed: HTTP ${status} → ${typeof body === 'string' ? body : JSON.stringify(body)}`)
}

export async function createUser(request: APIRequestContext, plano_id?: string) {
  const doc = `${randomDigits(3)}.${randomDigits(3)}.${randomDigits(3)}-${randomDigits(2)}`
  const payload = {
    nome: `Teste ${randSuffix()}`,
    email: `e2e_${randSuffix()}@cobraii.dev`,
    telefone: `(11) 9 ${randomDigits(4)}-${randomDigits(4)}`,
    documento: doc,
    senha: 'senha123',
    plano_id: plano_id || null,
  }
  const resp = await request.post(`${API_URL}/usuarios/`, { data: payload })
  await expectOk(resp, 'createUser')
  return await resp.json()
}

export async function loginToken(request: APIRequestContext, email: string, senha: string) {
  const resp = await request.post(`${API_URL}/usuarios/login`, {
    form: { username: email, password: senha },
  })
  await expectOk(resp, 'loginToken')
  const data = await resp.json()
  return data?.access_token as string
}

export async function setTokenStorage(page: Page, token: string) {
  await page.addInitScript(([t]) => {
    localStorage.setItem('cobraii_token', t as string)
  }, [token])
}

export async function createCliente(request: APIRequestContext, token: string) {
  const payload = {
    nome: `Cliente ${randSuffix()}`,
    email: `cliente_${randSuffix()}@cobraii.dev`,
    telefone: `(11) 9 ${randomDigits(4)}-${randomDigits(4)}`,
    documento: `${randomDigits(2)}.${randomDigits(3)}.${randomDigits(3)}/${randomDigits(4)}-${randomDigits(2)}`
  }
  const resp = await request.post(`${API_URL}/clientes`, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` },
  })
  await expectOk(resp, 'createCliente')
  return await resp.json()
}
