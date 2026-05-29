import { Book } from '@/lib/types'

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

        {book.editions != null && book.editions > 0 && (
          <span className="text-xs text-gray-500">
            📖 <span className="font-semibold text-gray-700">{book.editions}</span> editions
          </span>
        )}
      </div>
    </div>
  )
}
