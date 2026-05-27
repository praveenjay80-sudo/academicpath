interface Props {
  keywords: string[]
  onSearch: (query: string) => void
}

export default function KeywordChips({ keywords, onSearch }: Props) {
  if (!keywords.length) return null

  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
        🏷️ Related topics
      </p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw, i) => (
          <button
            key={i}
            onClick={() => onSearch(kw)}
            className="text-sm px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-colors border border-indigo-200 cursor-pointer"
          >
            {kw}
          </button>
        ))}
      </div>
    </div>
  )
}
