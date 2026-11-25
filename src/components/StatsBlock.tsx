import type { Stats } from '../api'
import type { LocalStats } from '../stats'

function Bars({ dist }: { dist: Record<string, number> }) {
  const keys = ['1', '2', '3', '4', '5', '6', 'lost']
  const max = Math.max(1, ...keys.map((k) => dist[k] ?? 0))
  return (
    <ul className="bars">
      {keys.map((k) => (
        <li key={k}>
          <span className="bar-label">{k === 'lost' ? '✕' : k}</span>
          <span className="bar-track">
            <span className={`bar-fill${k === 'lost' ? ' is-lost' : ''}`} style={{ width: `${Math.max(6, ((dist[k] ?? 0) / max) * 100)}%` }}>
              {dist[k] ?? 0}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function StatsBlock({ local, global }: { local: LocalStats; global: Stats | null }) {
  const pct = local.plays ? Math.round((local.wins / local.plays) * 100) : 0
  return (
    <div className="stats">
      <h3 className="display">Tes stats</h3>
      <dl className="stat-grid">
        <div><dt>Parties</dt><dd>{local.plays}</dd></div>
        <div><dt>Victoires</dt><dd>{pct}%</dd></div>
        <div><dt>Série</dt><dd>{local.streak}</dd></div>
        <div><dt>Record</dt><dd>{local.maxStreak}</dd></div>
      </dl>
      <Bars dist={local.distribution} />
      {global && global.plays > 0 && (
        <>
          <h3 className="display">Tous les joueurs</h3>
          <p className="muted">
            {global.plays} partie{global.plays > 1 ? 's' : ''}, {Math.round((global.wins / global.plays) * 100)}% de réussite
          </p>
          <Bars dist={global.distribution} />
        </>
      )}
    </div>
  )
}
