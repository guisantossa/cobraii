// e2e/lembretes.upgrade.spec.ts
import { test, expect } from '@playwright/test'
import { createUser, loginToken, setTokenStorage, createCliente, randSuffix } from './utils'

test('Criar lembrete com SMS no Free dispara UpgradeCTA (403)', async ({ page, request }) => {
  const user = await createUser(request)
  const token = await loginToken(request, user.email, 'senha123')
  await setTokenStorage(page, token)

  const cli = await createCliente(request, token)

  await page.goto(`/lembretes/novo?cliente_id=${cli.id}`)
  await page.getByLabel('Título').fill(`Cobrança ${randSuffix()}`)
  await page.getByLabel(/Corpo/i).fill('Olá {{cliente.nome}}, teste E2E.')

  // Canais
  await page.getByRole('checkbox', { name: /sms/i }).check()
  await page.getByRole('checkbox', { name: /whatsapp|zap/i }).check()

  // Data e hora
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  await page.getByLabel(/Data de início/i).fill(`${yyyy}-${mm}-${dd}`)
  await page.getByLabel(/Horário/i).fill('09:00')

  // Salvar — botão do FORM
  await page.locator('form').getByRole('button', { name: /^salvar$/i }).click()

  // Modal de upgrade
  await expect(page.getByText(/liberar mais lembretes/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /ver planos/i })).toBeVisible()

  // Fechar
  await page.getByRole('button', { name: /agora não/i }).click()
  await expect(page.getByText(/liberar mais lembretes/i)).toBeHidden()
})
