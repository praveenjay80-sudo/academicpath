import { ArchiveBook } from '@/lib/types'

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export default function ArchiveCard({ book }: { book: ArchiveBook }) {
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
        {book.creator}
        {book.year ? ` · ${book.year}` : ''}
      </p>

      <div className="flex items-center gap-3">
        {book.downloads > 0 && (
          <span className="text-xs text-gray-700">
            ⬇️ <span className="font-bold text-gray-900">{formatDownloads(book.downloads)}</span>{' '}
            downloads
          </span>
        )}
        <span className="text-xs text-emerald-600 font-medium">🔓 Free to read</span>
      </div>
    </div>
  )
}
