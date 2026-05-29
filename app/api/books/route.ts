import { NextRequest, NextResponse } from 'next/server'
import { Book } from '@/lib/types'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const apiKey = request.headers.get('x-serpapi-key') || process.env.SERPAPI_KEY
  if (!apiKey) return NextResponse.json({ error: 'SerpAPI key required' }, { status: 401 })

  try {
    // tbm=bks is Google's Books search tab
    const url = `https://serpapi.com/search.json?engine=google&tbm=bks&q=${encodeURIComponent(query)}&num=15&api_key=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if (res.status === 401 || body.includes('Invalid API key')) {
        return NextResponse.json({ error: 'Invalid SerpAPI key' }, { status: 401 })
      }
      return NextResponse.json({ error: `Google Books error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const raw = (data.organic_results || []) as Array<Record<string, unknown>>

    const books: Book[] = raw.slice(0, 15).map((item, i) => {
      // author field is a string in tbm=bks results
      const authors = (item.author as string | undefined) ?? 'Unknown'

      // date is usually "YYYY" or "Month YYYY"
      const dateStr = (item.date as string | undefined) ?? ''
      const yearMatch = dateStr.match(/\b(1[89]\d{2}|20\d{2})\b/)
      const year = yearMatch ? yearMatch[1] : ''

      return {
        id: String(i),
        title: (item.title as string) || 'Unknown Title',
        authors,
        year,
        rating: item.rating as number | undefined,
        reviews: item.reviews as number | undefined,
        thumbnail: item.thumbnail as string | undefined,
        link: (item.link as string) || `https://books.google.com/books?q=${encodeURIComponent(query)}`,
        description: item.snippet as string | undefined,
      }
    })

    return NextResponse.json({ books })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch books: ${message}` }, { status: 500 })
  }
}
