export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Anonymous">
    <div className="brand-mark"><span>A</span></div>
    {!compact && <div><strong>ANONYMOUS</strong><small>SEEN. GONE.</small></div>}
  </div>
}
