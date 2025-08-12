export function Select({ className='', ...props }){
  return (
    <select
      className={'w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 '+className}
      {...props}
    />
  )
}