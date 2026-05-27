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
