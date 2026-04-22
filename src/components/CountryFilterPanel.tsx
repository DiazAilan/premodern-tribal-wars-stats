type Props = {
  countries: string[]
  selectedCountries: Set<string>
  onToggleCountry: (country: string) => void
  onSelectAll: () => void
  onClear: () => void
  /** e.g. `countryPanel--horizontal` for top bar layout */
  className?: string
}

export function CountryFilterPanel({
  countries,
  selectedCountries,
  onToggleCountry,
  onSelectAll,
  onClear,
  className,
}: Props) {
  const selectedCount = selectedCountries.size
  const rootClass = ['countryPanel', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <div className="countryPanelHeader">
        <div className="countryPanelTitle">Countries</div>
        <div className="countryPanelMeta">
          {selectedCount}/{countries.length} selected
        </div>
      </div>

      <div className="countryPanelActions">
        <button type="button" className="btn" onClick={onSelectAll} disabled={selectedCount === countries.length}>
          Select all
        </button>
        <button type="button" className="btn" onClick={onClear} disabled={selectedCount === 0}>
          Clear
        </button>
      </div>

      <div className="countryPanelList">
        {countries.map((country) => {
          const checked = selectedCountries.has(country)
          return (
            <label key={country} className="countryOption">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleCountry(country)}
              />
              <span>{country}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

