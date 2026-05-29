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

interface SerpResult {
  title?: string
  link?: string
  snippet?: string
  publication_info?: {
    summary?: string
    authors?: Array<{ name: string }>
  }
  inline_links?: {
    cited_by?: { total?: number }
  }
  resources?: Array<{ link: string; file_format?: string }>
}

function getTag(title: string, year: number, citations: number): PaperTag {
  const lower = title.toLowerCase()
  if (SURVEY_WORDS.some(w => lower.includes(w))) return 'SURVEY'
  if (year >= 2022) return 'RECENT'
  if (citations >= 500) return 'FOUNDATIONAL'
  return 'INFLUENTIAL'
}

function parseAuthorsAndYear(summary: string | undefined): { authors: string; year: number } {
  if (!summary) return { authors: 'Unknown', year: 0 }
  // Format: "A Smith, B Jones - Journal, 2023 - publisher.com"
  const parts = summary.split(' - ')
  const authors = parts[0]?.trim() || 'Unknown'
  const yearMatch = summary.match(/\b(19[5-9]\d|20[0-2]\d)\b/)
  const year = yearMatch ? parseInt(yearMatch[0]) : 0
  return { authors, year }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const apiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SerpAPI key required' }, { status: 401 })
  }

  const url = new URL('https://serpapi.com/search')
  url.searchParams.set('engine', 'google_scholar')
  url.searchParams.set('q', query)
  url.searchParams.set('num', '20')
  url.searchParams.set('api_key', apiKey)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) })
  } catch {
    return NextResponse.json({ error: 'Failed to reach SerpAPI' }, { status: 502 })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401 || body.includes('Invalid API key')) {
      return NextResponse.json({ error: 'Invalid SerpAPI key' }, { status: 401 })
    }
    return NextResponse.json({ error: `SerpAPI error (${res.status})` }, { status: 502 })
  }

  const data = await res.json().catch(() => ({}))
  const organic: SerpResult[] = data.organic_results || []

  const papers: Paper[] = organic
    .filter(r => r.title)
    .map(r => {
      const { authors, year } = parseAuthorsAndYear(r.publication_info?.summary)
      const citations = r.inline_links?.cited_by?.total ?? 0
      const pdfLink = r.resources?.find(x => x.file_format === 'PDF')?.link
      const tag = getTag(r.title!, year, citations)
      return {
        id: r.link || r.title!,
        title: r.title!,
        authors,
        year,
        citations,
        link: r.link || '',
        pdfLink,
        tag,
      }
    })

  // Sort by citation count descending
  papers.sort((a, b) => b.citations - a.citations)

  const keywords: string[] = (data.related_searches || [])
    .map((s: { query: string }) => s.query)
    .filter(Boolean)

  return NextResponse.json({ papers, keywords })
}
