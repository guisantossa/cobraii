// e2e/auth.onboarding.spec.ts
import { test, expect } from '@playwright/test'
import { createUser, loginToken, setTokenStorage } from './utils'

test('Onboarding carrega e mostra passos', async ({ page, request }) => {
  const user = await createUser(request)
  const token = await loginToken(request, user.email, 'senha123')
  await setTokenStorage(page, token)

  await page.goto('/onboarding')

  // aceita "3 passos" ou "4 passos"
  await expect(page.getByRole('heading', { name: /comece em .* passos/i })).toBeVisible()

  // Passo "Cadastro concluído"
  await expect(page.getByText(/cadastro conclu[ií]do/i)).toBeVisible()
})
