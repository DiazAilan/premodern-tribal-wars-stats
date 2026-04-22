import type { CsvTable } from './sheets'

export type SheetRow = {
  deckName: string
  tribe: string
  colors: string
  score: string
  event: string
  country: string
  position: string
}

export type CountByLabel = Record<string, number>

function normalizeCell(v: unknown): string {
  return String(v ?? '').trim()
}

function getHeaderIndex(headers: string[], headerName: string): number {
  return headers.findIndex((h) => h.trim().toLowerCase() === headerName.toLowerCase())
}

export function csvTableToSheetRows(table: CsvTable): SheetRow[] {
  const idxDeckName = getHeaderIndex(table.headers, 'Deck Name')
  const idxTribe = getHeaderIndex(table.headers, 'Tribe')
  const idxColors = getHeaderIndex(table.headers, 'Colors')
  const idxScore = getHeaderIndex(table.headers, 'Score')
  const idxEvent = getHeaderIndex(table.headers, 'Event')
  const idxCountry = getHeaderIndex(table.headers, 'Country')
  const idxPosition = getHeaderIndex(table.headers, 'Position')

  return table.rows.map((r) => ({
    deckName: normalizeCell(r[idxDeckName]),
    tribe: normalizeCell(r[idxTribe]),
    colors: normalizeCell(r[idxColors]),
    score: normalizeCell(r[idxScore]),
    event: normalizeCell(r[idxEvent]),
    country: normalizeCell(r[idxCountry]),
    position: normalizeCell(r[idxPosition]),
  }))
}

export function distinctCountries(rows: SheetRow[]): string[] {
  const s = new Set<string>()
  for (const r of rows) {
    const c = r.country.trim()
    if (!c) continue
    s.add(c)
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b))
}

export function filterRowsByCountries(rows: SheetRow[], selectedCountries: Set<string>): SheetRow[] {
  return rows.filter((r) => selectedCountries.has(r.country))
}

export function computeTribeCounts(rows: SheetRow[]): CountByLabel {
  const counts: CountByLabel = {}
  for (const r of rows) {
    const tribe = r.tribe.trim()
    if (!tribe) continue
    counts[tribe] = (counts[tribe] ?? 0) + 1
  }
  return counts
}

export function computeColorCounts(rows: SheetRow[]): CountByLabel {
  const counts: CountByLabel = {}
  for (const r of rows) {
    const raw = r.colors.trim()
    if (!raw) continue
    for (const ch of raw.toUpperCase()) {
      if (!/[WUBRG]/.test(ch)) continue
      counts[ch] = (counts[ch] ?? 0) + 1
    }
  }
  return counts
}

export function countsToSortedPairs(counts: CountByLabel): Array<{ label: string; value: number }> {
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}

