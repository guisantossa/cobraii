export function Label({ children, htmlFor }){
  return <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>
}