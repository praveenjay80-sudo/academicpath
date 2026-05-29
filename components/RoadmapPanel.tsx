'use client'

import { Roadmap, RoadmapWork } from '@/lib/types'

const STAGE_BADGE: Record<string, string> = {
  Beginner:     'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-blue-100 text-blue-700',
  Advanced:     'bg-violet-100 text-violet-700',
  Research:     'bg-amber-100 text-amber-700',
}

const STAGE_DOT: Record<string, string> = {
  Beginner:     'bg-emerald-400',
  Intermediate: 'bg-blue-400',
  Advanced:     'bg-violet-400',
  Research:     'bg-amber-400',
}

const STAGE_ICON: Record<string, string> = {
  Beginner: '🌱', Intermediate: '📖', Advanced: '🔬', Research: '🚀',
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

interface FlatWork extends RoadmapWork {
  stage: string
  duration: string
}

export default function RoadmapPanel({ roadmap }: { roadmap: Roadmap }) {
  // Flatten all works in stage order into a single list
  const allWorks: FlatWork[] = roadmap.stages.flatMap(stage =>
    (stage.works ?? []).map(w => ({ ...w, stage: stage.level, duration: stage.duration }))
  )

  return (
    <div className="space-y-4">
      {/* Overview */}
      <p className="text-xs text-gray-600 leading-relaxed">{roadmap.overview}</p>

      {/* Prerequisites */}
      {roadmap.prerequisites?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center mr-1">Needs:</span>
          {roadmap.prerequisites.map(p => (
            <span key={p} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{p}</span>
          ))}
        </div>
      )}

      {/* Flowing works — single vertical timeline */}
      <div className="relative border-l-2 border-gray-200 pl-5 space-y-0">
        {allWorks.map((work, i) => {
          const prevStage = i > 0 ? allWorks[i - 1].stage : null
          const isNewStage = work.stage !== prevStage
          const dot = STAGE_DOT[work.stage] ?? 'bg-gray-300'

          return (
            <div key={i}>
              {/* Stage transition label */}
              {isNewStage && (
                <div className="relative -ml-7 mb-3 mt-5 first:mt-0 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_BADGE[work.stage]}`}>
                    {STAGE_ICON[work.stage]} {work.stage} · {work.duration}
                  </span>
                </div>
              )}

              {/* Work node */}
              <div className="relative mb-4">
                {/* Connector dot */}
                <span className={`absolute -left-7 top-1.5 w-2 h-2 rounded-full border-2 border-white ${dot}`} />

                <div className="flex gap-2 items-start">
                  <span className="text-sm flex-shrink-0 mt-0.5">{KIND_ICON[work.kind] ?? '📄'}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-gray-900 leading-snug">{work.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {work.author}{work.year ? ` · ${work.year}` : ''}
                    </p>
                    {/* Both tags inline */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_BADGE[work.stage]}`}>
                        {STAGE_ICON[work.stage]} {work.stage}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[work.type] ?? TYPE_BADGE.seminal}`}>
                        {TYPE_LABEL[work.type] ?? work.type}
                      </span>
                      <span className="text-[9px] text-gray-400 self-center">{work.kind}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 italic leading-relaxed mt-1">{work.note}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* End cap */}
        <div className="relative -ml-7 flex items-center gap-2 pb-1">
          <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
          <span className="text-[10px] text-gray-400 italic">You're at the frontier</span>
        </div>
      </div>

      {/* Specializations */}
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
