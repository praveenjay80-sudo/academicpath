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

// Types that are books, not papers — exclude from papers column
const BOOK_TYPES = new Set(['Book', 'BookSection', 'EditedBook'])

function getTag(title: string, year: number, citations: number): PaperTag {
  const lower = title.toLowerCase()
  if (SURVEY_WORDS.some((w) => lower.includes(w))) return 'SURVEY'
  if (year >= 2022) return 'RECENT'
  if (citations >= 500) return 'FOUNDATIONAL'
  return 'INFLUENTIAL'
}

function formatAuthors(authors: Array<{ name: string }>): string {
  if (!authors || authors.length === 0) return 'Unknown'
  const names = authors.slice(0, 3).map((a) => a.name)
  return names.join(', ') + (authors.length > 3 ? ' et al.' : '')
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const apiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY

  // ── Semantic Scholar (papers, sorted by citation count) ──────────────────
  const ssUrl = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  ssUrl.searchParams.set('query', query)
  ssUrl.searchParams.set(
    'fields',
    'paperId,title,authors,year,citationCount,openAccessPdf,publicationTypes,externalIds'
  )
  ssUrl.searchParams.set('limit', '100') // fetch large pool, then sort by citations
  ssUrl.searchParams.set('offset', '0')

  // ── SerpAPI (only for related keyword chips) ─────────────────────────────
  const serpUrl = new URL('https://serpapi.com/search')
  if (apiKey) {
    serpUrl.searchParams.set('engine', 'google_scholar')
    serpUrl.searchParams.set('q', query)
    serpUrl.searchParams.set('num', '5')
    serpUrl.searchParams.set('api_key', apiKey)
  }

  // Run both in parallel
  const [ssResult, serpResult] = await Promise.allSettled([
    fetch(ssUrl.toString(), {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)' },
    }),
    apiKey
      ? fetch(serpUrl.toString(), { signal: AbortSignal.timeout(8000) })
      : Promise.reject('no key'),
  ])

  // ── Parse Semantic Scholar papers ────────────────────────────────────────
  if (ssResult.status === 'rejected') {
    return NextResponse.json({ error: 'Semantic Scholar unavailable' }, { status: 502 })
  }

  const ssData = await ssResult.value.json()

  if (ssData.error) {
    return NextResponse.json({ error: ssData.error }, { status: 400 })
  }

  type SSPaper = {
    paperId: string
    title: string
    authors: Array<{ name: string }>
    year: number
    citationCount: number
    openAccessPdf?: { url: string }
    publicationTypes?: string[]
  }

  const allItems: SSPaper[] = ssData.data || []

  const papers: Paper[] = allItems
    // Remove books — those go in the books column
    .filter((item) => {
      const types = item.publicationTypes || []
      return !types.some((t) => BOOK_TYPES.has(t))
    })
    // Sort by citation count descending — this is the key fix
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, 20)
    .map((item) => ({
      id: item.paperId,
      title: item.title || 'Untitled',
      authors: formatAuthors(item.authors),
      year: item.year || 0,
      citations: item.citationCount || 0,
      link: `https://www.semanticscholar.org/paper/${item.paperId}`,
      pdfLink: item.openAccessPdf?.url,
      tag: getTag(item.title || '', item.year || 0, item.citationCount || 0),
    }))

  // Re-sort by tag group then citations within group
  papers.sort((a, b) => {
    const tagDiff = TAG_ORDER[a.tag] - TAG_ORDER[b.tag]
    return tagDiff !== 0 ? tagDiff : b.citations - a.citations
  })

  // ── Parse SerpAPI keywords ───────────────────────────────────────────────
  let keywords: string[] = []
  if (serpResult.status === 'fulfilled') {
    const serpData = await serpResult.value.json()
    keywords = (serpData.related_searches || [])
      .map((s: { query: string }) => s.query)
      .filter(Boolean)
  }

  return NextResponse.json({ papers, keywords })
}
