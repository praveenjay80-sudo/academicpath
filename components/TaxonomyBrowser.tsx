'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [generating, setGenerating] = useState(false)
  const [anthropicKey, setAnthropicKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [needKey, setNeedKey] = useState(false)

  const keyRef = useRef('')
  useEffect(() => { keyRef.current = anthropicKey }, [anthropicKey])

  useEffect(() => {
    const stored = localStorage.getItem('anthropic_key') || ''
    setAnthropicKey(stored)
    keyRef.current = stored
  }, [])

  useEffect(() => {
    if (open && columns.length === 0) loadL0()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function loadL0() {
    setError(null)
    setNeedKey(false)
    setColumns([{ nodes: [], loading: true, selectedId: '', level: 0 }])
    fetch('/api/taxonomy?level=0')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setColumns([{ nodes: d.nodes || [], loading: false, selectedId: '', level: 0 }])
      })
      .catch((e: Error) => {
        setError(e.message)
        setColumns([])
      })
  }

  function saveKey() {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem('anthropic_key', k)
    setAnthropicKey(k)
    keyRef.current = k
    setKeyInput('')
    setShowKeyInput(false)
    setNeedKey(false)
    setError(null)
  }

  // Selecting a dropdown just records the choice — does NOT auto-fetch
  function handleSelect(colIdx: number, nodeId: string, colNodes: TaxonomyNode[]) {
    const node = colNodes.find(n => n.id === nodeId)
    if (!node) return
    onSearch(node.display_name)
    setError(null)
    setNeedKey(false)
    const newCols = columns
      .slice(0, colIdx + 1)
      .map((col, i) => (i === colIdx ? { ...col, selectedId: nodeId } : col))
    setColumns(newCols)
  }

  // Explicit button: generate the next level for the currently selected node
  async function handleGenerate(targetColIdx: number) {
    if (generating) return
    const col = columns[targetColIdx]
    if (!col?.selectedId) return
    const node = col.nodes.find(n => n.id === col.selectedId)
    if (!node) return

    const nextLevel = targetColIdx + 1
    if (nextLevel > MAX_DEPTH) return

    if (!keyRef.current) {
      setNeedKey(true)
      return
    }

    setError(null)
    setNeedKey(false)
    setGenerating(true)

    const breadcrumb = columns
      .slice(0, targetColIdx)
      .map(c => c.nodes.find(n => n.id === c.selectedId)?.display_name)
      .filter(Boolean)
      .join(' › ')

    const base = columns
      .slice(0, targetColIdx + 1)
      .map((c, i) => (i === targetColIdx ? { ...c } : c))

    setColumns([...base, { nodes: [], loading: true, selectedId: '', level: nextLevel }])

    let children: TaxonomyNode[] = []
    const key = keyRef.current

    try {
      const r = await fetch(
        `/api/taxonomy/claude?` + new URLSearchParams({
          parentName: node.display_name,
          context: breadcrumb,
          level: String(nextLevel),
        }),
        { headers: { 'x-anthropic-key': key } }
      )
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      children = d.nodes || []
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Claude request failed'
      // Fallback: try OpenAlex
      try {
        const r2 = await fetch(`/api/taxonomy?parent=${node.id}&level=${nextLevel}`)
        const d2 = await r2.json()
        if (!d2.error && (d2.nodes || []).length > 0) {
          children = d2.nodes
        } else {
          setColumns(base)
          setError(msg)
          setGenerating(false)
          return
        }
      } catch {
        setColumns(base)
        setError(msg)
        setGenerating(false)
        return
      }
    }

    setGenerating(false)

    if (children.length === 0) {
      setColumns(base)
      setError('Claude returned no results — try again.')
      return
    }

    setColumns([
      ...base,
      { nodes: children, loading: false, selectedId: '', level: nextLevel },
    ])
  }

  const breadcrumb = columns
    .map(col => col.nodes.find(n => n.id === col.selectedId)?.display_name)
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
            onClick={() => setShowKeyInput(v => !v)}
            className="text-[10px] text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 hover:bg-indigo-100 transition-colors"
          >
            🔑 {anthropicKey ? 'Change key' : 'Add Anthropic key'}
          </button>
        </div>
        <button
          onClick={() => { setOpen(false); setColumns([]); setError(null); setShowKeyInput(false); setNeedKey(false) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>

      {/* Key input */}
      {showKeyInput && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-xs text-indigo-700 font-medium mb-1">
            Anthropic API key — generates Domains, Subfields &amp; Topics with Claude
          </p>
          <p className="text-xs text-indigo-500 mb-2">
            Get one at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">
              console.anthropic.com
            </a>{' '}
            → API Keys → Create Key (starts with sk-ant-…)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder={anthropicKey ? '(saved — paste new key to replace)' : 'sk-ant-…'}
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

      {/* Breadcrumb */}
      {breadcrumb && (
        <p className="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
          {breadcrumb}
        </p>
      )}

      {/* Columns + generate buttons */}
      <div className="space-y-3">
        {columns.map((col, idx) => (
          <div key={`col-${idx}`} className="flex flex-wrap items-center gap-2">
            {/* Dropdown or loading skeleton */}
            {col.loading ? (
              <div className="flex items-center gap-1.5">
                <div className="h-8 w-44 bg-gray-100 rounded-lg animate-pulse" />
                <span className="text-[10px] text-indigo-400 animate-pulse">Claude generating…</span>
              </div>
            ) : col.nodes.length > 0 ? (
              <select
                value={col.selectedId}
                onChange={e => e.target.value && handleSelect(idx, e.target.value, col.nodes)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer max-w-[260px]"
              >
                <option value="">{LEVEL_LABELS[col.level] ?? `Level ${col.level}`}…</option>
                {col.nodes.map(n => (
                  <option key={n.id} value={n.id} title={n.description}>
                    {n.display_name}
                  </option>
                ))}
              </select>
            ) : null}

            {/* Generate button: show after this column has a selection and next level is in range */}
            {!col.loading && col.selectedId && idx + 1 <= MAX_DEPTH && idx === columns.length - 1 && (
              <button
                onClick={() => handleGenerate(idx)}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>✨ Generate {LEVEL_LABELS[idx + 1] ?? `L${idx + 1}`}s</>
                )}
              </button>
            )}

            {/* Regenerate button: show if next level already exists */}
            {!col.loading && col.selectedId && idx + 1 <= MAX_DEPTH && idx < columns.length - 1 && !columns[idx + 1]?.loading && (
              <button
                onClick={() => handleGenerate(idx)}
                disabled={generating}
                className="text-[10px] text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-40"
                title={`Regenerate ${LEVEL_LABELS[idx + 1] ?? `L${idx + 1}`}s`}
              >
                ↺
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Need key prompt */}
      {needKey && !showKeyInput && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-amber-500">🔑</span>
          <p className="text-xs text-amber-700 flex-1">
            Add an <strong>Anthropic API key</strong> to generate subfields with Claude.
          </p>
          <button
            onClick={() => setShowKeyInput(true)}
            className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 hover:bg-indigo-100 font-medium"
          >
            Add key
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <span className="text-red-500 text-sm">⚠️</span>
          <p className="text-xs text-red-700 font-medium flex-1">{error}</p>
          <button
            onClick={() => { setError(null); setShowKeyInput(true) }}
            className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 hover:bg-indigo-100 font-medium"
          >
            🔑 Fix key
          </button>
        </div>
      )}
    </div>
  )
}
