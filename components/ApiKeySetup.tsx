'use client'

import { useState, FormEvent } from 'react'

interface Props {
  onSave: (serpKey: string, anthropicKey: string) => void
  initialSerp?: string
  initialAnthropic?: string
}

export default function ApiKeySetup({ onSave, initialSerp = '', initialAnthropic = '' }: Props) {
  const [serp, setSerp] = useState(initialSerp)
  const [anthropic, setAnthropic] = useState(initialAnthropic)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const serpTrimmed = serp.trim()
    const anthropicTrimmed = anthropic.trim()
    if (!serpTrimmed || !anthropicTrimmed) {
      setError('Both keys are required.')
      return
    }

    setTesting(true)
    setError('')

    try {
      const res = await fetch(`/api/papers?q=test`, {
        headers: { 'x-serpapi-key': serpTrimmed },
      })
      const data = await res.json()

      if (data.error?.toLowerCase().includes('401') || data.error?.toLowerCase().includes('invalid')) {
        setError('SerpAPI key is invalid. Check it at serpapi.com and try again.')
        return
      }

      localStorage.setItem('serpapi_key', serpTrimmed)
      localStorage.setItem('anthropic_key', anthropicTrimmed)
      onSave(serpTrimmed, anthropicTrimmed)
    } catch {
      setError('Could not verify keys. Check your internet connection and try again.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🎓</p>
          <h1 className="text-2xl font-bold text-gray-900">AcademicPath</h1>
          <p className="text-sm text-gray-500 mt-1">Master any topic — zero to expert</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SerpAPI */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              SerpAPI key
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Used for Google Scholar keyword chips.{' '}
              <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline">
                Get one free
              </a>{' '}
              (100 searches/month)
            </p>
            <input
              type="text"
              value={serp}
              onChange={(e) => setSerp(e.target.value)}
              placeholder="Paste SerpAPI key"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              autoFocus
              suppressHydrationWarning
            />
          </div>

          {/* Anthropic */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Anthropic API key
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Used to generate L2/L3 academic subfield dropdowns.{' '}
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline">
                Get one at console.anthropic.com
              </a>
            </p>
            <input
              type="text"
              value={anthropic}
              onChange={(e) => setAnthropic(e.target.value)}
              placeholder="sk-ant-…"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              suppressHydrationWarning
            />
          </div>

          {error && <p className="text-sm text-red-600">⚠️ {error}</p>}

          <button
            type="submit"
            disabled={testing || !serp.trim() || !anthropic.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Verifying…
              </span>
            ) : (
              'Save & Start'
            )}
          </button>
        </form>

        <p className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          Keys are stored only in your browser — never sent to our servers.
        </p>
      </div>
    </div>
  )
}
