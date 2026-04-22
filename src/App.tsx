import { useEffect, useMemo, useState } from 'react'
import './App.scss'
import type { CsvTable } from './lib/sheets'
import { fetchGoogleSheetCsvTable } from './lib/sheets'

function App() {
  const [table, setTable] = useState<CsvTable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoading(true)
        setError(null)
        const t = await fetchGoogleSheetCsvTable(controller.signal)
        setTable(t)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Unknown error')
        setTable(null)
      } finally {
        setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  const summary = useMemo(() => {
    if (!table) return null
    return `${table.headers.length} columns · ${table.rows.length} rows`
  }, [table])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Premodern Tribal Wars Stats</h1>
          <div className="meta">
            Source: Google Sheets (CSV) {summary ? `· ${summary}` : ''}
          </div>
        </div>
        <div className="meta">
          <a
            href="https://docs.google.com/spreadsheets/d/11SI9GyeHao0E0anHlTEQpMuMT2mYb9qPSW1HVOujzWY/edit?usp=sharing"
            target="_blank"
            rel="noreferrer"
          >
            Open sheet
          </a>
        </div>
      </header>

      <section className="panel">
        {isLoading ? <div className="status">Loading CSV…</div> : null}
        {!isLoading && error ? <div className="error">Error: {error}</div> : null}

        {!isLoading && !error && table ? (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  {table.headers.map((h, idx) => (
                    <th key={`${h}-${idx}`}>{h || `Column ${idx + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {table.headers.map((_, cIdx) => (
                      <td key={cIdx}>{row[cIdx] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default App
