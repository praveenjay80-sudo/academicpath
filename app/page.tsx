'use client'

import { useState, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import PaperCard from '@/components/PaperCard'
import ScholarBookCard from '@/components/ScholarBookCard'
import BookCard from '@/components/BookCard'
import ArchiveCard from '@/components/ArchiveCard'
import KeywordChips from '@/components/KeywordChips'
import ApiKeySetup from '@/components/ApiKeySetup'
import { Paper, ScholarBook, Book, ArchiveBook } from '@/lib/types'

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

function SimpleSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 animate-pulse">
      <div className="h-4 w-full bg-gray-200 rounded mb-1" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-32 bg-gray-200 rounded" />
    </div>
  )
}

function ColHeader({
  emoji, title, subtitle, count, loading,
}: {
  emoji: string; title: string; subtitle: string; count?: number; loading?: boolean
}) {
  return (
    <div className="mb-3 pb-3 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
          <span>{emoji}</span> {title}
        </h2>
        {!loading && count !== undefined && count > 0 && (
          <span className="text-xs text-gray-400">{count}</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      ⚠️ {message}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-center py-10 text-gray-400 text-sm">{text}</p>
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyChecked, setKeyChecked] = useState(false)

  // Data
  const [papers, setPapers] = useState<Paper[]>([])
  const [scholarBooks, setScholarBooks] = useState<ScholarBook[]>([])
  const [olBooks, setOlBooks] = useState<Book[]>([])
  const [archiveBooks, setArchiveBooks] = useState<ArchiveBook[]>([])
  const [keywords, setKeywords] = useState<string[]>([])

  // Loading
  const [loadingScholar, setLoadingScholar] = useState(false)
  const [loadingOL, setLoadingOL] = useState(false)
  const [loadingArchive, setLoadingArchive] = useState(false)

  // Errors
  const [scholarError, setScholarError] = useState<string | null>(null)
  const [olError, setOlError] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [searched, setSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('serpapi_key')
    setApiKey(stored)
    setKeyChecked(true)
  }, [])

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setSearched(true)
    setScholarError(null)
    setOlError(null)
    setArchiveError(null)
    setLoadingScholar(true)
    setLoadingOL(true)
    setLoadingArchive(true)
    setPapers([])
    setScholarBooks([])
    setOlBooks([])
    setArchiveBooks([])
    setKeywords([])

    const headers: HeadersInit = apiKey ? { 'x-serpapi-key': apiKey } : {}

    // ① Google Scholar → papers + scholar books + keywords (one call)
    fetch(`/api/papers?q=${encodeURIComponent(query)}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setPapers(data.papers || [])
        setScholarBooks(data.scholarBooks || [])
        setKeywords(data.keywords || [])
      })
      .catch((err) => setScholarError(err.message || 'Failed to load Google Scholar results'))
      .finally(() => setLoadingScholar(false))

    // ② Open Library → books by editions + WorldCat holdings
    fetch(`/api/books?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setOlBooks(data.books || [])
      })
      .catch((err) => setOlError(err.message || 'Failed to load Open Library results'))
      .finally(() => setLoadingOL(false))

    // ③ Internet Archive → texts by downloads
    fetch(`/api/archive?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setArchiveBooks(data.books || [])
      })
      .catch((err) => setArchiveError(err.message || 'Failed to load Internet Archive results'))
      .finally(() => setLoadingArchive(false))
  }

  const handleClearKey = () => {
    localStorage.removeItem('serpapi_key')
    setApiKey(null)
    setSearched(false)
  }

  const loading = loadingScholar || loadingOL || loadingArchive

  if (!keyChecked) return null
  if (!apiKey) return <ApiKeySetup onSave={(key) => setApiKey(key)} />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">🎓 AcademicPath</h1>
            <p className="text-xs text-gray-400 mt-0.5">Master any topic — zero to expert</p>
          </div>
          <button
            onClick={handleClearKey}
            title="Change SerpAPI key"
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            ⚙️ <span className="hidden sm:inline">Change API key</span>
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Landing */}
        {!searched && (
          <div className="text-center py-24">
            <p className="text-6xl mb-5">📚</p>
            <p className="text-lg font-semibold text-gray-600 mb-2">
              Find the most influential work on any topic
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Try <span className="italic text-gray-500">&quot;machine learning&quot;</span> or{' '}
              <span className="italic text-gray-500">
                &quot;papers on attention mechanisms in NLP&quot;
              </span>
            </p>
          </div>
        )}

        {searched && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Results for:{' '}
              <span className="font-semibold text-gray-800">&quot;{currentQuery}&quot;</span>
            </p>

            <KeywordChips keywords={keywords} onSearch={handleSearch} />

            {/* 4-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">

              {/* ── Col 1: Papers ── */}
              <div>
                <ColHeader
                  emoji="📄"
                  title="Papers"
                  subtitle="Google Scholar · by citations"
                  count={papers.length}
                  loading={loadingScholar}
                />
                {loadingScholar ? (
                  Array.from({ length: 6 }).map((_, i) => <PaperSkeleton key={i} />)
                ) : scholarError ? (
                  <ErrorBox message={scholarError} />
                ) : papers.length > 0 ? (
                  papers.map((p) => <PaperCard key={p.id} paper={p} />)
                ) : (
                  <Empty text="No papers found" />
                )}
              </div>

              {/* ── Col 2: Google Scholar Books ── */}
              <div>
                <ColHeader
                  emoji="📚"
                  title="GS Books"
                  subtitle="Google Scholar · by citations"
                  count={scholarBooks.length}
                  loading={loadingScholar}
                />
                {loadingScholar ? (
                  Array.from({ length: 6 }).map((_, i) => <SimpleSkeleton key={i} />)
                ) : scholarError ? (
                  <ErrorBox message={scholarError} />
                ) : scholarBooks.length > 0 ? (
                  scholarBooks.map((b) => <ScholarBookCard key={b.id} book={b} />)
                ) : (
                  <Empty text="No books found" />
                )}
              </div>

              {/* ── Col 3: Open Library ── */}
              <div>
                <ColHeader
                  emoji="📖"
                  title="Open Library"
                  subtitle="Most editions · WorldCat holdings"
                  count={olBooks.length}
                  loading={loadingOL}
                />
                {loadingOL ? (
                  Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)
                ) : olError ? (
                  <ErrorBox message={olError} />
                ) : olBooks.length > 0 ? (
                  olBooks.map((b) => <BookCard key={b.id} book={b} />)
                ) : (
                  <Empty text="No books found" />
                )}
              </div>

              {/* ── Col 4: Internet Archive ── */}
              <div>
                <ColHeader
                  emoji="🏛️"
                  title="Internet Archive"
                  subtitle="Free texts · by downloads"
                  count={archiveBooks.length}
                  loading={loadingArchive}
                />
                {loadingArchive ? (
                  Array.from({ length: 6 }).map((_, i) => <SimpleSkeleton key={i} />)
                ) : archiveError ? (
                  <ErrorBox message={archiveError} />
                ) : archiveBooks.length > 0 ? (
                  archiveBooks.map((b) => <ArchiveCard key={b.id} book={b} />)
                ) : (
                  <Empty text="No texts found" />
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  )
}
