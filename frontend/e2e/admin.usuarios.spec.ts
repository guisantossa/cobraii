// e2e/admin.usuarios.spec.ts
import { test, expect } from '@playwright/test'
import { loginToken, setTokenStorage } from './utils'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

test.describe('Admin > Usuários', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Defina ADMIN_EMAIL e ADMIN_PASSWORD no e2e/.env.e2e')

  test('Carrega métricas e lista', async ({ page, request }) => {
    let token: string | null = null
    try {
      token = await loginToken(request, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    } catch (e: any) {
      test.skip(true, `Admin login falhou (${e?.message || e}) — verifique credenciais e is_admin.`)
    }
    await setTokenStorage(page, token!)
    await page.goto('/admin/usuarios')

    await expect(page.getByRole('heading', { name: /usuários/i })).toBeVisible()
    await expect(page.getByText(/lembretes ativos/i)).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /plano/i })).toBeVisible()
  })
})
