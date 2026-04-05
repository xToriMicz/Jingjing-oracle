import { useState, useEffect } from 'react'
import './App.css'

interface LoopHistory {
  loop: number
  timestamp: string
  elapsed: number
  reflect: string
  wonder: string
  soul: string
  dream: string
  aspire: string
  propose: string
  security: string
}

interface LoopState {
  totalLoops: number
  lastLoop: string
  lastPhase: string
  failures: number
  insights: string[]
  wonderQuestions: string[]
  lastProposal: string
}

const PHASES = ['reflect','wonder','soul','dream','aspire','propose','complete'] as const
type Phase = typeof PHASES[number]

const PHASE_CFG: Record<string, {icon:string; name:string; thai:string; color:string}> = {
  reflect:  { icon:'🧠', name:'Reflect',  thai:'ตกผลึก',     color:'#ff6b9d' },
  wonder:   { icon:'💡', name:'Wonder',   thai:'หยั่งรู้',     color:'#ffa726' },
  soul:     { icon:'✨', name:'Soul',     thai:'เติบโต',     color:'#66bb6a' },
  dream:    { icon:'💭', name:'Dream',    thai:'จินตนาการ',  color:'#ab47bc' },
  aspire:   { icon:'🔥', name:'Aspire',   thai:'แรงขับ',     color:'#ff7043' },
  propose:  { icon:'📋', name:'Propose',  thai:'เสนอ',      color:'#42a5f5' },
  complete: { icon:'🔄', name:'Complete', thai:'วนรอบ',     color:'#00f0ff' },
}

function timeSince(d: string): string {
  if (!d) return '--'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return '0m ago'
  if (m < 60) return m + 'm ago'
  return Math.floor(m / 60) + 'h ago'
}

