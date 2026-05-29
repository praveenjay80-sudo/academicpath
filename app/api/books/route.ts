import { NextRequest, NextResponse } from 'next/server'
import { Book } from '@/lib/types'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15&fields=key,title,author_name,first_publish_year,edition_count,cover_i&type=work`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return NextResponse.json({ error: `Open Library error: ${res.status}` }, { status: 502 })

    const data = await res.json()
    const docs = (data.docs || []) as Array<Record<string, unknown>>

    const books: Book[] = docs.slice(0, 12).map((doc, i) => {
      const authorNames = doc.author_name as string[] | undefined
      const coverId = doc.cover_i as number | undefined
      return {
        id: (doc.key as string) || String(i),
        title: (doc.title as string) || 'Unknown Title',
        authors: authorNames ? authorNames.slice(0, 3).join(', ') : 'Unknown',
        year: String((doc.first_publish_year as number) || ''),
        editions: (doc.edition_count as number) || 0,
        thumbnail: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
        link: `https://openlibrary.org${doc.key}`,
      }
    }).sort((a, b) => (b.editions ?? 0) - (a.editions ?? 0))

    return NextResponse.json({ books })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch books: ${message}` }, { status: 500 })
  }
}
