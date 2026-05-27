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

// CrossRef types to exclude (books, chapters, datasets, reports)
const EXCLUDED_TYPES = new Set([
  'book', 'edited-book', 'book-chapter', 'book-section',
  'book-series', 'reference-book', 'reference-entry',
  'monograph', 'report', 'dataset', 'component',
])

type CrossRefAuthor = {
  given?: string
  family?: string
  name?: string
}

type CrossRefItem = {
  DOI?: string
  title?: string[]
  author?: CrossRefAuthor[]
  published?: { 'date-parts'?: number[][] }
  'is-referenced-by-count'?: number
  URL?: string
  type?: string
}

function getTag(title: string, year: number, citations: number): PaperTag {
  const lower = title.toLowerCase()
  if (SURVEY_WORDS.some((w) => lower.includes(w))) return 'SURVEY'
  if (year >= 2022) return 'RECENT'
  if (citations >= 500) return 'FOUNDATIONAL'
  return 'INFLUENTIAL'
}

function formatAuthors(authors: CrossRefAuthor[] | undefined): string {
  if (!authors || authors.length === 0) return 'Unknown'
  const names = authors.slice(0, 3).map((a) =>
    a.family
      ? a.given ? `${a.given} ${a.family}` : a.family
      : a.name || 'Unknown'
  )
  return names.join(', ') + (authors.length > 3 ? ' et al.' : '')
}

function extractYear(published: CrossRefItem['published']): number {
  return published?.['date-parts']?.[0]?.[0] ?? 0
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const apiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY

  // ── CrossRef (papers sorted by citation count server-side) ───────────────
  // query.title = title-field search only → field-specific results (no economics
  // papers appearing for "quantum mechanics" just because "mechanics" is in them)
  const crUrl = new URL('https://api.crossref.org/works')
  crUrl.searchParams.set('query.title', query)
  crUrl.searchParams.set('sort', 'is-referenced-by-count')
  crUrl.searchParams.set('order', 'desc')
  crUrl.searchParams.set('rows', '30')
  crUrl.searchParams.set('select', 'DOI,title,author,published,is-referenced-by-count,URL,type')
  crUrl.searchParams.set('mailto', 'praveen.jay80@gmail.com')

  // ── SerpAPI (only for related keyword chips) ─────────────────────────────
  const serpUrl = new URL('https://serpapi.com/search')
  if (apiKey) {
    serpUrl.searchParams.set('engine', 'google_scholar')
    serpUrl.searchParams.set('q', query)
    serpUrl.searchParams.set('num', '5')
    serpUrl.searchParams.set('api_key', apiKey)
  }

  // Run both in parallel
  const [crResult, serpResult] = await Promise.allSettled([
    fetch(crUrl.toString(), {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)' },
    }),
    apiKey
      ? fetch(serpUrl.toString(), { signal: AbortSignal.timeout(8000) })
      : Promise.reject('no key'),
  ])

  // ── Parse CrossRef papers ─────────────────────────────────────────────────
  if (crResult.status === 'rejected') {
    console.error('CrossRef fetch rejected:', crResult.reason)
    return NextResponse.json({ error: 'Papers API unavailable' }, { status: 502 })
  }

  const crResponse = crResult.value
  if (!crResponse.ok) {
    const errText = await crResponse.text().catch(() => '')
    console.error('CrossRef HTTP error:', crResponse.status, errText)
    return NextResponse.json(
      { error: `Papers API error (${crResponse.status})` },
      { status: 502 }
    )
  }

  let crData: { message: { items: CrossRefItem[] } }
  try {
    crData = await crResponse.json()
  } catch (e) {
    console.error('CrossRef JSON parse error:', e)
    return NextResponse.json({ error: 'Failed to parse papers response' }, { status: 502 })
  }

  const allItems: CrossRefItem[] = crData?.message?.items || []

  const papers: Paper[] = allItems
    // Exclude books, datasets, reports — papers only
    .filter((item) => !EXCLUDED_TYPES.has(item.type ?? ''))
    // Must have a title and DOI
    .filter((item) => !!(item.title?.[0]) && !!(item.DOI))
    .slice(0, 20)
    .map((item) => {
      const title = item.title![0]
      const year = extractYear(item.published)
      const citations = item['is-referenced-by-count'] ?? 0
      return {
        id: item.DOI!,
        title,
        authors: formatAuthors(item.author),
        year,
        citations,
        link: item.URL || `https://doi.org/${item.DOI}`,
        tag: getTag(title, year, citations),
      }
    })

  // Re-sort by tag group, then citations within group
  papers.sort((a, b) => {
    const tagDiff = TAG_ORDER[a.tag] - TAG_ORDER[b.tag]
    return tagDiff !== 0 ? tagDiff : b.citations - a.citations
  })

  // ── Parse SerpAPI keywords ────────────────────────────────────────────────
  let keywords: string[] = []
  if (serpResult.status === 'fulfilled') {
    try {
      const serpData = await serpResult.value.json()
      keywords = (serpData.related_searches || [])
        .map((s: { query: string }) => s.query)
        .filter(Boolean)
    } catch {
      // keywords stay empty — not critical
    }
  }

  return NextResponse.json({ papers, keywords })
}
