'use client'

import { useState, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import PaperCard from '@/components/PaperCard'
import BookCard from '@/components/BookCard'
import ConceptCard from '@/components/ConceptCard'
import RoadmapPanel from '@/components/RoadmapPanel'
import KeywordChips from '@/components/KeywordChips'
import ApiKeySetup from '@/components/ApiKeySetup'
import TaxonomyBrowser from '@/components/TaxonomyBrowser'
import { Paper, Book, OpenAlexConcept, Roadmap } from '@/lib/types'

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
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-3 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-200 rounded" />
    </div>
  )
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-full bg-gray-200 rounded" />
      <div className="h-3 w-4/5 bg-gray-200 rounded" />
      {[0,1,2,3].map(i => (
        <div key={i} className="border-l-4 border-gray-200 pl-3 space-y-2 py-1">
          <div className="h-3 w-20 bg-gray-200 rounded-full" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-2 w-full bg-gray-100 rounded" />
          <div className="flex gap-1 flex-wrap">
            {[0,1,2,3].map(j => <div key={j} className="h-4 w-16 bg-gray-100 rounded" />)}
          </div>
        </div>
      ))}
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

  const [papers, setPapers] = useState<Paper[]>([])
  const [olBooks, setOlBooks] = useState<Book[]>([])
  const [concepts, setConcepts] = useState<OpenAlexConcept[]>([])
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])

  const [loadingPapers, setLoadingPapers] = useState(false)
  const [loadingOL, setLoadingOL] = useState(false)
  const [loadingOA, setLoadingOA] = useState(false)
  const [loadingRoadmap, setLoadingRoadmap] = useState(false)

  const [papersError, setPapersError] = useState<string | null>(null)
  const [olError, setOlError] = useState<string | null>(null)
  const [oaError, setOaError] = useState<string | null>(null)
  const [roadmapError, setRoadmapError] = useState<string | null>(null)

  const [searched, setSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')

  useEffect(() => {
    setApiKey(localStorage.getItem('serpapi_key'))
    setKeyChecked(true)
  }, [])

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setSearched(true)
    setPapersError(null)
    setOlError(null)
    setOaError(null)
    setRoadmapError(null)
    setLoadingPapers(true)
    setLoadingOL(true)
    setLoadingOA(true)
    setLoadingRoadmap(true)
    setPapers([])
    setOlBooks([])
    setConcepts([])
    setRoadmap(null)
    setKeywords([])

    const headers: HeadersInit = apiKey ? { 'x-serpapi-key': apiKey } : {}

    // ① Google Scholar papers + keywords
    fetch(`/api/papers?q=${encodeURIComponent(query)}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setPapers(data.papers || [])
        setKeywords(data.keywords || [])
      })
      .catch(err => setPapersError(err.message || 'Failed to load papers'))
      .finally(() => setLoadingPapers(false))

    // ② Open Library books
    fetch(`/api/books?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setOlBooks(data.books || [])
      })
      .catch(err => setOlError(err.message || 'Failed to load books'))
      .finally(() => setLoadingOL(false))

    // ③ OpenAlex concepts
    fetch(`/api/openalex?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setConcepts(data.concepts || [])
      })
      .catch(err => setOaError(err.message || 'Failed to load concepts'))
      .finally(() => setLoadingOA(false))

    // ④ AI Learning Roadmap (Claude)
    const anthropicKey = localStorage.getItem('anthropic_key') || ''
    if (anthropicKey) {
      fetch(`/api/roadmap?topic=${encodeURIComponent(query)}`, {
        headers: { 'x-anthropic-key': anthropicKey },
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) throw new Error(data.error)
          setRoadmap(data.roadmap || null)
        })
        .catch(err => setRoadmapError(err.message || 'Failed to generate roadmap'))
        .finally(() => setLoadingRoadmap(false))
    } else {
      setLoadingRoadmap(false)
      setRoadmapError('Add your Anthropic key via the 🔑 button in the taxonomy browser to generate a learning roadmap.')
    }
  }

  const handleClearKey = () => {
    localStorage.removeItem('serpapi_key')
    setApiKey(null)
    setSearched(false)
  }

  const loading = loadingPapers || loadingOL || loadingOA || loadingRoadmap

  if (!keyChecked) return null
  if (!apiKey) return <ApiKeySetup onSave={(key) => setApiKey(key)} />

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="mb-4">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        <TaxonomyBrowser onSearch={handleSearch} />

        {!searched && (
          <div className="text-center py-24">
            <p className="text-6xl mb-5">📚</p>
            <p className="text-lg font-semibold text-gray-600 mb-2">
              Find the most influential work on any topic
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Try <span className="italic text-gray-500">&quot;machine learning&quot;</span>,{' '}
              <span className="italic text-gray-500">&quot;quantum mechanics&quot;</span> or{' '}
              <span className="italic text-gray-500">&quot;attention mechanisms in NLP&quot;</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">

              {/* Col 1: Papers */}
              <div>
                <ColHeader
                  emoji="📄"
                  title="Papers"
                  subtitle="Google Scholar · by citation count"
                  count={papers.length}
                  loading={loadingPapers}
                />
                {loadingPapers ? (
                  Array.from({ length: 6 }).map((_, i) => <PaperSkeleton key={i} />)
                ) : papersError ? (
                  <ErrorBox message={papersError} />
                ) : papers.length > 0 ? (
                  papers.map(p => <PaperCard key={p.id} paper={p} />)
                ) : (
                  <Empty text="No papers found" />
                )}
              </div>

              {/* Col 2: Books */}
              <div>
                <ColHeader
                  emoji="📚"
                  title="Books"
                  subtitle="Open Library · by edition count"
                  count={olBooks.length}
                  loading={loadingOL}
                />
                {loadingOL ? (
                  Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)
                ) : olError ? (
                  <ErrorBox message={olError} />
                ) : olBooks.length > 0 ? (
                  olBooks.map(b => <BookCard key={b.id} book={b} />)
                ) : (
                  <Empty text="No books found" />
                )}
              </div>

              {/* Col 3: AI Learning Roadmap */}
              <div>
                <ColHeader
                  emoji="🗺️"
                  title="Learning Roadmap"
                  subtitle="Claude AI · beginner to research"
                  loading={loadingRoadmap}
                />
                {loadingRoadmap ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <RoadmapSkeleton />
                  </div>
                ) : roadmapError ? (
                  <ErrorBox message={roadmapError} />
                ) : roadmap ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <RoadmapPanel roadmap={roadmap} />
                  </div>
                ) : (
                  <Empty text="No roadmap generated" />
                )}
              </div>

              {/* Col 4: OpenAlex Concepts */}
              <div>
                <ColHeader
                  emoji="🧠"
                  title="Concepts"
                  subtitle="OpenAlex · academic concept map"
                  count={concepts.length}
                  loading={loadingOA}
                />
                {loadingOA ? (
                  Array.from({ length: 5 }).map((_, i) => <SimpleSkeleton key={i} />)
                ) : oaError ? (
                  <ErrorBox message={oaError} />
                ) : concepts.length > 0 ? (
                  concepts.map(c => <ConceptCard key={c.id} concept={c} />)
                ) : (
                  <Empty text="No concepts found" />
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  )
}
