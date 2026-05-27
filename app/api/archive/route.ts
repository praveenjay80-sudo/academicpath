import { NextRequest, NextResponse } from 'next/server'
import { ArchiveBook } from '@/lib/types'

const STRIP_PREFIXES = [
  /^papers? on\s+/i,
  /^research on\s+/i,
  /^studies (on|about)\s+/i,
  /^articles? on\s+/i,
]

function cleanQuery(query: string): string {
  let q = query
  for (const p of STRIP_PREFIXES) q = q.replace(p, '')
  return q.trim()
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const cleaned = cleanQuery(query)

  try {
    // Search Internet Archive texts, sorted by download count descending
    const params = new URLSearchParams({
      q: `${cleaned} AND mediatype:texts`,
      'fl[]': 'identifier,title,creator,date,downloads,subject',
      sort: 'downloads desc',
      rows: '20',
      page: '1',
      output: 'json',
    })

    const res = await fetch(
      `https://archive.org/advancedsearch.php?${params.toString()}`,
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Internet Archive error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const docs = (data?.response?.docs || []) as Array<Record<string, unknown>>

    const books: ArchiveBook[] = docs
      .map((doc) => {
        const identifier = (doc.identifier as string) || ''
        const rawTitle = doc.title
        const title = Array.isArray(rawTitle) ? rawTitle[0] : (rawTitle as string) || 'Untitled'
        const rawCreator = doc.creator
        const creator = Array.isArray(rawCreator)
          ? (rawCreator as string[]).slice(0, 2).join(', ')
          : (rawCreator as string) || 'Unknown'
        const rawDate = doc.date
        const year = Array.isArray(rawDate) ? (rawDate[0] as string) : (rawDate as string) || ''
        const downloads = (doc.downloads as number) || 0

        return {
          id: identifier,
          title,
          creator,
          year: year.substring(0, 4),
          downloads,
          link: `https://archive.org/details/${identifier}`,
        }
      })
      .filter((b) => b.title && b.id)
      .slice(0, 10)

    return NextResponse.json({ books })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Internet Archive error: ${message}` }, { status: 500 })
  }
}
