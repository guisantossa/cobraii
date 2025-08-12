import { useMemo, useState } from 'react'
import { Card } from './ui/Card'
import { Input } from './ui/Input'

export default function DataTable({ columns, rows, searchKeys=[] }){
  const [q, setQ] = useState('')
  const data = useMemo(()=>{
    if(!q) return rows
    const v = q.toLowerCase()
    return rows.filter(r=> searchKeys.some(k=> String(r[k]??'').toLowerCase().includes(v)))
  },[q, rows, searchKeys])

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Input placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} className="max-w-xs" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b" style={{borderColor:'var(--border)'}}>
              {columns.map(c=> <th key={c.key} className="py-2 pr-4 font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.length===0 && (
              <tr><td colSpan={columns.length} className="py-6 text-center text-slate-500">Nenhum registro encontrado</td></tr>
            )}
            {data.map((row, i)=> (
              <tr key={i} className={`border-b last:border-b-0 hover:bg-slate-50 ${i%2? 'bg-white':'bg-slate-50/30'}`} style={{borderColor:'var(--border)'}}>
                {columns.map(c=> <td key={c.key} className="py-2 pr-4 align-middle">{c.render? c.render(row[c.key], row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
