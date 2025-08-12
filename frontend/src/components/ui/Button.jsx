import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

export default function Button({ className, variant='primary', size='md', as='button', ...props }){
  const Comp = as
  const base = 'c-btn'
  const variants = {
    primary: 'c-btn--primary',
    ghost: 'c-btn--ghost',
    danger: 'c-btn--danger',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: '', lg: 'px-5 py-3 text-base' }
  return <Comp className={twMerge(clsx(base, variants[variant], sizes[size], className))} {...props} />
}