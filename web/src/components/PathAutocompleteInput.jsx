import React, { useEffect, useRef, useState } from 'react'
import './PathAutocompleteInput.css'

const DEBOUNCE_MS = 250
const VISIBLE_CANDIDATES = 6

export default function PathAutocompleteInput({ value, onChange, onValidityChange }) {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value === '') {
      setEntries(null)
      setError(null)
      setOpen(false)
      onValidityChange(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetch(`/api/list?path=${encodeURIComponent(value)}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.error) {
            setError(result.error)
            setEntries(null)
            setOpen(false)
            onValidityChange(false)
          } else {
            setError(null)
            setEntries(result.entries ?? [])
            setOpen(true)
            onValidityChange(true)
          }
        })
        .catch((err) => {
          setError(err.message)
          setEntries(null)
          setOpen(false)
          onValidityChange(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const dirEntries = (entries ?? []).filter((e) => e.isDir)
  const visible = dirEntries.slice(0, VISIBLE_CANDIDATES)
  const overflowCount = dirEntries.length - visible.length

  function handleSelect(name) {
    const separator = value.endsWith('/') ? '' : '/'
    onChange(`${value}${separator}${name}/`)
    setOpen(false)
  }

  return (
    <div className="path-autocomplete">
      <input
        type="text"
        className="path-autocomplete-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => entries && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="/absolute/path/to/workspace"
        aria-label="Workspace path"
      />
      {error && (
        <div className="path-autocomplete-error" role="alert">
          {error}
        </div>
      )}
      {open && visible.length > 0 && (
        <ul className="path-autocomplete-dropdown" role="listbox">
          {visible.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(entry.name)}
              >
                {entry.name}
              </button>
            </li>
          ))}
          {overflowCount > 0 && (
            <li className="path-autocomplete-overflow">+{overflowCount} more — keep typing to narrow</li>
          )}
        </ul>
      )}
    </div>
  )
}