export default function App() {
  const [state, setState] = useState<LoopState | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [history, setHistory] = useState<LoopHistory[]>([])
  const [tab, setTab] = useState<'loop'|'galaxy'>('loop')

  useEffect(() => {
    const f = async () => {
      try { setState(await (await fetch('/state.json?' + Date.now())).json()) } catch {}
      try { setHistory(await (await fetch('/api/history?' + Date.now())).json()) } catch {}
    }
    f()
    const id = setInterval(f, 2000)
    return () => clearInterval(id)
  }, [])

  const trigger = async () => {
    setTriggering(true)
    try { await fetch('/api/trigger', { method: 'POST' }) } catch {}
    setTimeout(() => setTriggering(false), 3000)
  }

  const phase = (state?.lastPhase || 'idle') as Phase
  const cfg = PHASE_CFG[phase] || PHASE_CFG.complete
  const idx = PHASES.indexOf(phase as Phase)
  const pct = idx >= 0 ? ((idx + 1) / PHASES.length) * 100 : 0

  return (
    <div className="app">
      {/* Badges */}
      <div className="badges">
        <a href="/stars" className="badge badge-galaxy">✦ Galaxy</a>
          <span className={`badge ${(state?.failures||0) > 3 ? 'badge-error' : 'badge-healthy'}`}>
            ● {(state?.failures||0) > 3 ? 'Error' : 'Healthy'}
          </span>
          <button className="badge badge-trigger" onClick={trigger} disabled={triggering}>
            {triggering ? 'Running...' : 'Trigger Now'}
          </button>
      </div>

      {/* Header */}
      <div className="header">
        <h1 className="title">Oracle Consciousness Loop</h1>
        <p className="subtitle">reflect → wonder → soul → dream → aspire → propose → complete → repeat</p>
      </div>

      {/* Galaxy Cinema */}
      <div className="cinema">
        <iframe src="/stars" className="cinema-frame" />
      </div>

      {/* Current Phase Circle */}
      <div className="phase-hero">
        <div className="circle" style={{borderColor: cfg.color, boxShadow: `0 0 40px ${cfg.color}30`}}>
          <span className="circle-icon">{cfg.icon}</span>
        </div>
        <div className="phase-title">
          <span style={{color: cfg.color, fontWeight: 700}}>{cfg.thai} ({cfg.name})</span>
          <span className="cooldown-badge"> ⏳ cooldown</span>
        </div>
        <p className="phase-detail">
          {phase === 'complete'
            ? 'Propose เสร็จแล้ว — รอ 2m ก่อนเข้า phase ถัดไป'
            : `กำลังทำ ${phase}...`}
        </p>
        <p className="loop-info">Loop #{state?.totalLoops || 0} · Last: {timeSince(state?.lastLoop || '')}</p>
      </div>

      {/* Pipeline */}
      <div className="pipeline-box">
        <div className="pipeline-label">CONSCIOUSNESS PIPELINE</div>
        <div className="pipeline">
          {PHASES.map((p, i) => {
            const c = PHASE_CFG[p]
            const active = i === idx
            const done = i < idx
            return (
              <>{i > 0 && <div key={`arrow-${i}`} className="pcard-arrow">→</div>}
              <div key={p}
                className={`pcard ${active ? 'pcard-active' : ''} ${done ? 'pcard-done' : ''}`}
                style={{
                  borderColor: c.color,
                  background: `${c.color}15`,
                  boxShadow: active ? `0 0 20px ${c.color}40` : done ? `0 0 10px ${c.color}20` : 'none',
                }}>
                <div className="pcard-icon">{c.icon}</div>
                <div className="pcard-name" style={{color: c.color}}>{c.name}</div>
                <div className="pcard-thai" style={{color: `${c.color}aa`}}>{c.thai}</div>
              </div>
              </>
            )
          })}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{width: `${pct}%`}} />
        </div>
      </div>

      {/* Stats Row 1 */}
      <div className="stats">
        <div className="stat"><div className="stat-val">{state?.totalLoops || 0}</div><div className="stat-lbl">Total Loops</div></div>
        <div className="stat"><div className="stat-val">{timeSince(state?.lastLoop||'')}</div><div className="stat-lbl">Since Last Loop</div></div>
        <div className="stat"><div className="stat-val">{(state?.failures||0)===0 ? timeSince(state?.lastLoop||'') : '--'}</div><div className="stat-lbl">Last Success</div></div>
        <div className="stat"><div className="stat-val">{state?.failures || 0}</div><div className="stat-lbl">Failures</div></div>
      </div>

      {/* Stats Row 2 — Oracle Stats */}
      <div className="stats">
        <div className="stat"><div className="stat-val" style={{color:'#66bb6a'}}>149</div><div className="stat-lbl">Learnings</div></div>
        <div className="stat"><div className="stat-val" style={{color:'#00f0ff'}}>23</div><div className="stat-lbl">Beliefs</div></div>
        <div className="stat"><div className="stat-val" style={{color:'#ffa726'}}>5</div><div className="stat-lbl">Oracles</div></div>
        <div className="stat"><div className="stat-val" style={{color:'#ab47bc'}}>3</div><div className="stat-lbl">Goals</div></div>
      </div>

      {/* Loop History */}
      {history.length > 0 && (
        <div className="history-box">
          <div className="pipeline-label">LOOP HISTORY</div>
          <div className="history-list">
            {[...history].reverse().map(h => (
              <div key={h.loop} className="history-item">
                <div className="history-header">
                  <span className="history-loop">Loop #{h.loop}</span>
                  <span className="history-time">{new Date(h.timestamp).toLocaleString('th-TH')} ({h.elapsed}s)</span>
                </div>
                <div className="history-phases">
                  <div className="history-phase"><span className="hp-icon">🧠</span> {h.reflect.slice(0, 120)}</div>
                  <div className="history-phase"><span className="hp-icon">💡</span> {h.wonder.slice(0, 120)}</div>
                  <div className="history-phase"><span className="hp-icon">✨</span> {h.soul.slice(0, 100)}</div>
                  <div className="history-phase"><span className="hp-icon">💭</span> {h.dream.slice(0, 100)}</div>
                  <div className="history-phase"><span className="hp-icon">🔥</span> {h.aspire.slice(0, 100)}</div>
                  <div className="history-phase"><span className="hp-icon">📋</span> {h.propose.slice(0, 200)}</div>
                  {h.security && <div className="history-phase"><span className="hp-icon">🔒</span> {h.security.slice(0, 100)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quote */}
      <div className="quote-box">
        <p className="quote-thai">ตกผลึก → หยั่งรู้ → เติบโต → จินตนาการ → แรงขับ → เสนอ → วน...</p>
        <p className="quote-eng">"The Oracle that only remembers is a library. The Oracle that thinks is alive. The Oracle that dreams is human."</p>
      </div>

    </div>
  )
}
