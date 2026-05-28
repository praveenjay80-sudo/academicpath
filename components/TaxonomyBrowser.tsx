'use client'

import { useState, useEffect } from 'react'
import { TaxonomyNode } from '@/lib/types'

const LEVEL_LABELS = ['Field', 'Domain', 'Subfield', 'Topic']
const MAX_DEPTH = 3

interface Column {
  nodes: TaxonomyNode[]
  loading: boolean
  selectedId: string
  level: number
}

interface Props {
  onSearch: (query: string) => void
}

export default function TaxonomyBrowser({ onSearch }: Props) {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<Column[]>([])
  const [error, setError] = useState<string | null>(null)

  // Anthropic key lives here — self-contained, no prop threading
  const [anthropicKey, setAnthropicKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  // Load from localStorage once on mount
  useEffect(() => {
    setAnthropicKey(localStorage.getItem('anthropic_key') || '')
  }, [])

  // Load L0 when panel opens (and key is available)
  useEffect(() => {
    if (!open || columns.length > 0 || !anthropicKey) return
    loadL0()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anthropicKey])

  function loadL0() {
    setColumns([{ nodes: [], loading: true, selectedId: '', level: 0 }])
    setError(null)
    fetch('/api/taxonomy?level=0')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setColumns([{ nodes: d.nodes || [], loading: false, selectedId: '', level: 0 }])
      })
      .catch((e: Error) => {
        setError(e.message || 'Failed to load fields')
        setColumns([])
      })
  }

  function saveKey() {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem('anthropic_key', k)
    setAnthropicKey(k)
    setKeyInput('')
    setShowKeyInput(false)
    // If panel is open but columns not loaded yet, kick off L0
    if (open && columns.length === 0) {
      setColumns([{ nodes: [], loading: true, selectedId: '', level: 0 }])
      setError(null)
      fetch('/api/taxonomy?level=0')
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error)
          setColumns([{ nodes: d.nodes || [], loading: false, selectedId: '', level: 0 }])
        })
        .catch((e: Error) => {
          setError(e.message || 'Failed to load fields')
          setColumns([])
        })
    }
  }

  function handleSelect(colIdx: number, nodeId: string, colNodes: TaxonomyNode[]) {
    const node = colNodes.find((n) => n.id === nodeId)
    if (!node) return

    onSearch(node.display_name)
    setError(null)

    const nextLevel = colIdx + 1

    // Snapshot current selections before any state updates
    const currentSelections = columns.map((col) => col.selectedId)
    currentSelections[colIdx] = nodeId

    // Build updated columns with this selection, drop everything deeper
    const updatedCols: Column[] = columns.slice(0, colIdx + 1).map((col, i) =>
      i === colIdx ? { ...col, selectedId: nodeId } : col
    )

    if (nextLevel > MAX_DEPTH) {
      setColumns(updatedCols)
      return
    }

    // Append loading placeholder for next level
    setColumns([...updatedCols, { nodes: [], loading: true, selectedId: '', level: nextLevel }])

    // Build breadcrumb context for Claude from updated selections
    const breadcrumb = updatedCols
      .slice(0, colIdx)
      .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
      .filter(Boolean)
      .join(' › ')

    const useClaude = nextLevel >= 2

    const fetcher: Promise<TaxonomyNode[]> = useClaude
      ? fetch(
          `/api/taxonomy/claude?` +
            new URLSearchParams({
              parentName: node.display_name,
              context: breadcrumb,
              level: String(nextLevel),
            }),
          { headers: { 'x-anthropic-key': anthropicKey } }
        ).then(async (r) => {
          const d = await r.json()
          if (d.error) throw new Error(d.error)
          return d.nodes || []
        })
      : fetch(`/api/taxonomy?parent=${node.id}&level=${nextLevel}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.error) throw new Error(d.error)
            return d.nodes || []
          })

    fetcher
      .then((children) => {
        setColumns((prev) => {
          // Guard: if user changed selection while we were loading, discard
          if (prev[colIdx]?.selectedId !== nodeId) return prev
          const base = prev.slice(0, colIdx + 1)
          if (children.length === 0) return base
          return [...base, { nodes: children, loading: false, selectedId: '', level: nextLevel }]
        })
      })
      .catch((e: Error) => {
        setColumns((prev) => prev.slice(0, colIdx + 1))
        setError(e.message || 'Failed to load subfields')
      })
  }

  const breadcrumb = columns
    .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
    .filter(Boolean)
    .join(' › ')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-3 py-1.5 mb-4 transition-colors"
      >
        🗂️ Browse Academic Fields
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">🗂️ Browse Academic Fields</span>
          <button
            onClick={() => setShowKeyInput((v) => !v)}
            className="text-[10px] text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 hover:bg-indigo-100 transition-colors"
          >
            🔑 {anthropicKey ? 'Change key' : 'Add Anthropic key'}
          </button>
        </div>
        <button
          onClick={() => { setOpen(false); setColumns([]); setError(null); setShowKeyInput(false) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>

      {/* Anthropic key input — always accessible via the 🔑 button */}
      {showKeyInput && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-xs text-indigo-700 font-medium mb-1">
            Anthropic API key — needed for L2/L3 subfields (Claude)
          </p>
          <p className="text-xs text-indigo-500 mb-2">
            Get one at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
              className="underline">console.anthropic.com</a>
            {' '}→ API Keys → Create Key
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
              placeholder={anthropicKey ? '(key already saved — paste to replace)' : 'sk-ant-…'}
              className="flex-1 text-xs px-3 py-2 border border-indigo-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              autoFocus
            />
            <button
              onClick={saveKey}
              disabled={!keyInput.trim()}
              className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* No key yet — prompt before showing dropdowns */}
      {!anthropicKey && !showKeyInput && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Click <strong>🔑 Add Anthropic key</strong> above to enable field browsing.
        </p>
      )}

      {/* Breadcrumb */}
      {breadcrumb && (
        <p className="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
          {breadcrumb}
        </p>
      )}

      {/* Cascading dropdowns */}
      {anthropicKey && (
        <div className="flex flex-wrap items-center gap-2">
          {columns.map((col, idx) => (
            <div key={`col-${idx}`} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-300 select-none">›</span>}
              {col.loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
                  {col.level >= 2 && (
                    <span className="text-[10px] text-indigo-400 animate-pulse">Claude…</span>
                  )}
                </div>
              ) : col.nodes.length === 0 ? null : (
                <select
                  value={col.selectedId}
                  onChange={(e) => e.target.value && handleSelect(idx, e.target.value, col.nodes)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer max-w-[240px]"
                >
                  <option value="">{LEVEL_LABELS[col.level] ?? `Level ${col.level}`}…</option>
                  {col.nodes.map((n) => (
                    <option key={n.id} value={n.id} title={n.description}>
                      {n.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}
