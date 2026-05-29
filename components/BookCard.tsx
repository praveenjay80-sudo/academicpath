import { Book } from '@/lib/types'

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="text-amber-400 text-xs leading-none">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  )
}

function formatReviews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export default function BookCard({ book }: { book: Book }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 hover:shadow-md hover:border-gray-300 transition-all flex gap-3">
      {book.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-12 h-16 object-cover rounded-md flex-shrink-0 shadow-sm"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-12 h-16 rounded-md flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
          📚
        </div>
      )}

      <div className="flex-1 min-w-0">
        <a
          href={book.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600 leading-snug block mb-1 transition-colors"
        >
          {book.title}
        </a>

        <p className="text-xs text-gray-500 mb-2">
          {book.authors}{book.year ? ` · ${book.year}` : ''}
        </p>

        {book.description && (
          <p className="text-[11px] text-gray-400 italic leading-relaxed mb-2 line-clamp-2">
            {book.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {book.rating != null && (
            <span className="flex items-center gap-1">
              <Stars rating={book.rating} />
              <span className="text-xs text-gray-600 font-medium">{book.rating.toFixed(1)}</span>
            </span>
          )}
          {book.reviews != null && book.reviews > 0 && (
            <span className="text-xs text-gray-400">
              {formatReviews(book.reviews)} reviews
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
