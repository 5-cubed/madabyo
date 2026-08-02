import React, { useEffect, useState } from 'react'
import PathAutocompleteInput from './PathAutocompleteInput'
import './SettingsPanel.css'

export default function SettingsPanel({ onClose, onSaved }) {
  const [path, setPath] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((cfg) => {
        setPath(cfg.workspacePath ?? '')
        setIsValid(Boolean(cfg.workspacePath))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  function handleChange(next) {
    setPath(next)
    setIsValid(false)
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: path }),
      })
      const result = await res.json()
      if (result.error) {
        setSaveError(result.error)
        setSaving(false)
        return
      }
      setSaving(false)
      onSaved?.()
      onClose()
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  const canSave = loaded && isValid && !saving

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-panel-header">
          <h3>Settings</h3>
          <button type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="settings-panel-body">
          <span className="settings-panel-label">Workspace path</span>
          <PathAutocompleteInput value={path} onChange={handleChange} onValidityChange={setIsValid} />
          {saveError && (
            <div className="settings-panel-error" role="alert">
              {saveError}
            </div>
          )}
        </div>
        <div className="settings-panel-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!canSave} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
