import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { TaxonomyNode } from '@/lib/types'

export const maxDuration = 30  // seconds — prevents Vercel 10s default from killing Claude

const LEVEL_LABELS: Record<number, string> = {
  2: 'subfields',
  3: 'research topics',
  4: 'specializations',
}

export async function GET(request: NextRequest) {
  const parentName = request.nextUrl.searchParams.get('parentName')
  const context = request.nextUrl.searchParams.get('context') || ''
  const levelStr = request.nextUrl.searchParams.get('level')

  if (!parentName || !levelStr) {
    return NextResponse.json({ error: 'parentName and level required' }, { status: 400 })
  }

  const level = parseInt(levelStr, 10)
  if (isNaN(level) || level < 2) {
    return NextResponse.json({ error: 'level must be ≥ 2' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not set. Enter it via the 🔑 button.' }, { status: 401 })
  }

  const client = new Anthropic({ apiKey })
  const kind = LEVEL_LABELS[level] ?? 'subtopics'
  const contextNote = context ? `, within the broader field of ${context}` : ''
  const count = level === 2 ? 12 : 10

  const prompt =
    `List the ${count} most important and well-established ${kind} of "${parentName}"${contextNote}.\n` +
    `Return ONLY a valid JSON array, no markdown fences, no explanation:\n` +
    `[{"name":"Name","description":"One sentence."}]`

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed: { name: string; description: string }[] = JSON.parse(json)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'Claude returned no results — try again' }, { status: 502 })
    }

    const nodes: TaxonomyNode[] = parsed.map((item) => ({
      id: `cl-${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      display_name: item.name,
      level,
      works_count: 0,
      description: item.description ?? '',
    }))

    return NextResponse.json({ nodes })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Surface auth errors directly so users know to fix their key
    if (msg.includes('401') || msg.includes('invalid') || msg.includes('auth')) {
      return NextResponse.json({ error: 'Invalid Anthropic API key — re-enter it via 🔑' }, { status: 401 })
    }
    console.error('Claude taxonomy error:', msg)
    return NextResponse.json({ error: `Claude error: ${msg.slice(0, 120)}` }, { status: 502 })
  }
}
