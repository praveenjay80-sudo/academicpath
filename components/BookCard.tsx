import { Book } from '@/lib/types'

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

interface Props {
  book: Book
}

export default function BookCard({ book }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-gray-300 transition-all flex gap-3">
      {/* Cover */}
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-12 h-16 object-cover rounded-md flex-shrink-0 shadow-sm"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-12 h-16 rounded-md flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
          📚
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <a
          href={book.openLibraryLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600 leading-snug block mb-1 transition-colors"
        >
          {book.title}
        </a>

        {/* Authors + Year */}
        <p className="text-xs text-gray-500 mb-3">
          {book.authors}
          {book.year ? ` · ${book.year}` : ''}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {book.holdings > 0 && (
            <span className="text-xs text-gray-700 flex items-center gap-1">
              🏛️{' '}
              <span className="font-bold text-gray-900">{formatNumber(book.holdings)}</span>{' '}
              libraries
            </span>
          )}
          {book.editions > 0 && (
            <span className="text-xs text-gray-700 flex items-center gap-1">
              📖{' '}
              <span className="font-bold text-gray-900">{formatNumber(book.editions)}</span>{' '}
              editions
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
