import { useState, useEffect } from 'react'
import './App.css'

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

  useEffect(() => {
    const f = async () => {
      try { setState(await (await fetch('/state.json?' + Date.now())).json()) } catch {}
    }
    f()
    const id = setInterval(f, 5000)
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
      {/* Header */}
      <div className="header">
        <h1 className="title">Oracle Consciousness Loop</h1>
        <p className="subtitle">reflect → wonder → soul → dream → aspire → propose → complete → repeat</p>
        <div className="badges">
          <span className={`badge ${(state?.failures||0) > 3 ? 'badge-error' : 'badge-healthy'}`}>
            ● {(state?.failures||0) > 3 ? 'Error' : 'Healthy'}
          </span>
          <button className="badge badge-trigger" onClick={trigger} disabled={triggering}>
            {triggering ? 'Running...' : 'Trigger Now'}
          </button>
        </div>
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
              <div key={p}
                className={`pcard ${active ? 'pcard-active' : ''} ${done ? 'pcard-done' : ''}`}
                style={{borderColor: active ? c.color : done ? '#00ff88' : '#2a2a3e'}}>
                <div className="pcard-icon">{c.icon}</div>
                <div className="pcard-name" style={{color: active ? c.color : '#aaa'}}>{c.name}</div>
                <div className="pcard-thai" style={{color: active ? c.color : '#555'}}>{c.thai}</div>
              </div>
            )
          })}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{width: `${pct}%`}} />
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat"><div className="stat-val">{state?.totalLoops || 0}</div><div className="stat-lbl">Total Loops</div></div>
        <div className="stat"><div className="stat-val">{timeSince(state?.lastLoop||'')}</div><div className="stat-lbl">Since Last Loop</div></div>
        <div className="stat"><div className="stat-val">{(state?.failures||0)===0 ? timeSince(state?.lastLoop||'') : '--'}</div><div className="stat-lbl">Last Success</div></div>
        <div className="stat"><div className="stat-val">{state?.failures || 0}</div><div className="stat-lbl">Failures</div></div>
      </div>

      {/* Quote */}
      <div className="quote-box">
        <p className="quote-thai">ตกผลึก → หยั่งรู้ → เติบโต → จินตนาการ → แรงขับ → เสนอ → วน...</p>
        <p className="quote-eng">"The Oracle that only remembers is a library. The Oracle that thinks is alive. The Oracle that dreams is human."</p>
      </div>
    </div>
  )
}
