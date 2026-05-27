import { ScholarBook } from '@/lib/types'

function formatCitations(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export default function ScholarBookCard({ book }: { book: ScholarBook }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-gray-300 transition-all">
      <a
        href={book.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 leading-snug block mb-1 transition-colors"
      >
        {book.title}
      </a>

      <p className="text-xs text-gray-500 mb-3">
        {book.authors}
        {book.year ? ` · ${book.year}` : ''}
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {book.citations > 0 && (
          <span className="text-xs text-gray-700">
            📊 <span className="font-bold text-gray-900">{formatCitations(book.citations)}</span>{' '}
            citations
          </span>
        )}
        {book.pdfLink && (
          <a
            href={book.pdfLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:underline font-medium"
          >
            🔓 Free PDF ↗
          </a>
        )}
      </div>
    </div>
  )
}
