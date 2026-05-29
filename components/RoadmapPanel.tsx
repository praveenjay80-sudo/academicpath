'use client'

import { Roadmap } from '@/lib/types'

const STAGE_STYLES = {
  Beginner:     { border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', icon: '🌱' },
  Intermediate: { border: 'border-blue-400',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    icon: '📖' },
  Advanced:     { border: 'border-violet-400',  badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400',  icon: '🔬' },
  Research:     { border: 'border-amber-400',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',   icon: '🚀' },
}

interface Props {
  roadmap: Roadmap
}

export default function RoadmapPanel({ roadmap }: Props) {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <p className="text-xs text-gray-600 leading-relaxed">{roadmap.overview}</p>

      {/* Prerequisites */}
      {roadmap.prerequisites?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Prerequisites</p>
          <div className="flex flex-wrap gap-1">
            {roadmap.prerequisites.map(p => (
              <span key={p} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stages */}
      <div className="space-y-3">
        {roadmap.stages.map((stage, i) => {
          const s = STAGE_STYLES[stage.level] ?? STAGE_STYLES.Beginner
          return (
            <div key={i} className={`border-l-4 ${s.border} pl-3 py-0.5`}>
              {/* Stage header */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.badge}`}>
                  {s.icon} {stage.level}
                </span>
                <span className="text-[10px] text-gray-400">{stage.duration}</span>
              </div>

              <p className="text-xs font-semibold text-gray-800 mb-0.5">{stage.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{stage.description}</p>

              {/* Concepts */}
              <div className="flex flex-wrap gap-1 mb-2">
                {stage.concepts.map(c => (
                  <span key={c} className="text-[10px] bg-gray-50 border border-gray-200 text-gray-600 rounded px-1.5 py-0.5">{c}</span>
                ))}
              </div>

              {/* Key texts */}
              <div className="space-y-1">
                {stage.texts.map(t => (
                  <p key={t} className="text-[11px] text-gray-500 flex gap-1">
                    <span className="text-gray-300 flex-shrink-0">📕</span>
                    <span>{t}</span>
                  </p>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Branches */}
      {roadmap.branches?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Specializations</p>
          <div className="flex flex-wrap gap-1">
            {roadmap.branches.map(b => (
              <span key={b} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5">{b}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
