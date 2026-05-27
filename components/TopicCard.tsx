import { OpenAlexTopic } from '@/lib/types'

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}

export default function TopicCard({ topic }: { topic: OpenAlexTopic }) {
  const breadcrumb = [topic.domain, topic.field, topic.subfield]
    .filter(Boolean)
    .join(' › ')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-indigo-200 transition-all">
      <a
        href={topic.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 leading-snug block mb-1 transition-colors"
      >
        {topic.display_name}
      </a>

      {breadcrumb && (
        <p className="text-xs text-gray-400 mb-2 leading-tight">{breadcrumb}</p>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          📄 <span className="font-medium text-gray-700">{formatCount(topic.works_count)}</span>{' '}
          works
        </span>
      </div>
    </div>
  )
}
