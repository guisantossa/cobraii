export function Badge({ children, tone='ok' }){
  const map = { ok:'c-badge c-badge--ok', warn:'c-badge c-badge--warn', err:'c-badge c-badge--err' }
  return <span className={map[tone]}>{children}</span>
}