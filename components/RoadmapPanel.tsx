'use client'

import { Roadmap, RoadmapWork } from '@/lib/types'

const STAGE_STYLES = {
  Beginner:     { border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: '🌱' },
  Intermediate: { border: 'border-blue-400',    badge: 'bg-blue-100 text-blue-700',       icon: '📖' },
  Advanced:     { border: 'border-violet-400',  badge: 'bg-violet-100 text-violet-700',   icon: '🔬' },
  Research:     { border: 'border-amber-400',   badge: 'bg-amber-100 text-amber-700',     icon: '🚀' },
}

const WORK_TYPE_STYLES = {
  breakthrough: {
    badge: 'bg-red-600 text-white',
    glow: 'border border-red-200 bg-red-50',
    label: '🔥 BREAKTHROUGH',
  },
  seminal: {
    badge: 'bg-violet-600 text-white',
    glow: 'border border-violet-200 bg-violet-50',
    label: '⭐ SEMINAL',
  },
  pedagogical: {
    badge: 'bg-teal-600 text-white',
    glow: 'border border-teal-200 bg-teal-50',
    label: '📖 PEDAGOGICAL',
  },
}

const KIND_ICON: Record<string, string> = {
  paper: '📄',
  book: '📚',
}

function WorkCard({ work }: { work: RoadmapWork }) {
  const ts = WORK_TYPE_STYLES[work.type] ?? WORK_TYPE_STYLES.seminal
  return (
    <div className={`rounded-lg p-2.5 ${ts.glow}`}>
      {/* Type badge + kind icon */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide ${ts.badge}`}>
          {ts.label}
        </span>
        <span className="text-[10px]">{KIND_ICON[work.kind] ?? '📄'}</span>
        <span className="text-[10px] text-gray-400">{work.kind}</span>
      </div>

      {/* Title */}
      <p className="text-[12px] font-semibold text-gray-900 leading-snug mb-0.5">
        &ldquo;{work.title}&rdquo;
      </p>

      {/* Author · Year */}
      <p className="text-[10px] text-gray-500 mb-1.5">
        {work.author}{work.year ? ` · ${work.year}` : ''}
      </p>

      {/* Note */}
      <p className="text-[11px] text-gray-600 leading-relaxed italic">
        {work.note}
      </p>
    </div>
  )
}

interface Props {
  roadmap: Roadmap
}

export default function RoadmapPanel({ roadmap }: Props) {
  return (
    <div className="space-y-5">
      {/* Overview */}
      <p className="text-xs text-gray-600 leading-relaxed">{roadmap.overview}</p>

      {/* Prerequisites */}
      {roadmap.prerequisites?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Prerequisites
          </p>
          <div className="flex flex-wrap gap-1">
            {roadmap.prerequisites.map(p => (
              <span key={p} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stages */}
      <div className="space-y-5">
        {roadmap.stages.map((stage, i) => {
          const s = STAGE_STYLES[stage.level] ?? STAGE_STYLES.Beginner
          return (
            <div key={i} className={`border-l-4 ${s.border} pl-3`}>
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.icon} {stage.level}
                </span>
                <span className="text-[10px] text-gray-400">{stage.duration}</span>
              </div>

              <p className="text-sm font-bold text-gray-800 mb-1">{stage.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{stage.description}</p>

              {/* Concepts */}
              <div className="flex flex-wrap gap-1 mb-3">
                {stage.concepts.map(c => (
                  <span key={c} className="text-[10px] bg-white border border-gray-200 text-gray-600 rounded px-1.5 py-0.5">
                    {c}
                  </span>
                ))}
              </div>

              {/* Works */}
              {stage.works?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Essential Reading
                  </p>
                  {stage.works.map((w, j) => (
                    <WorkCard key={j} work={w} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Specializations */}
      {roadmap.branches?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Where This Leads
          </p>
          <div className="flex flex-wrap gap-1">
            {roadmap.branches.map(b => (
              <span key={b} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
