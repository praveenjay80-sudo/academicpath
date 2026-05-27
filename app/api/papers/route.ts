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

// Publishers / sources that indicate this is a book, not a paper
const BOOK_PUBLISHERS = [
  'mit press', 'cambridge university press', 'oxford university press',
  'springer', 'elsevier', 'wiley', 'mcgraw', 'o\'reilly', 'packt',
  'academic press', 'pearson', 'cengage', 'routledge', 'sage publications',
  'taylor & francis',
]

const BOOK_TITLE_SIGNALS = [
  'encyclopedia of', 'textbook', 'the book of', 'a textbook',
]

// Detect if a Google Scholar result is actually a book, not a paper
function isBook(result: Record<string, unknown>): boolean {
  const link = ((result.link as string) || '').toLowerCase()
  const title = ((result.title as string) || '').toLowerCase()
  const pubInfo = result.publication_info as Record<string, unknown> | undefined
  const summary = ((pubInfo?.summary as string) || '').toLowerCase()

  // books.google.com link is a dead giveaway
  if (link.includes('books.google.com')) return true
  if (link.includes('/book/')) return true

  // Title signals
  if (BOOK_TITLE_SIGNALS.some((s) => title.includes(s))) return true

  // Publisher in summary (format: "Authors - Publisher, Year - source")
  if (BOOK_PUBLISHERS.some((p) => summary.includes(p))) return true

  return false
}

function getTag(title: string, year: number, citations: number): PaperTag {
  const lower = title.toLowerCase()
  if (SURVEY_WORDS.some((w) => lower.includes(w))) return 'SURVEY'
  if (year >= 2022) return 'RECENT'
  if (citations >= 500) return 'FOUNDATIONAL'
  return 'INFLUENTIAL'
}

function parseYear(summary: string): number {
  const match = summary.match(/\b(19|20)\d{2}\b/)
  return match ? parseInt(match[0]) : 0
}

function parseAuthors(result: Record<string, unknown>): string {
  const pubInfo = result.publication_info as Record<string, unknown> | undefined
  const authors = pubInfo?.authors as Array<{ name: string }> | undefined

  if (authors && authors.length > 0) {
    const names = authors.slice(0, 3).map((a) => a.name)
    return names.join(', ') + (authors.length > 3 ? ' et al.' : '')
  }

  const summary = (pubInfo?.summary as string) || ''
  const parts = summary.split(' - ')
  return parts[0]?.trim() || 'Unknown'
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  // Accept key from browser (localStorage) or fall back to server env var
  const apiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No SerpAPI key provided' }, { status: 401 })
  }

  try {
    const url = new URL('https://serpapi.com/search')
    url.searchParams.set('engine', 'google_scholar')
    url.searchParams.set('q', query)
    url.searchParams.set('num', '20')
    url.searchParams.set('api_key', apiKey)

    const res = await fetch(url.toString())

    if (!res.ok) {
      return NextResponse.json({ error: `SerpAPI error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    const organicResults = (data.organic_results || []) as Record<string, unknown>[]

    const papers: Paper[] = organicResults
      // Filter out books — they belong in the books section, not papers
      .filter((result) => !isBook(result))
      .map((result, i) => {
        const pubInfo = result.publication_info as Record<string, unknown> | undefined
        const summary = (pubInfo?.summary as string) || ''
        const year = parseYear(summary)
        const inlineLinks = result.inline_links as Record<string, unknown> | undefined
        const citedBy = inlineLinks?.cited_by as Record<string, unknown> | undefined
        const citations = (citedBy?.total as number) || 0
        const resources = result.resources as Array<Record<string, string>> | undefined
        const pdfResource = resources?.find(
          (r) => r.file_format === 'PDF' || r.title?.toLowerCase().includes('pdf')
        )

        return {
          id: (result.result_id as string) || String(i),
          title: (result.title as string) || 'Untitled',
          authors: parseAuthors(result),
          year,
          citations,
          link: (result.link as string) || '#',
          pdfLink: pdfResource?.link,
          tag: getTag((result.title as string) || '', year, citations),
        }
      })

    // Sort: FOUNDATIONAL → SURVEY → INFLUENTIAL → RECENT, then by citations desc within group
    papers.sort((a, b) => {
      const tagDiff = TAG_ORDER[a.tag] - TAG_ORDER[b.tag]
      if (tagDiff !== 0) return tagDiff
      return b.citations - a.citations
    })

    const relatedSearches = data.related_searches as Array<{ query: string }> | undefined
    const keywords = (relatedSearches || []).map((s) => s.query).filter(Boolean)

    return NextResponse.json({ papers, keywords })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch papers: ${message}` },
      { status: 500 }
    )
  }
}
