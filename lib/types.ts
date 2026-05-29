export type PaperTag = 'FOUNDATIONAL' | 'SURVEY' | 'RECENT' | 'INFLUENTIAL'

export interface Paper {
  id: string
  title: string
  authors: string
  year: number
  citations: number
  link: string
  pdfLink?: string
  tag: PaperTag
}

export interface Book {
  id: string
  title: string
  authors: string
  year: number
  editions: number
  holdings: number
  coverUrl?: string
  openLibraryLink: string
}

export interface ScholarBook {
  id: string
  title: string
  authors: string
  year: number
  citations: number
  link: string
  pdfLink?: string
}

export interface ArchiveBook {
  id: string
  title: string
  creator: string
  year: string
  downloads: number
  link: string
}

export interface OpenAlexConcept {
  id: string           // e.g. "C119857082"
  display_name: string
  level: number        // 0 = top-level field, higher = more specific
  works_count: number
  description: string
  link: string         // https://openalex.org/C...
}

export interface OpenAlexTopic {
  id: string           // e.g. "T12072"
  display_name: string
  works_count: number
  domain: string       // e.g. "Physical Sciences"
  field: string        // e.g. "Physics and Astronomy"
  subfield: string     // e.g. "Quantum Physics"
  link: string         // https://openalex.org/T...
}

export interface RoadmapWork {
  title: string
  author: string
  year: string
  kind: 'paper' | 'book'
  type: 'breakthrough' | 'seminal' | 'pedagogical'
  note: string
}

export interface RoadmapStage {
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Research'
  title: string
  duration: string
  description: string
  concepts: string[]
  works: RoadmapWork[]
}

export interface Roadmap {
  overview: string
  prerequisites: string[]
  stages: RoadmapStage[]
  branches: string[]
}

export interface TaxonomyNode {
  id: string           // e.g. "C127413603"
  display_name: string
  level: number        // 0 = Field, 1 = Domain, 2 = Area, 3 = Topic, 4+ = Specialty
  works_count: number
  description: string
}
