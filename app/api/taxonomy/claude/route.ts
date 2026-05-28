import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { TaxonomyNode } from '@/lib/types'

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
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })
  const kind = LEVEL_LABELS[level] ?? 'subtopics'
  const contextNote = context ? ` (within: ${context})` : ''
  const count = level === 2 ? 14 : 12

  const prompt =
    `List the ${count} most important and well-established ${kind} of "${parentName}"${contextNote}.\n\n` +
    `Return ONLY a valid JSON array — no markdown, no explanation — in this exact format:\n` +
    `[{"name":"Subfield Name","description":"One concise sentence describing its core focus."}]\n\n` +
    `Rules:\n` +
    `- Use standard academic/textbook terminology\n` +
    `- Each entry must be a genuinely distinct area of study\n` +
    `- Order from most fundamental to most specialized\n` +
    `- No duplicates or near-duplicates`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // Strip any accidental markdown fences
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsed: { name: string; description: string }[] = JSON.parse(json)

    const nodes: TaxonomyNode[] = parsed.map((item) => ({
      id: `cl-${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      display_name: item.name,
      level,
      works_count: 0,
      description: item.description,
    }))

    return NextResponse.json({ nodes })
  } catch (err) {
    console.error('Claude taxonomy error:', err)
    return NextResponse.json({ error: 'Failed to generate taxonomy' }, { status: 502 })
  }
}
