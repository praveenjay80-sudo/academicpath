import { OpenAlexConcept } from '@/lib/types'

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Field',
  1: 'Domain',
  2: 'Area',
  3: 'Topic',
}

export default function ConceptCard({ concept }: { concept: OpenAlexConcept }) {
  const levelLabel = LEVEL_LABELS[concept.level] ?? `L${concept.level}`

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-violet-200 transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <a
          href={concept.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 hover:text-violet-600 leading-snug transition-colors"
        >
          {concept.display_name}
        </a>
        <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 flex-shrink-0">
          {levelLabel}
        </span>
      </div>

      {concept.description && (
        <p className="text-xs text-gray-500 mb-2 leading-snug line-clamp-2">
          {concept.description}
        </p>
      )}

      <span className="text-xs text-gray-500">
        📄 <span className="font-medium text-gray-700">{formatCount(concept.works_count)}</span>{' '}
        works
      </span>
    </div>
  )
}
