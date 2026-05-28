'use client'

import { useState, useEffect } from 'react'
import { TaxonomyNode } from '@/lib/types'

const LEVEL_LABELS = ['Field', 'Domain', 'Subfield', 'Topic', 'Specialty']
const MAX_DEPTH = 3  // L0 → L1 → L2 → L3

interface Column {
  nodes: TaxonomyNode[]
  loading: boolean
  selectedId: string
  level: number
}

interface Props {
  onSearch: (query: string) => void
  anthropicKey: string
}

export default function TaxonomyBrowser({ onSearch, anthropicKey }: Props) {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<Column[]>([])
  const [claudeError, setClaudeError] = useState<string | null>(null)

  // Load L0 the first time the panel is opened
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

  // colNodes is passed from JSX so we always have fresh node objects at call time
  function handleSelect(colIdx: number, nodeId: string, colNodes: TaxonomyNode[]) {
    const node = colNodes.find((n) => n.id === nodeId)
    if (!node) return

    onSearch(node.display_name)

    const nextLevel = colIdx + 1

    // Breadcrumb built from the current columns snapshot (fresh via closure)
    const breadcrumb = columns
      .slice(0, colIdx)
      .map((col) => col.nodes.find((n) => n.id === col.selectedId)?.display_name)
      .filter(Boolean)
      .join(' › ')

    // Update selection and add loading placeholder for next level
    setColumns((prev) => {
      const updated: Column[] = [
        ...prev.slice(0, colIdx),
        { ...prev[colIdx], selectedId: nodeId },
      ]
      if (nextLevel > MAX_DEPTH) return updated
      return [...updated, { nodes: [], loading: true, selectedId: '', level: nextLevel }]
    })

    if (nextLevel > MAX_DEPTH) return

    setClaudeError(null)

    // L0→L1: OpenAlex (reliable at this depth)
    // L1→L2, L2→L3: Claude (OpenAlex hierarchy is noisy past L1)
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
            { headers: { 'x-anthropic-key': anthropicKey } }
          )
            .then(async (r) => {
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
        setClaudeError(err.message || 'Failed to load subfields')
        setColumns((prev) => prev.slice(0, colIdx + 1))
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
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-3 py-1.5"
      >
        <span>🗂️</span> Browse Academic Fields
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>🗂️</span>
          <h3 className="font-semibold text-gray-900 text-sm">Browse Academic Fields</h3>
          <span className="text-[10px] text-indigo-400 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
            L2+ powered by Claude
          </span>
        </div>
        <button
          onClick={() => { setOpen(false); setColumns([]); setClaudeError(null) }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {breadcrumb && (
        <p className="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
          {breadcrumb}
        </p>
      )}

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
                onChange={(e) =>
                  e.target.value && handleSelect(idx, e.target.value, col.nodes)
                }
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer max-w-[240px]"
              >
                <option value="">
                  {LEVEL_LABELS[col.level] ?? `Level ${col.level}`}…
                </option>
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

      {columns[0] && !columns[0].loading && columns[0].nodes.length === 0 && (
        <p className="text-xs text-red-400 mt-2">
          Could not load fields — check your connection.
        </p>
      )}

      {claudeError && (
        <p className="text-xs text-red-500 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          ⚠️ {claudeError}
        </p>
      )}
    </div>
  )
}
