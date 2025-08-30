import { checkFunnelProgress } from '../services/onboarding'

export async function afterLoginRedirect(navigate) {
  try {
    const p = await checkFunnelProgress()
    if (!p.temCliente || !p.temLembrete) {
      navigate('/onboarding')
    } else {
      navigate('/dashboard') // ou seu dashboard
    }
  } catch {
    navigate('/dashboard')
  }
}