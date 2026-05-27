'use client'

import { useState, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import PaperCard from '@/components/PaperCard'
import BookCard from '@/components/BookCard'
import KeywordChips from '@/components/KeywordChips'
import ApiKeySetup from '@/components/ApiKeySetup'
import { Paper, Book } from '@/lib/types'

function PaperSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded-full mb-2" />
      <div className="h-4 w-full bg-gray-200 rounded mb-1" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-32 bg-gray-200 rounded" />
    </div>
  )
}

function BookSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 flex gap-3 animate-pulse">
      <div className="w-12 h-16 bg-gray-200 rounded-md flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 w-full bg-gray-200 rounded mb-1" />
        <div className="h-3 w-2/3 bg-gray-200 rounded mb-3" />
        <div className="h-3 w-40 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyChecked, setKeyChecked] = useState(false)
  const [papers, setPapers] = useState<Paper[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [loadingPapers, setLoadingPapers] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')
  const [paperError, setPaperError] = useState<string | null>(null)
  const [bookError, setBookError] = useState<string | null>(null)

  // Read key from localStorage on mount (localStorage not available on server)
  useEffect(() => {
    const stored = localStorage.getItem('serpapi_key')
    setApiKey(stored)
    setKeyChecked(true)
  }, [])

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setSearched(true)
    setPaperError(null)
    setLoadingPapers(true)
    setLoadingBooks(true)
    setPapers([])
    setBooks([])
    setKeywords([])
    setBookError(null)

    const headers: HeadersInit = apiKey ? { 'x-serpapi-key': apiKey } : {}

    // Papers + keywords
    fetch(`/api/papers?q=${encodeURIComponent(query)}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setPapers(data.papers || [])
        setKeywords(data.keywords || [])
      })
      .catch((err) => setPaperError(err.message || 'Failed to load papers'))
      .finally(() => setLoadingPapers(false))

    // Books
    fetch(`/api/books?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setBooks(data.books || [])
      })
      .catch((err) => setBookError(err.message || 'Failed to load books'))
      .finally(() => setLoadingBooks(false))
  }

  const handleClearKey = () => {
    localStorage.removeItem('serpapi_key')
    setApiKey(null)
    setPapers([])
    setBooks([])
    setKeywords([])
    setSearched(false)
  }

  const loading = loadingPapers || loadingBooks

  // Wait for localStorage check to avoid flash
  if (!keyChecked) return null

  // No key yet — show setup screen
  if (!apiKey) {
    return <ApiKeySetup onSave={(key) => setApiKey(key)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">🎓 AcademicPath</h1>
            <p className="text-xs text-gray-400 mt-0.5">Master any topic — zero to expert</p>
          </div>
          {/* Settings — clear/update API key */}
          <button
            onClick={handleClearKey}
            title="Change SerpAPI key"
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Change API key</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Error */}
        {paperError && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            ⚠️ {paperError}
          </div>
        )}

        {/* Landing state */}
        {!searched && (
          <div className="text-center py-24 text-gray-400">
            <p className="text-6xl mb-5">📚</p>
            <p className="text-lg font-semibold text-gray-600 mb-2">
              Find the most influential work on any topic
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Search a topic like{' '}
              <span className="italic text-gray-500">&quot;machine learning&quot;</span> or a
              specific phrase like{' '}
              <span className="italic text-gray-500">
                &quot;papers on attention mechanisms in NLP&quot;
              </span>
            </p>
          </div>
        )}

        {searched && (
          <>
            {/* Current query label */}
            <p className="text-sm text-gray-500 mb-4">
              Results for:{' '}
              <span className="font-semibold text-gray-800">&quot;{currentQuery}&quot;</span>
            </p>

            {/* Related keywords */}
            <KeywordChips keywords={keywords} onSearch={handleSearch} />

            {/* Two-column results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Papers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">📄 Papers</h2>
                  {!loadingPapers && papers.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {papers.length} results · sorted by citations
                    </span>
                  )}
                </div>

                {loadingPapers ? (
                  Array.from({ length: 6 }).map((_, i) => <PaperSkeleton key={i} />)
                ) : papers.length > 0 ? (
                  papers.map((paper) => <PaperCard key={paper.id} paper={paper} />)
                ) : !paperError ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No papers found for this query
                  </div>
                ) : null}
              </div>

              {/* Books */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">📚 Books</h2>
                  {!loadingBooks && books.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {books.length} results · sorted by library holdings
                    </span>
                  )}
                </div>

                {loadingBooks ? (
                  Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)
                ) : bookError ? (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    ⚠️ {bookError}
                  </div>
                ) : books.length > 0 ? (
                  books.map((book) => <BookCard key={book.id} book={book} />)
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No books found for this query
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
