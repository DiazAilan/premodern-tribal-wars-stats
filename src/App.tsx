import { useEffect, useMemo, useState } from 'react'
import './App.scss'
import type { CsvTable } from './lib/sheets'
import { fetchGoogleSheetCsvTable } from './lib/sheets'
import { CountryFilterPanel } from './components/CountryFilterPanel'
import { PieChart, type PieDatum } from './components/PieChart'
import {
  countsToSortedPairs,
  computeColorCounts,
  computeTribeCounts,
  csvTableToSheetRows,
  distinctCountries,
  filterRowsByCountries,
} from './lib/stats'

type SortState =
  | { key: 'Country'; dir: 'asc' | 'desc' }
  | { key: null; dir: 'asc' | 'desc' }

/** Dark, saturated mana tones inspired by MTG promo key art (metallic W, deep U/B, ember R, forest G). */
const MTG_COLOR_PALETTE: Record<string, string> = {
  W: '#c9a227',
  U: '#0a4f9c',
  B: '#5b2d8a',
  R: '#b01010',
  G: '#1a5c2e',
}

function hashColor(label: string): string {
  let h = 2166136261
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 78% 42%)`
}

function App() {
  const [table, setTable] = useState<CsvTable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' })

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

  const allRows = useMemo(() => {
    if (!table) return null
    return csvTableToSheetRows(table)
  }, [table])

  const countries = useMemo(() => {
    if (!allRows) return []
    return distinctCountries(allRows)
  }, [allRows])

  useEffect(() => {
    if (!countries.length) return
    setSelectedCountries((prev) => {
      if (prev.size) return prev
      return new Set(countries)
    })
  }, [countries])

  const filteredRows = useMemo(() => {
    if (!allRows) return null
    return filterRowsByCountries(allRows, selectedCountries)
  }, [allRows, selectedCountries])

  const globalTribeData = useMemo<PieDatum[]>(() => {
    if (!allRows) return []
    return countsToSortedPairs(computeTribeCounts(allRows)).map((p) => ({
      label: p.label,
      value: p.value,
      color: hashColor(p.label),
    }))
  }, [allRows])

  const filteredTribeData = useMemo<PieDatum[]>(() => {
    if (!filteredRows) return []
    return countsToSortedPairs(computeTribeCounts(filteredRows)).map((p) => ({
      label: p.label,
      value: p.value,
      color: hashColor(p.label),
    }))
  }, [filteredRows])

  const globalColorData = useMemo<PieDatum[]>(() => {
    if (!allRows) return []
    return countsToSortedPairs(computeColorCounts(allRows)).map((p) => ({
      label: p.label,
      value: p.value,
      color: MTG_COLOR_PALETTE[p.label] ?? hashColor(p.label),
    }))
  }, [allRows])

  const filteredColorData = useMemo<PieDatum[]>(() => {
    if (!filteredRows) return []
    return countsToSortedPairs(computeColorCounts(filteredRows)).map((p) => ({
      label: p.label,
      value: p.value,
      color: MTG_COLOR_PALETTE[p.label] ?? hashColor(p.label),
    }))
  }, [filteredRows])

  const sortedTableRows = useMemo(() => {
    if (!table) return null
    if (sort.key !== 'Country') return table.rows
    const idx = table.headers.findIndex((h) => h.trim().toLowerCase() === 'country')
    if (idx < 0) return table.rows
    const dirMul = sort.dir === 'asc' ? 1 : -1
    return [...table.rows].sort((a, b) => {
      const av = String(a[idx] ?? '').localeCompare(String(b[idx] ?? ''))
      return av * dirMul
    })
  }, [table, sort])

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
          <div className="panelInner">
            <aside className="sidebar">
              <CountryFilterPanel
                countries={countries}
                selectedCountries={selectedCountries}
                onToggleCountry={(country) => {
                  setSelectedCountries((prev) => {
                    const next = new Set(prev)
                    if (next.has(country)) next.delete(country)
                    else next.add(country)
                    return next
                  })
                }}
                onSelectAll={() => setSelectedCountries(new Set(countries))}
                onClear={() => setSelectedCountries(new Set())}
              />

              <div className="sortPanel">
                <div className="sortTitle">Sort</div>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setSort((prev) => {
                      if (prev.key !== 'Country') return { key: 'Country', dir: 'asc' }
                      if (prev.dir === 'asc') return { key: 'Country', dir: 'desc' }
                      return { key: null, dir: 'asc' }
                    })
                  }
                >
                  Country{' '}
                  <span className="sortHint">
                    {sort.key === 'Country' ? (sort.dir === 'asc' ? '↑' : '↓') : '—'}
                  </span>
                </button>
                <div className="sortMeta">Click to toggle asc/desc/off.</div>
              </div>
            </aside>

            <div className="content">
              <div className="chartsGrid">
                <div className="chartsColumn">
                  <div className="chartsHeader">
                    <div className="chartsTitle">Global</div>
                    <div className="chartsMeta">{allRows?.length ?? 0} rows</div>
                  </div>
                  <div className="chartsRow">
                    <PieChart title="Colors" data={globalColorData} />
                    <PieChart title="Tribes" data={globalTribeData} />
                  </div>
                </div>

                <div className="chartsColumn">
                  <div className="chartsHeader">
                    <div className="chartsTitle">Filtered</div>
                    <div className="chartsMeta">{filteredRows?.length ?? 0} rows</div>
                  </div>
                  <div className="chartsRow">
                    <PieChart title="Colors" data={filteredColorData} />
                    <PieChart title="Tribes" data={filteredTribeData} />
                  </div>
                </div>
              </div>

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
                    {(sortedTableRows ?? table.rows).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {table.headers.map((_, cIdx) => (
                          <td key={cIdx}>{row[cIdx] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default App
