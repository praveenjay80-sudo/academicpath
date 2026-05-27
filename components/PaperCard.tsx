import { Paper, PaperTag } from '@/lib/types'

const TAG_CONFIG: Record<PaperTag, { bg: string; text: string; label: string }> = {
  FOUNDATIONAL: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    label: '🟡 Foundational',
  },
  SURVEY: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: '🟢 Survey / Review',
  },
  RECENT: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: '🔵 Recent',
  },
  INFLUENTIAL: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: '⚪ Influential',
  },
}

function formatCitations(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

interface Props {
  paper: Paper
}

export default function PaperCard({ paper }: Props) {
  const tag = TAG_CONFIG[paper.tag]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-gray-300 transition-all">
      {/* Tag */}
      <div className="mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tag.bg} ${tag.text}`}>
          {tag.label}
        </span>
      </div>

      {/* Title */}
      <a
        href={paper.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 leading-snug block mb-1 transition-colors"
      >
        {paper.title}
      </a>

      {/* Authors + Year */}
      <p className="text-xs text-gray-500 mb-3">
        {paper.authors}
        {paper.year ? ` · ${paper.year}` : ''}
      </p>

      {/* Metrics */}
      <div className="flex items-center gap-3 flex-wrap">
        {paper.citations > 0 && (
          <span className="text-xs text-gray-700 flex items-center gap-1">
            <span className="font-bold text-gray-900">{formatCitations(paper.citations)}</span>
            citations
          </span>
        )}
        {paper.pdfLink && (
          <a
            href={paper.pdfLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors"
          >
            🔓 Free PDF ↗
          </a>
        )}
      </div>
    </div>
  )
}
