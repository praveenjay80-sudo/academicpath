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
  anthropicKey: string
  onAnthropicKeySave: (key: string) => void
}

export default function TaxonomyBrowser({ onSearch, anthropicKey, onAnthropicKeySave }: Props) {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<Column[]>([])
  const [claudeError, setClaudeError] = useState<string | null>(null)
  // shown when L2 is attempted but no Anthropic key
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  // remember pending selection so we can retry after key is saved
  const pendingRef = useRef<{ colIdx: number; nodeId: string; colNodes: TaxonomyNode[]; breadcrumb: string } | null>(null)

  // Load L0 the first time the panel opens
  useEffect(() => {
    if (!open || columns.length > 0) return
    setColumns([{ nodes: [], loading: true, selectedId: '', level: 0 }])
    fetch('/api/taxonomy?level=0')
      .then((r) => r.json())
      .then((d) =>
        setColumns([{ nodes: d.nodes || [], loading: false, selectedId: '', level: 0 }])
      )
      .catch(() =>
        setColumns([{ nodes: [], loading: false, selectedId: '', level: 0 }])
      )
  }, [open, columns.length])

  function loadNextLevel(colIdx: number, nodeId: string, colNodes: TaxonomyNode[], key: string) {
    const node = colNodes.find((n) => n.id === nodeId)
    if (!node) return

    const nextLevel = colIdx + 1
    if (nextLevel > MAX_DEPTH) return

    setClaudeError(null)
    setShowKeyPrompt(false)

    // Add loading placeholder
    setColumns((prev) => [
      ...prev.slice(0, colIdx + 1),
      { nodes: [], loading: true, selectedId: '', level: nextLevel },
    ])

    const breadcrumb = columns
      .slice(0, colIdx)
      .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
      .filter(Boolean)
      .join(' › ')

    const fetcher: Promise<TaxonomyNode[]> =
      nextLevel <= 1
        ? fetch(`/api/taxonomy?parent=${node.id}&level=${nextLevel}`)
            .then((r) => r.json())
            .then((d) => d.nodes || [])
        : fetch(
            `/api/taxonomy/claude?` +
              new URLSearchParams({
                parentName: node.display_name,
                context: breadcrumb,
                level: String(nextLevel),
              }),
            { headers: { 'x-anthropic-key': key } }
          ).then(async (r) => {
            const d = await r.json()
            if (d.error) throw new Error(d.error)
            return d.nodes || []
          })

    fetcher
      .then((children) => {
        setColumns((prev) => {
          if (prev[colIdx]?.selectedId !== nodeId) return prev
          if (children.length === 0) return prev.slice(0, colIdx + 1)
          return [
            ...prev.slice(0, colIdx + 1),
            { nodes: children, loading: false, selectedId: '', level: nextLevel },
          ]
        })
      })
      .catch((err: Error) => {
        setColumns((prev) => prev.slice(0, colIdx + 1))
        setClaudeError(err.message || 'Failed to generate subfields')
      })
  }

  function handleSelect(colIdx: number, nodeId: string, colNodes: TaxonomyNode[]) {
    const node = colNodes.find((n) => n.id === nodeId)
    if (!node) return

    onSearch(node.display_name)

    const nextLevel = colIdx + 1

    // Update this column's selection, strip deeper columns
    setColumns((prev) => [
      ...prev.slice(0, colIdx),
      { ...prev[colIdx], selectedId: nodeId },
    ])

    if (nextLevel > MAX_DEPTH) return

    // L2+ requires Anthropic key
    if (nextLevel >= 2 && !anthropicKey) {
      const breadcrumb = columns
        .slice(0, colIdx)
        .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
        .filter(Boolean)
        .join(' › ')
      pendingRef.current = { colIdx, nodeId, colNodes, breadcrumb }
      setShowKeyPrompt(true)
      return
    }

    loadNextLevel(colIdx, nodeId, colNodes, anthropicKey)
  }

  function handleKeySave() {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setSavingKey(true)
    onAnthropicKeySave(trimmed)
    // retry the pending selection with the new key
    if (pendingRef.current) {
      const { colIdx, nodeId, colNodes } = pendingRef.current
      pendingRef.current = null
      loadNextLevel(colIdx, nodeId, colNodes, trimmed)
    }
    setKeyInput('')
    setSavingKey(false)
    setShowKeyPrompt(false)
  }

  const breadcrumb = columns
    .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
    .filter(Boolean)
    .join(' › ')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-3 py-1.5 mb-4"
      >
        <span>🗂️</span> Browse Academic Fields
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>🗂️</span>
          <h3 className="font-semibold text-gray-900 text-sm">Browse Academic Fields</h3>
          {anthropicKey && (
            <span className="text-[10px] text-indigo-400 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
              L2/L3 via Claude
            </span>
          )}
        </div>
        <button
          onClick={() => { setOpen(false); setColumns([]); setClaudeError(null); setShowKeyPrompt(false) }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <p className="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
          {breadcrumb}
        </p>
      )}

      {/* Cascading dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {columns.map((col, idx) => (
          <div key={`col-${idx}`} className="flex items-center gap-2">
            {idx > 0 && <span className="text-gray-300 text-base select-none">›</span>}
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

      {/* Inline Anthropic key prompt */}
      {showKeyPrompt && (
        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-xs font-semibold text-indigo-800 mb-1">
            🔑 Anthropic API key needed for L2/L3 subfields
          </p>
          <p className="text-xs text-indigo-600 mb-2">
            Get one free at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
              className="underline font-medium">console.anthropic.com</a>
            {' '}→ API Keys → Create Key (starts with sk-ant-…)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKeySave()}
              placeholder="sk-ant-…"
              className="flex-1 text-xs px-3 py-2 border border-indigo-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <button
              onClick={handleKeySave}
              disabled={savingKey || !keyInput.trim()}
              className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowKeyPrompt(false)}
              className="text-xs px-2 py-2 text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Claude error */}
      {claudeError && (
        <p className="text-xs text-red-500 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          ⚠️ {claudeError}
        </p>
      )}

      {/* Connection error */}
      {columns[0] && !columns[0].loading && columns[0].nodes.length === 0 && (
        <p className="text-xs text-red-400 mt-2">Could not load fields — check your connection.</p>
      )}
    </div>
  )
}
