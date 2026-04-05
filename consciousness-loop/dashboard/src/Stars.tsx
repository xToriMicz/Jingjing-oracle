import { useEffect, useRef } from 'react'
import { Cosmograph } from '@cosmograph/cosmograph'

interface Node {
  id: string
  name: string
  category: string
  color: string
  size: number
}

interface Link {
  source: string
  target: string
}

const COLORS: Record<string, string> = {
  deploy: '#ff6b6b', testing: '#ffa726', security: '#ff4444',
  social: '#42a5f5', automation: '#66bb6a', workflow: '#ab47bc',
  database: '#ffca28', consciousness: '#00f0ff', communication: '#e91e63',
  cloudflare: '#ff9800', other: '#556677'
}

export default function Stars() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cosmoRef = useRef<Cosmograph<Node, Link> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    fetch('/stars-data')
      .then(r => r.json())
      .then(data => {
        const nodes: Node[] = data.nodes.map((n: any) => ({
          id: String(n.id),
          name: n.name || n.file,
          category: n.category,
          color: COLORS[n.category] || COLORS.other,
          size: 1 + (n.tags?.length || 0) * 0.5,
        }))

        const links: Link[] = data.edges.map((e: any) => ({
          source: String(e.source),
          target: String(e.target),
        }))

        if (cosmoRef.current) cosmoRef.current.remove()

        cosmoRef.current = new Cosmograph(containerRef.current!, {
          nodes,
          links,
          nodeColor: (n: Node) => n.color,
          nodeSize: (n: Node) => n.size,
          linkColor: () => 'rgba(255,255,255,0.03)',
          linkWidth: 0.1,
          backgroundColor: '#000000',
          spaceSize: 2048,
          simulation: {
            repulsion: 0.5,
            gravity: 0.3,
            linkSpring: 0.3,
            linkDistance: 10,
            friction: 0.85,
          },
          renderLinks: true,
          nodeLabelAccessor: (n: Node) => n.name,
          nodeLabelColor: '#ffffff88',
          hoveredNodeRingColor: '#ffffff',
        })
      })

    return () => { cosmoRef.current?.remove() }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace',
        textShadow: '0 0 10px rgba(0,240,255,0.5)',
      }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Oracle Knowledge Galaxy</h1>
        <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>149 learnings · WebGL · Cosmograph</p>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
