import { NextRequest, NextResponse } from 'next/server'
import { Paper, PaperTag } from '@/lib/types'

const TAG_ORDER: Record<PaperTag, number> = {
  FOUNDATIONAL: 0,
  SURVEY: 1,
  INFLUENTIAL: 2,
  RECENT: 3,
}

const SURVEY_WORDS = [
  'survey', 'review', 'overview', 'introduction', 'primer',
  'tutorial', 'handbook', 'guide', 'fundamentals', 'principles',
]

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

function parseCitations(content: string): number {
  const match = content.match(/Cited by ([\d,]+)/i)
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0
}

function parseYear(content: string, published_date?: string): number {
  if (published_date) {
    const y = new Date(published_date).getFullYear()
    if (y > 1900 && y <= new Date().getFullYear() + 1) return y
  }
  const match = content.match(/\b(19[5-9]\d|20[0-2]\d)\b/)
  return match ? parseInt(match[0]) : 0
}

function parseAuthors(content: string): string {
  const firstLine = content.split('\n')[0] || ''
  const parts = firstLine.split(' - ')
  const candidate = parts[0]?.trim() ?? ''
  // Reasonable author string: not too long, no URL characters
  if (candidate.length > 0 && candidate.length < 120 && !candidate.includes('http')) {
    return candidate
  }
  return 'Unknown'
}

function getTag(title: string, year: number, citations: number): PaperTag {
  const lower = title.toLowerCase()
  if (SURVEY_WORDS.some(w => lower.includes(w))) return 'SURVEY'
  if (year >= 2022) return 'RECENT'
  if (citations >= 500) return 'FOUNDATIONAL'
  return 'INFLUENTIAL'
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const tavilyKey = request.headers.get('x-tavily-key') || process.env.TAVILY_API_KEY
  const serpApiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY

  if (!tavilyKey) {
    return NextResponse.json({ error: 'Tavily API key required' }, { status: 401 })
  }

  // ── Tavily: Google Scholar papers ─────────────────────────────────────────
  const tavilyPromise = fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: 'advanced',
      include_domains: ['scholar.google.com'],
      max_results: 20,
    }),
    signal: AbortSignal.timeout(15000),
  })

  // ── SerpAPI: related keyword chips (optional) ─────────────────────────────
  const serpPromise = serpApiKey
    ? fetch(
        `https://serpapi.com/search?engine=google_scholar&q=${encodeURIComponent(query)}&num=5&api_key=${serpApiKey}`,
        { signal: AbortSignal.timeout(8000) }
      )
    : Promise.reject('no key')

  const [tavilyResult, serpResult] = await Promise.allSettled([tavilyPromise, serpPromise])

  // ── Parse Tavily papers ───────────────────────────────────────────────────
  if (tavilyResult.status === 'rejected') {
    console.error('Tavily fetch failed:', tavilyResult.reason)
    return NextResponse.json({ error: 'Failed to reach Tavily API' }, { status: 502 })
  }

  const tavilyRes = tavilyResult.value
  if (!tavilyRes.ok) {
    const body = await tavilyRes.text().catch(() => '')
    console.error('Tavily error:', tavilyRes.status, body)
    if (tavilyRes.status === 401) {
      return NextResponse.json({ error: 'Invalid Tavily API key' }, { status: 401 })
    }
    return NextResponse.json({ error: `Tavily error (${tavilyRes.status})` }, { status: 502 })
  }

  const tavilyData = await tavilyRes.json().catch(() => ({ results: [] }))
  const results: TavilyResult[] = tavilyData.results || []

  const papers: Paper[] = results
    .filter(r => r.title && r.url)
    .map(r => {
      const citations = parseCitations(r.content)
      const year = parseYear(r.content, r.published_date)
      const authors = parseAuthors(r.content)
      const tag = getTag(r.title, year, citations)
      return {
        id: r.url,
        title: r.title,
        authors,
        year,
        citations,
        link: r.url,
        tag,
      }
    })

  // Sort by citations descending
  papers.sort((a, b) => b.citations - a.citations)

  // ── Parse SerpAPI keywords (optional) ─────────────────────────────────────
  let keywords: string[] = []
  if (serpResult.status === 'fulfilled') {
    try {
      const serpData = await serpResult.value.json()
      keywords = (serpData.related_searches || [])
        .map((s: { query: string }) => s.query)
        .filter(Boolean)
    } catch {
      // non-critical
    }
  }

  return NextResponse.json({ papers, keywords })
}
