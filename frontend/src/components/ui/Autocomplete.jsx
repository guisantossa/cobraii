// src/components/ui/Autocomplete.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Input } from './Input'

/**
 * Autocomplete (sem libs externas)
 * Props:
 * - items: Array<any>
 * - value: string (texto exibido no input)
 * - onChangeText: (text) => void
 * - onSelect: (item) => void
 * - getItemLabel: (item) => string
 * - placeholder?: string
 * - disabled?: boolean
 * - inputProps?: object (repasse para <Input/>)
 */
export default function Autocomplete({
  items = [],
  value = '',
  onChangeText,
  onSelect,
  getItemLabel = (i) => String(i ?? ''),
  placeholder,
  disabled,
  inputProps = {},
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const listRef = useRef(null)
  const boxRef = useRef(null)

  const normalize = (v) =>
    (v ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const list = useMemo(() => {
    const q = normalize(value)
    if (!q) return items.slice(0, 20)
    return items.filter((it) => normalize(getItemLabel(it)).includes(q)).slice(0, 20)
  }, [items, value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && list[highlight]) selectItem(list[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function selectItem(item) {
    onSelect?.(item)
    setOpen(false)
    setHighlight(-1)
  }

  function handleInputChange(e) {
    onChangeText?.(e.target.value)
    setOpen(true)
    setHighlight(-1)
  }

  function clear() {
    onChangeText?.('')
    setOpen(false)
    setHighlight(-1)
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={value}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            {...inputProps}
          />
        </div>
        {value && (
          <button type="button" className="c-btn c-btn--ghost" onClick={clear} aria-label="Limpar">
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          className="c-btn c-btn--ghost"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir lista"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm max-h-64 overflow-auto"
        >
          {list.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Sem resultados</div>
          )}
          {list.map((item, idx) => (
            <div
              key={idx}
              data-idx={idx}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(item)}
              className={
                'px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ' +
                (highlight === idx ? 'bg-slate-100' : '')
              }
            >
              {getItemLabel(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
