// e2e/clientes.spec.ts
import { test, expect } from '@playwright/test'
import { createUser, loginToken, setTokenStorage } from './utils'

test('Criar cliente e aparecer na listagem', async ({ page, request }) => {
  const user = await createUser(request)
  const token = await loginToken(request, user.email, 'senha123')
  await setTokenStorage(page, token)

  await page.goto('/clientes/novo')

  await page.getByLabel('Nome').fill('Fulano E2E')
  await page.getByLabel('E-mail').fill('fulano.e2e@cobraii.dev')
  await page.getByLabel('Telefone').fill('(11) 9 9999-1111')
  await page.getByLabel(/Documento/i).fill('123.456.789-10')

  await page.getByRole('button', { name: /salvar/i }).click()

  // redireciona para lista
  await expect(page).toHaveURL(/\/clientes$/)
  await expect(page.getByText('Fulano E2E')).toBeVisible()
  await expect(page.getByText('fulano.e2e@cobraii.dev')).toBeVisible()
})
