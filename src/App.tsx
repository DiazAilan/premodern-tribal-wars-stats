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
  filterRowsByManaLetter,
  filterRowsByTribe,
  normalizeManaLetter,
} from './lib/stats'

type SectionSpotlight = {
  mana: string | null
  tribe: string | null
}

const emptySectionSpotlight: SectionSpotlight = { mana: null, tribe: null }

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
  const [spotlightGlobal, setSpotlightGlobal] = useState<SectionSpotlight>(emptySectionSpotlight)
  const [spotlightFiltered, setSpotlightFiltered] = useState<SectionSpotlight>(emptySectionSpotlight)

  const toggleManaSpotlight = (scope: 'global' | 'filtered', letter: string) => {
    const L = normalizeManaLetter(letter)
    if (!L) return
    const setSection = scope === 'global' ? setSpotlightGlobal : setSpotlightFiltered
    setSection((prev) => {
      const nextMana = prev.mana === L ? null : L
      if (nextMana === null) return { ...prev, mana: null }
      return { mana: nextMana, tribe: null }
    })
  }

  const toggleTribeSpotlight = (scope: 'global' | 'filtered', tribe: string) => {
    const t = tribe.trim()
    if (!t) return
    const setSection = scope === 'global' ? setSpotlightGlobal : setSpotlightFiltered
    setSection((prev) => {
      const nextTribe = prev.tribe === t ? null : t
      if (nextTribe === null) return { ...prev, tribe: null }
      return { mana: null, tribe: nextTribe }
    })
  }

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
    const base = spotlightGlobal.mana ? filterRowsByManaLetter(allRows, spotlightGlobal.mana) : allRows
    return countsToSortedPairs(computeTribeCounts(base)).map((p) => ({
      label: p.label,
      value: p.value,
      color: hashColor(p.label),
    }))
  }, [allRows, spotlightGlobal.mana])

  const filteredTribeData = useMemo<PieDatum[]>(() => {
    if (!filteredRows) return []
    const base = spotlightFiltered.mana ? filterRowsByManaLetter(filteredRows, spotlightFiltered.mana) : filteredRows
    return countsToSortedPairs(computeTribeCounts(base)).map((p) => ({
      label: p.label,
      value: p.value,
      color: hashColor(p.label),
    }))
  }, [filteredRows, spotlightFiltered.mana])

  const globalColorData = useMemo<PieDatum[]>(() => {
    if (!allRows) return []
    const base = spotlightGlobal.tribe ? filterRowsByTribe(allRows, spotlightGlobal.tribe) : allRows
    return countsToSortedPairs(computeColorCounts(base)).map((p) => ({
      label: p.label,
      value: p.value,
      color: MTG_COLOR_PALETTE[p.label] ?? hashColor(p.label),
    }))
  }, [allRows, spotlightGlobal.tribe])

  const filteredColorData = useMemo<PieDatum[]>(() => {
    if (!filteredRows) return []
    const base = spotlightFiltered.tribe ? filterRowsByTribe(filteredRows, spotlightFiltered.tribe) : filteredRows
    return countsToSortedPairs(computeColorCounts(base)).map((p) => ({
      label: p.label,
      value: p.value,
      color: MTG_COLOR_PALETTE[p.label] ?? hashColor(p.label),
    }))
  }, [filteredRows, spotlightFiltered.tribe])

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
            <div className="content">
              <div className="countriesBar">
                <CountryFilterPanel
                  className="countryPanel--horizontal"
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
              </div>

              <div className="chartsGrid">
                <div className="chartsColumn">
                  <div className="chartsHeader">
                    <div className="chartsTitle">Global</div>
                    <div className="chartsMeta">{allRows?.length ?? 0} rows</div>
                  </div>
                  <div className="chartsRow">
                    <PieChart
                      title="Colors"
                      data={globalColorData}
                      spotlightActiveLabel={spotlightGlobal.mana}
                      onSpotlightToggle={(label) => toggleManaSpotlight('global', label)}
                    />
                    <PieChart
                      title="Tribes"
                      data={globalTribeData}
                      spotlightActiveLabel={spotlightGlobal.tribe}
                      onSpotlightToggle={(label) => toggleTribeSpotlight('global', label)}
                    />
                  </div>
                </div>

                <div className="chartsColumn">
                  <div className="chartsHeader">
                    <div className="chartsTitle">Filtered</div>
                    <div className="chartsMeta">{filteredRows?.length ?? 0} rows</div>
                  </div>
                  <div className="chartsRow">
                    <PieChart
                      title="Colors"
                      data={filteredColorData}
                      spotlightActiveLabel={spotlightFiltered.mana}
                      onSpotlightToggle={(label) => toggleManaSpotlight('filtered', label)}
                    />
                    <PieChart
                      title="Tribes"
                      data={filteredTribeData}
                      spotlightActiveLabel={spotlightFiltered.tribe}
                      onSpotlightToggle={(label) => toggleTribeSpotlight('filtered', label)}
                    />
                  </div>
                </div>
              </div>

              {spotlightGlobal.mana ||
              spotlightGlobal.tribe ||
              spotlightFiltered.mana ||
              spotlightFiltered.tribe ? (
                <div className="spotlightBar">
                  <div className="spotlightBarGroup">
                    <span className="spotlightBarLabel">Global</span>
                    {spotlightGlobal.mana ? (
                      <button
                        type="button"
                        className="btn btnSmall"
                        onClick={() => setSpotlightGlobal((s) => ({ ...s, mana: null }))}
                      >
                        Clear mana ({spotlightGlobal.mana})
                      </button>
                    ) : null}
                    {spotlightGlobal.tribe ? (
                      <button
                        type="button"
                        className="btn btnSmall"
                        onClick={() => setSpotlightGlobal((s) => ({ ...s, tribe: null }))}
                      >
                        Clear tribe ({spotlightGlobal.tribe})
                      </button>
                    ) : null}
                  </div>
                  <div className="spotlightBarGroup">
                    <span className="spotlightBarLabel">Filtered</span>
                    {spotlightFiltered.mana ? (
                      <button
                        type="button"
                        className="btn btnSmall"
                        onClick={() => setSpotlightFiltered((s) => ({ ...s, mana: null }))}
                      >
                        Clear mana ({spotlightFiltered.mana})
                      </button>
                    ) : null}
                    {spotlightFiltered.tribe ? (
                      <button
                        type="button"
                        className="btn btnSmall"
                        onClick={() => setSpotlightFiltered((s) => ({ ...s, tribe: null }))}
                      >
                        Clear tribe ({spotlightFiltered.tribe})
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default App
