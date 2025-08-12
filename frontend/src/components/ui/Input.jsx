export function Input({ className='', error, ...props }){
  return (
    <input
      className={
        'w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ' +
        (error
          ? 'border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]'
          : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20') +
        ' ' + className
      }
      {...props}
    />
  )
}