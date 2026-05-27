import { NextRequest, NextResponse } from 'next/server'
import { OpenAlexConcept, OpenAlexTopic } from '@/lib/types'

const OA_HEADERS = {
  'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)',
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const q = encodeURIComponent(query)

  // Fetch topics and concepts in parallel
  const [topicsRes, conceptsRes] = await Promise.allSettled([
    fetch(
      `https://api.openalex.org/topics?search=${q}&per-page=10` +
        `&select=id,display_name,works_count,domain,field,subfield`,
      { signal: AbortSignal.timeout(8000), headers: OA_HEADERS }
    ),
    fetch(
      `https://api.openalex.org/concepts?search=${q}&per-page=12` +
        `&select=id,display_name,level,works_count,description`,
      { signal: AbortSignal.timeout(8000), headers: OA_HEADERS }
    ),
  ])

  // ── Topics ───────────────────────────────────────────────────────────────
  let topics: OpenAlexTopic[] = []
  if (topicsRes.status === 'fulfilled' && topicsRes.value.ok) {
    const data = await topicsRes.value.json().catch(() => null)
    if (data?.results) {
      const queryWords = query.toLowerCase().split(/\s+/)

      topics = (data.results as Array<Record<string, unknown>>)
        // Filter: the topic name must share at least one substantive word with the query
        .filter((t) => {
          const name = ((t.display_name as string) || '').toLowerCase()
          return queryWords.some(
            (w) => w.length > 3 && name.includes(w)
          )
        })
        .slice(0, 8)
        .map((t) => {
          const rawId: string = (t.id as string) || ''
          const shortId = rawId.split('/').pop() || rawId
          return {
            id: shortId,
            display_name: (t.display_name as string) || '',
            works_count: (t.works_count as number) || 0,
            domain: ((t.domain as Record<string, string>) || {}).display_name || '',
            field: ((t.field as Record<string, string>) || {}).display_name || '',
            subfield: ((t.subfield as Record<string, string>) || {}).display_name || '',
            link: rawId, // OpenAlex canonical URL
          }
        })
    }
  }

  // ── Concepts ─────────────────────────────────────────────────────────────
  let concepts: OpenAlexConcept[] = []
  if (conceptsRes.status === 'fulfilled' && conceptsRes.value.ok) {
    const data = await conceptsRes.value.json().catch(() => null)
    if (data?.results) {
      const queryWords = query.toLowerCase().split(/\s+/)

      concepts = (data.results as Array<Record<string, unknown>>)
        // Keep only concepts whose name overlaps with query words (≥4 chars)
        // AND level ≤ 3 (not too specific / not noise)
        .filter((c) => {
          const name = ((c.display_name as string) || '').toLowerCase()
          const level = (c.level as number) ?? 99
          const hasOverlap = queryWords.some((w) => w.length > 3 && name.includes(w))
          return hasOverlap && level <= 3
        })
        .slice(0, 8)
        .map((c) => {
          const rawId: string = (c.id as string) || ''
          const shortId = rawId.split('/').pop() || rawId
          return {
            id: shortId,
            display_name: (c.display_name as string) || '',
            level: (c.level as number) ?? 0,
            works_count: (c.works_count as number) || 0,
            description: (c.description as string) || '',
            link: rawId,
          }
        })
    }
  }

  return NextResponse.json({ topics, concepts })
}
