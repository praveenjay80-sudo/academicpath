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

// High-quality library collections on Internet Archive
const QUALITY_COLLECTIONS = [
  'internetarchivebooks',  // Digitized by major libraries
  'inlibrary',             // Available for lending
  'universallibrary',      // Carnegie Mellon / Govt of India project
  'millionbooks',          // Million Books Project
  'opensource',            // Open source / openly licensed
].join(' OR ')

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const cleaned = cleanQuery(query)

  // Build a precise query:
  // - subject match (books tagged with this topic, not just any text containing the word)
  // - English language
  // - Reasonable date range (not 19th century OCR garbage)
  // - Only quality library collections
  // - Minimum downloads to filter out noise
  const iaQuery = [
    `subject:"${cleaned}"`,
    'mediatype:texts',
    'language:English',
    `year:[1950 TO 2025]`,
    `collection:(${QUALITY_COLLECTIONS})`,
  ].join(' AND ')

  try {
    const params = new URLSearchParams()
    params.set('q', iaQuery)
    params.append('fl[]', 'identifier')
    params.append('fl[]', 'title')
    params.append('fl[]', 'creator')
    params.append('fl[]', 'date')
    params.append('fl[]', 'downloads')
    params.append('fl[]', 'subject')
    params.set('sort[]', 'downloads desc')
    params.set('rows', '30')
    params.set('page', '1')
    params.set('output', 'json')

    const res = await fetch(
      `https://archive.org/advancedsearch.php?${params.toString()}`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)' },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Internet Archive error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const docs = (data?.response?.docs || []) as Array<Record<string, unknown>>

    // If subject search returned nothing, fall back to keyword search in same collections
    if (docs.length === 0) {
      const fallbackQuery = [
        `"${cleaned}"`,
        'mediatype:texts',
        'language:English',
        `year:[1970 TO 2025]`,
        `collection:(${QUALITY_COLLECTIONS})`,
        'downloads:[500 TO *]',
      ].join(' AND ')

      const fbParams = new URLSearchParams(params)
      fbParams.set('q', fallbackQuery)

      const fbRes = await fetch(
        `https://archive.org/advancedsearch.php?${fbParams.toString()}`,
        {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)' },
        }
      )
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        docs.push(...((fbData?.response?.docs || []) as Array<Record<string, unknown>>))
      }
    }

    const books: ArchiveBook[] = docs
      .map((doc) => {
        const identifier = (doc.identifier as string) || ''
        const rawTitle = doc.title
        const title = Array.isArray(rawTitle) ? rawTitle[0] : (rawTitle as string) || ''
        const rawCreator = doc.creator
        const creator = Array.isArray(rawCreator)
          ? (rawCreator as string[]).slice(0, 2).join(', ')
          : (rawCreator as string) || 'Unknown'
        const rawDate = doc.date
        const year = Array.isArray(rawDate)
          ? (rawDate[0] as string)
          : (rawDate as string) || ''
        const downloads = (doc.downloads as number) || 0

        return {
          id: identifier,
          title: title.trim(),
          creator: creator.trim(),
          year: year.substring(0, 4),
          downloads,
          link: `https://archive.org/details/${identifier}`,
        }
      })
      // Filter out noise: must have a title, an identifier, and at least 100 downloads
      .filter((b) => b.title && b.id && b.downloads >= 100)
      // Sort by downloads descending
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10)

    return NextResponse.json({ books })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Internet Archive error: ${message}` }, { status: 500 })
  }
}
