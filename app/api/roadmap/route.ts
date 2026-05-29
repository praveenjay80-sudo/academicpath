import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Roadmap } from '@/lib/types'

export const maxDuration = 60

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

  const prompt = `Generate a comprehensive, opinionated learning roadmap for mastering "${topic}".

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "overview": "2-3 sentences on what this field is and why it matters",
  "prerequisites": ["prereq1", "prereq2", "prereq3"],
  "stages": [
    {
      "level": "Beginner",
      "title": "short evocative stage title",
      "duration": "e.g. 2-3 months",
      "description": "What to focus on and what you will be capable of after completing this stage",
      "concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
      "works": [
        {
          "title": "Exact book or paper title",
          "author": "Author name(s)",
          "year": "YYYY",
          "kind": "book",
          "type": "pedagogical",
          "note": "One sentence on why this specific work matters at this stage"
        }
      ]
    },
    { "level": "Intermediate", "works": [...] },
    { "level": "Advanced", "works": [...] },
    { "level": "Research", "works": [...] }
  ],
  "branches": ["specialization1", "specialization2", "specialization3", "specialization4", "specialization5"]
}

Rules:
- Exactly 4 stages in order: Beginner, Intermediate, Advanced, Research
- 4-6 concepts per stage — specific learnable skills or ideas, not vague categories
- Works per stage: include ALL core, canonical books and papers a serious student must read — no arbitrary cap. Typically 5-10 per stage. Only omit a work if it is genuinely redundant with another listed work.
- Real, verifiable titles only (no fabrications). If unsure of a title, omit it.
- Each work must have kind: "paper" or "book", and type: one of:
    "breakthrough" = paradigm-shifting, changed the field permanently
    "seminal"      = foundational, widely cited, shaped the direction of research
    "pedagogical"  = best for learning, clear exposition, ideal for students
- Include a healthy mix of papers and books across each stage
- The note must say WHY this work is essential at THIS stage, not just what it is
- Exactly 4 branches at the end
- Be concise in notes — every word counts`

  let lastError = ''

  for (const model of MODEL_FALLBACKS) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      let json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

      // If truncated, close any unclosed brackets so JSON.parse can recover partial data
      if (!json.endsWith('}')) {
        const opens: string[] = []
        let inStr = false, esc = false
        for (const ch of json) {
          if (esc) { esc = false; continue }
          if (ch === '\\' && inStr) { esc = true; continue }
          if (ch === '"') { inStr = !inStr; continue }
          if (!inStr) {
            if (ch === '{' || ch === '[') opens.push(ch === '{' ? '}' : ']')
            if (ch === '}' || ch === ']') opens.pop()
          }
        }
        json += opens.reverse().join('')
      }

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
