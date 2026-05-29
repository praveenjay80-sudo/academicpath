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
  const [anthropicKey, setAnthropicKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [needKeyForLevel, setNeedKeyForLevel] = useState<number | null>(null)

  const keyRef = useRef('')
  useEffect(() => { keyRef.current = anthropicKey }, [anthropicKey])

  // Load stored Anthropic key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('anthropic_key') || ''
    setAnthropicKey(stored)
    keyRef.current = stored
  }, [])

  // Load L0 whenever the panel opens (no key required — uses OpenAlex)
  useEffect(() => {
    if (open && columns.length === 0) loadL0()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function loadL0() {
    setError(null)
    setNeedKeyForLevel(null)
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
    setNeedKeyForLevel(null)
    setError(null)
  }

  async function handleSelect(colIdx: number, nodeId: string, colNodes: TaxonomyNode[]) {
    const node = colNodes.find(n => n.id === nodeId)
    if (!node) return

    onSearch(node.display_name)
    setError(null)
    setNeedKeyForLevel(null)

    const nextLevel = colIdx + 1

    const updatedCols: Column[] = columns
      .slice(0, colIdx + 1)
      .map((col, i) => (i === colIdx ? { ...col, selectedId: nodeId } : col))

    if (nextLevel > MAX_DEPTH) {
      setColumns(updatedCols)
      return
    }

    const breadcrumb = updatedCols
      .slice(0, colIdx)
      .map(col => col.nodes.find(n => n.id === col.selectedId)?.display_name)
      .filter(Boolean)
      .join(' › ')

    // L2+ requires Anthropic key
    if (nextLevel >= 2 && !keyRef.current) {
      setColumns(updatedCols)
      setNeedKeyForLevel(nextLevel)
      return
    }

    setColumns([...updatedCols, { nodes: [], loading: true, selectedId: '', level: nextLevel }])

    let children: TaxonomyNode[] = []

    if (nextLevel <= 1) {
      // OpenAlex for L1
      try {
        const r = await fetch(`/api/taxonomy?parent=${node.id}&level=${nextLevel}`)
        const d = await r.json()
        if (d.error) throw new Error(d.error)
        children = d.nodes || []
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load'
        setColumns(updatedCols)
        setError(msg)
        return
      }
    } else {
      // Claude for L2/L3
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
        // L2 fallback: try OpenAlex
        if (nextLevel === 2) {
          try {
            const r2 = await fetch(`/api/taxonomy?parent=${node.id}&level=${nextLevel}`)
            const d2 = await r2.json()
            if (!d2.error && (d2.nodes || []).length > 0) {
              children = d2.nodes
            } else {
              setColumns(updatedCols)
              setError(`Claude error: ${msg}`)
              return
            }
          } catch {
            setColumns(updatedCols)
            setError(`Claude error: ${msg}`)
            return
          }
        } else {
          setColumns(updatedCols)
          setError(msg)
          return
        }
      }
    }

    if (children.length === 0) {
      setColumns(updatedCols)
      setError('No subfields found for this selection.')
      return
    }

    setColumns([
      ...updatedCols,
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
          onClick={() => { setOpen(false); setColumns([]); setError(null); setShowKeyInput(false); setNeedKeyForLevel(null) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>

      {/* Key input panel */}
      {showKeyInput && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-xs text-indigo-700 font-medium mb-1">
            Anthropic API key — needed for L2 Subfields and L3 Topics
          </p>
          <p className="text-xs text-indigo-500 mb-2">
            Get one at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
              className="underline">console.anthropic.com</a>
            {' '}→ API Keys → Create Key (starts with sk-ant-…)
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

      {/* Dropdowns — always rendered, no key gate */}
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
                onChange={e => e.target.value && handleSelect(idx, e.target.value, col.nodes)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer max-w-[240px]"
              >
                <option value="">{LEVEL_LABELS[col.level] ?? `Level ${col.level}`}…</option>
                {col.nodes.map(n => (
                  <option key={n.id} value={n.id} title={n.description}>
                    {n.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Inline prompt when Anthropic key is needed */}
      {needKeyForLevel !== null && !showKeyInput && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-amber-500">🔑</span>
          <p className="text-xs text-amber-700 flex-1">
            An Anthropic API key is needed to load{' '}
            <strong>{LEVEL_LABELS[needKeyForLevel] ?? `Level ${needKeyForLevel}`}s</strong>.
          </p>
          <button
            onClick={() => setShowKeyInput(true)}
            className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 hover:bg-indigo-100 font-medium flex-shrink-0"
          >
            Add key
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <span className="text-red-500 text-sm">⚠️</span>
          <div className="flex-1">
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
          <button
            onClick={() => { setError(null); setShowKeyInput(true) }}
            className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 hover:bg-indigo-100 font-medium flex-shrink-0"
          >
            🔑 Fix key
          </button>
        </div>
      )}
    </div>
  )
}
