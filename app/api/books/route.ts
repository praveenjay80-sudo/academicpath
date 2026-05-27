import { NextRequest, NextResponse } from 'next/server'
import { Book } from '@/lib/types'

// Strip academic-paper prefixes before sending to book APIs
const STRIP_PREFIXES = [
  /^papers? on\s+/i,
  /^research on\s+/i,
  /^studies (on|about)\s+/i,
  /^articles? on\s+/i,
  /^literature on\s+/i,
  /^work on\s+/i,
  /^review of\s+/i,
]

function cleanQueryForBooks(query: string): string {
  let cleaned = query
  for (const pattern of STRIP_PREFIXES) {
    cleaned = cleaned.replace(pattern, '')
  }
  return cleaned.trim()
}

async function getWorldCatHoldings(isbn: string): Promise<number> {
  try {
    const res = await fetch(
      `https://classify.oclc.org/classify2/Classify?isbn=${encodeURIComponent(isbn)}&summary=true`,
      {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'AcademicPath/1.0 (https://github.com/academicpath; praveen.jay80@gmail.com)',
        },
      }
    )
    if (!res.ok) return 0
    const xml = await res.text()
    const match = xml.match(/holdings="(\d+)"/)
    return match ? parseInt(match[1]) : 0
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const cleanedQuery = cleanQueryForBooks(query)

  try {
    const olRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanedQuery)}&limit=15&fields=key,title,author_name,first_publish_year,edition_count,isbn,cover_i&type=work`,
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'AcademicPath/1.0 (https://github.com/academicpath; praveen.jay80@gmail.com)',
        },
      }
    )

    if (!olRes.ok) {
      return NextResponse.json(
        { error: `Open Library error: ${olRes.status}` },
        { status: 502 }
      )
    }

    const olData = await olRes.json()
    const docs = (olData.docs || []) as Array<Record<string, unknown>>

    if (docs.length === 0) {
      return NextResponse.json({ books: [] })
    }

    // Enrich all books with WorldCat holdings in parallel
    const enrichedResults = await Promise.allSettled(
      docs.map(async (doc) => {
        const isbn = (doc.isbn as string[] | undefined)?.[0]
        const holdings = isbn ? await getWorldCatHoldings(isbn) : 0
        const authorNames = doc.author_name as string[] | undefined
        const coverId = doc.cover_i as number | undefined

        const book: Book = {
          id: (doc.key as string) || Math.random().toString(36).slice(2),
          title: (doc.title as string) || 'Unknown Title',
          authors: authorNames ? authorNames.slice(0, 3).join(', ') : 'Unknown',
          year: (doc.first_publish_year as number) || 0,
          editions: (doc.edition_count as number) || 0,
          holdings,
          coverUrl: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
            : undefined,
          openLibraryLink: `https://openlibrary.org${doc.key}`,
        }
        return book
      })
    )

    const books = enrichedResults
      .filter((r): r is PromiseFulfilledResult<Book> => r.status === 'fulfilled')
      .map((r) => r.value)
      .sort((a, b) => b.holdings - a.holdings || b.editions - a.editions)
      .slice(0, 10)

    return NextResponse.json({ books })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch books: ${message}` },
      { status: 500 }
    )
  }
}
