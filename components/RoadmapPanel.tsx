'use client'

import { Roadmap, RoadmapWork } from '@/lib/types'

const STAGE_STYLES = {
  Beginner:     { border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: '🌱' },
  Intermediate: { border: 'border-blue-400',    badge: 'bg-blue-100 text-blue-700',       icon: '📖' },
  Advanced:     { border: 'border-violet-400',  badge: 'bg-violet-100 text-violet-700',   icon: '🔬' },
  Research:     { border: 'border-amber-400',   badge: 'bg-amber-100 text-amber-700',     icon: '🚀' },
}

const TYPE_BADGE: Record<string, string> = {
  breakthrough: 'bg-red-100 text-red-700',
  seminal:      'bg-violet-100 text-violet-700',
  pedagogical:  'bg-teal-100 text-teal-700',
}

const TYPE_LABEL: Record<string, string> = {
  breakthrough: '🔥 Breakthrough',
  seminal:      '⭐ Seminal',
  pedagogical:  '📖 Pedagogical',
}

const KIND_ICON: Record<string, string> = { paper: '📄', book: '📚' }

function WorkItem({ work }: { work: RoadmapWork }) {
  return (
    <div className="flex gap-2">
      <span className="flex-shrink-0 text-sm mt-0.5">{KIND_ICON[work.kind] ?? '📄'}</span>
      <div>
        <span className="text-[12px] font-semibold text-gray-900">{work.title} </span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[work.type] ?? TYPE_BADGE.seminal}`}>
          {TYPE_LABEL[work.type] ?? work.type}
        </span>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {work.author}{work.year ? ` · ${work.year}` : ''}
        </p>
        <p className="text-[11px] text-gray-500 italic leading-relaxed">{work.note}</p>
      </div>
    </div>
  )
}

export default function RoadmapPanel({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-600 leading-relaxed">{roadmap.overview}</p>

      {roadmap.prerequisites?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prerequisites</p>
          <div className="flex flex-wrap gap-1">
            {roadmap.prerequisites.map(p => (
              <span key={p} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{p}</span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {roadmap.stages.map((stage, i) => {
          const s = STAGE_STYLES[stage.level] ?? STAGE_STYLES.Beginner
          return (
            <div key={i} className={`border-l-4 ${s.border} pl-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.icon} {stage.level}
                </span>
                <span className="text-[10px] text-gray-400">{stage.duration}</span>
              </div>

              <p className="text-sm font-bold text-gray-800 mb-1">{stage.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{stage.description}</p>

              <div className="flex flex-wrap gap-1 mb-3">
                {stage.concepts.map(c => (
                  <span key={c} className="text-[10px] bg-white border border-gray-200 text-gray-600 rounded px-1.5 py-0.5">{c}</span>
                ))}
              </div>

              {stage.works?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Essential Reading</p>
                  {stage.works.map((w, j) => <WorkItem key={j} work={w} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {roadmap.branches?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Where This Leads</p>
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
