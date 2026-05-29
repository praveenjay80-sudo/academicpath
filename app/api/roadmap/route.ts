import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Roadmap } from '@/lib/types'

export const maxDuration = 30

const MODEL_FALLBACKS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
]

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get('topic')
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const apiKey = request.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic key required' }, { status: 401 })

  const client = new Anthropic({ apiKey })

  const prompt = `Generate a comprehensive learning roadmap for mastering "${topic}".

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "overview": "2-3 sentences on what this field is and why it matters",
  "prerequisites": ["prereq1", "prereq2", "prereq3"],
  "stages": [
    {
      "level": "Beginner",
      "title": "short stage title",
      "duration": "e.g. 1-3 months",
      "description": "What to focus on and what you will be able to do after this stage",
      "concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
      "texts": ["Authoritative book or paper title 1", "Title 2", "Title 3"]
    },
    {
      "level": "Intermediate",
      "title": "short stage title",
      "duration": "...",
      "description": "...",
      "concepts": ["..."],
      "texts": ["..."]
    },
    {
      "level": "Advanced",
      "title": "short stage title",
      "duration": "...",
      "description": "...",
      "concepts": ["..."],
      "texts": ["..."]
    },
    {
      "level": "Research",
      "title": "short stage title",
      "duration": "Ongoing",
      "description": "...",
      "concepts": ["..."],
      "texts": ["..."]
    }
  ],
  "branches": ["specialization1", "specialization2", "specialization3", "specialization4"]
}

Rules:
- Exactly 4 stages in order: Beginner, Intermediate, Advanced, Research
- 5-6 concepts per stage (specific, learnable things)
- 3 key texts per stage (real, well-known books or seminal papers — no URLs)
- 4-6 branches (major specializations someone could pursue)
- Be specific and opinionated — this is a curated guide, not a generic list`

  let lastError = ''

  for (const model of MODEL_FALLBACKS) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed: Roadmap = JSON.parse(json)

      if (!parsed.stages || parsed.stages.length === 0) {
        return NextResponse.json({ error: 'Claude returned an empty roadmap' }, { status: 502 })
      }

      return NextResponse.json({ roadmap: parsed })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('authentication')) {
        return NextResponse.json({ error: 'Invalid Anthropic API key — re-enter it via 🔑 in the taxonomy browser' }, { status: 401 })
      }
      if (msg.includes('404') || msg.includes('not_found')) {
        lastError = msg
        continue
      }
      console.error('Roadmap error:', msg)
      return NextResponse.json({ error: `Claude error: ${msg.slice(0, 120)}` }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'No Claude model available for this API key.' }, { status: 502 })
}
