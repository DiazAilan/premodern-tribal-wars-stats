type Props = {
  countries: string[]
  selectedCountries: Set<string>
  onToggleCountry: (country: string) => void
  onSelectAll: () => void
  onClear: () => void
}

export function CountryFilterPanel({
  countries,
  selectedCountries,
  onToggleCountry,
  onSelectAll,
  onClear,
}: Props) {
  const selectedCount = selectedCountries.size

  return (
    <div className="countryPanel">
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

