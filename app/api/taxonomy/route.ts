import { NextRequest, NextResponse } from 'next/server'
import { TaxonomyNode } from '@/lib/types'

const OA_HEADERS = {
  'User-Agent': 'AcademicPath/1.0 (praveen.jay80@gmail.com)',
}

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get('level')
  const parent = request.nextUrl.searchParams.get('parent')

  let url: string
  if (level === '0') {
    url =
      'https://api.openalex.org/concepts' +
      '?filter=level:0' +
      '&per-page=25' +
      '&sort=works_count:desc' +
      '&select=id,display_name,level,works_count,description'
  } else if (parent && level) {
    const lvl = parseInt(level, 10)
    if (isNaN(lvl) || lvl < 1 || lvl > 5) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
    }
    url =
      `https://api.openalex.org/concepts` +
      `?filter=ancestors.id:${parent},level:${lvl}` +
      `&per-page=50` +
      `&sort=works_count:desc` +
      `&select=id,display_name,level,works_count,description`
  } else {
    return NextResponse.json(
      { error: 'Provide level=0 or parent + level' },
      { status: 400 }
    )
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: OA_HEADERS,
  }).catch(() => null)

  if (!res || !res.ok) {
    return NextResponse.json({ error: 'OpenAlex unavailable' }, { status: 502 })
  }

  const data = await res.json().catch(() => null)
  const nodes: TaxonomyNode[] = (data?.results || []).map(
    (c: Record<string, unknown>) => {
      const rawId = (c.id as string) || ''
      const shortId = rawId.split('/').pop() || rawId
      return {
        id: shortId,
        display_name: (c.display_name as string) || '',
        level: (c.level as number) ?? 0,
        works_count: (c.works_count as number) || 0,
        description: (c.description as string) || '',
      }
    }
  )

  return NextResponse.json({ nodes })
}
