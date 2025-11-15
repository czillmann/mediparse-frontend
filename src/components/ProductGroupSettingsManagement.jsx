import { useState, useEffect } from 'react'
import './ProductGroupSettingsManagement.css'

const ProductGroupSettingsManagement = () => {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSettings, setEditingSettings] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [formData, setFormData] = useState({
    number: '',
    promptPositionExtraction: '',
    items: []
  })

  const [newItem, setNewItem] = useState({ hmv: '', description: '' })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const authData = JSON.parse(localStorage.getItem('mediparse_auth'))
      const response = await fetch('http://localhost:8080/api/product-group-settings', {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Produktgruppeneinstellungen')
      }

      const data = await response.json()
      setSettings(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingSettings(null)
    setFormData({
      number: '',
      promptPositionExtraction: '',
      items: []
    })
    setShowModal(true)
  }

  const handleEdit = (setting) => {
    setEditingSettings(setting)
    setFormData({
      number: setting.number,
      promptPositionExtraction: setting.promptPositionExtraction || '',
      items: setting.items || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Produktgruppeneinstellung löschen möchten?')) {
      return
    }

    try {
      setDeletingId(id)
      const authData = JSON.parse(localStorage.getItem('mediparse_auth'))
      const response = await fetch(`http://localhost:8080/api/product-group-settings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Löschen')
      }

      await loadSettings()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const authData = JSON.parse(localStorage.getItem('mediparse_auth'))
      const url = editingSettings
        ? `http://localhost:8080/api/product-group-settings/${editingSettings.id}`
        : 'http://localhost:8080/api/product-group-settings'

      const response = await fetch(url, {
        method: editingSettings ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.accessToken}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Speichern')
      }

      setShowModal(false)
      await loadSettings()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddItem = () => {
    if (!newItem.hmv || !newItem.description) {
      alert('Bitte füllen Sie alle Felder aus')
      return
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem }]
    })
    setNewItem({ hmv: '', description: '' })
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  if (loading) {
    return <div className="loading-message">Lade Produktgruppeneinstellungen...</div>
  }

  return (
    <div className="product-group-settings-container">
      <div className="product-group-settings-header">
        <h2>Produktgruppeneinstellungen</h2>
        <button onClick={handleAdd} className="add-button">
          + Neue Produktgruppe
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-table-wrapper">
        <table className="settings-table">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Anzahl Items</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {settings.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
                  Keine Produktgruppeneinstellungen vorhanden
                </td>
              </tr>
            ) : (
              settings.map((setting) => (
                <tr key={setting.id}>
                  <td>{setting.number}</td>
                  <td>{setting.items?.length || 0}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(setting)}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(setting.id)}
                      disabled={deletingId === setting.id}
                    >
                      {deletingId === setting.id ? '⏳' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSettings ? 'Produktgruppe bearbeiten' : 'Neue Produktgruppe'}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group">
                <label>Nummer *</label>
                <input
                  type="number"
                  required
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) })}
                  placeholder="z.B. 3"
                />
              </div>

              <div className="form-group">
                <label>Prompt Position Extraction</label>
                <textarea
                  rows="4"
                  value={formData.promptPositionExtraction}
                  onChange={(e) => setFormData({ ...formData, promptPositionExtraction: e.target.value })}
                  placeholder="Prompt für Position Extraction..."
                />
              </div>

              <div className="form-group">
                <label>Items</label>
                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <span className="item-hmv">{item.hmv}</span>
                      <span className="item-description">{item.description}</span>
                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="add-item-section">
                  <input
                    type="text"
                    placeholder="HMV"
                    value={newItem.hmv}
                    onChange={(e) => setNewItem({ ...newItem, hmv: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Beschreibung"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                  <button type="button" className="add-item-button" onClick={handleAddItem}>
                    + Item hinzufügen
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Abbrechen
                </button>
                <button type="submit" className="submit-button">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductGroupSettingsManagement
