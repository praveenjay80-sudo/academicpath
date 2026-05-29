'use client'

import { useState, FormEvent } from 'react'

interface Props {
  onSave: (key: string) => void
}

export default function ApiKeySetup({ onSave }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    setTesting(true)
    setError('')

    try {
      const res = await fetch('/api/papers?q=test', {
        headers: { 'x-serpapi-key': trimmed },
      })
      const data = await res.json()

      if (res.status === 401 || data.error?.toLowerCase().includes('invalid')) {
        setError('Invalid SerpAPI key. Check it at serpapi.com and try again.')
        return
      }

      localStorage.setItem('serpapi_key', trimmed)
      onSave(trimmed)
    } catch {
      setError('Could not verify key. Check your internet connection and try again.')
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

        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Enter your SerpAPI key</h2>
          <p className="text-sm text-gray-500">
            Powers Google Scholar paper search sorted by citations. Stored only in your browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste your SerpAPI key here"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            autoFocus
            suppressHydrationWarning
          />

          {error && <p className="text-sm text-red-600">⚠️ {error}</p>}

          <button
            type="submit"
            disabled={testing || !value.trim()}
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
              'Save & Start Searching'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Don&apos;t have a key?{' '}
            <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener noreferrer"
              className="text-indigo-600 hover:underline font-medium">
              Sign up at serpapi.com
            </a>{' '}
            — 100 free searches/month
          </p>
        </div>
      </div>
    </div>
  )
}
