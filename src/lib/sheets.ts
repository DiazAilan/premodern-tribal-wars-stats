import Papa from 'papaparse'

export type CsvTable = {
  headers: string[]
  rows: string[][]
}

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/11SI9GyeHao0E0anHlTEQpMuMT2mYb9qPSW1HVOujzWY/export?format=csv&gid=0'

export async function fetchGoogleSheetCsvTable(signal?: AbortSignal): Promise<CsvTable> {
  const res = await fetch(SHEET_CSV_URL, { signal })
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV (HTTP ${res.status})`)
  }

  const csvText = await res.text()

  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: 'greedy',
  })

  if (parsed.errors?.length) {
    const first = parsed.errors[0]
    throw new Error(first.message || 'Failed to parse CSV')
  }

  const data = parsed.data ?? []
  const [rawHeaders, ...rawRows] = data

  const headers = (rawHeaders ?? []).map((h) => String(h ?? '').trim())
  const rows = rawRows.map((r) => (r ?? []).map((cell) => String(cell ?? '')))

  return { headers, rows }
}

