import { useState, useEffect } from 'react'
import { getHealthInsurances, deleteHealthInsurance, getContractFiles } from '../services/api'
import HealthInsuranceForm from './HealthInsuranceForm'
import './HealthInsuranceDetail.css'

function HealthInsuranceDetail({ insuranceId, onBack, onEdit }) {
  const [insurance, setInsurance] = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    loadInsurance()
    loadContracts()
  }, [insuranceId])

  const loadInsurance = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getHealthInsurances()
      const found = data.find(ins => ins.id === insuranceId)
      if (found) {
        setInsurance(found)
      } else {
        setError('Krankenkasse nicht gefunden')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadContracts = async () => {
    try {
      const data = await getContractFiles()
      // Filter contracts for this health insurance
      const insuranceContracts = data.filter(contract =>
        contract.healthInsuranceId === insuranceId
      )
      setContracts(insuranceContracts)
    } catch (err) {
      console.error('Fehler beim Laden der Verträge:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Krankenkasse "${insurance.name}" wirklich löschen?`)) {
      return
    }

    setDeleting(true)
    try {
      await deleteHealthInsurance(insurance.id)
      onBack() // Navigate back after successful deletion
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`)
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    setShowMenu(false)
    setShowEditForm(true)
  }

  const handleSaveEdit = () => {
    setShowEditForm(false)
    loadInsurance() // Reload data after edit
    loadContracts() // Reload contracts in case insurance changed
  }

  const handleCancelEdit = () => {
    setShowEditForm(false)
  }

  const formatAddress = (address) => {
    if (!address) return 'Keine Adresse angegeben'
    const parts = []
    if (address.street && address.houseNumber) {
      parts.push(`${address.street} ${address.houseNumber}`)
    }
    if (address.postalCode && address.city) {
      parts.push(`${address.postalCode} ${address.city}`)
    }
    if (address.country) {
      parts.push(address.country)
    }
    return parts.length > 0 ? parts.join(', ') : 'Keine Adresse angegeben'
  }

  if (loading) {
    return (
      <div className="health-insurance-detail">
        <div className="loading-message">Laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="health-insurance-detail">
        <div className="error-message">
          <p>Fehler: {error}</p>
          <button className="btn-secondary" onClick={onBack}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  if (!insurance) {
    return (
      <div className="health-insurance-detail">
        <div className="error-message">
          <p>Krankenkasse nicht gefunden</p>
          <button className="btn-secondary" onClick={onBack}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="health-insurance-detail">
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <h1>{insurance.name}</h1>
        <div className="menu-container">
          <button
            className="menu-button"
            onClick={() => setShowMenu(!showMenu)}
            disabled={deleting}
          >
            ⋮
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button
                className="menu-item"
                onClick={handleEdit}
                disabled={deleting}
              >
                ✏️ Bearbeiten
              </button>
              <button
                className="menu-item danger"
                onClick={() => {
                  setShowMenu(false)
                  handleDelete()
                }}
                disabled={deleting}
              >
                🗑️ {deleting ? 'Löschen...' : 'Löschen'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="info-section">
          <h2>Allgemeine Informationen</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <p>{insurance.name}</p>
            </div>
            <div className="info-item">
              <label>IK-Nummer</label>
              <p>{insurance.ikNumber || 'Nicht angegeben'}</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Adresse</h2>
          <div className="info-grid">
            <div className="info-item full-width">
              <label>Anschrift</label>
              <p>{formatAddress(insurance.address)}</p>
            </div>
            {insurance.address && (
              <>
                {insurance.address.street && (
                  <div className="info-item">
                    <label>Straße</label>
                    <p>{insurance.address.street} {insurance.address.houseNumber || ''}</p>
                  </div>
                )}
                {insurance.address.postalCode && (
                  <div className="info-item">
                    <label>PLZ</label>
                    <p>{insurance.address.postalCode}</p>
                  </div>
                )}
                {insurance.address.city && (
                  <div className="info-item">
                    <label>Stadt</label>
                    <p>{insurance.address.city}</p>
                  </div>
                )}
                {insurance.address.country && (
                  <div className="info-item">
                    <label>Land</label>
                    <p>{insurance.address.country}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="info-section">
          <h2>Kontaktinformationen</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>E-Mail</label>
              <p>{insurance.email || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Telefon</label>
              <p>{insurance.phone || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Fax</label>
              <p>{insurance.fax || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Website</label>
              <p>
                {insurance.website ? (
                  <a href={insurance.website} target="_blank" rel="noopener noreferrer">
                    {insurance.website}
                  </a>
                ) : (
                  'Nicht angegeben'
                )}
              </p>
            </div>
          </div>
        </div>

        {insurance.notes && (
          <div className="info-section">
            <h2>Notizen</h2>
            <div className="info-item full-width">
              <p className="notes">{insurance.notes}</p>
            </div>
          </div>
        )}

        <div className="info-section">
          <h2>Verknüpfte Verträge</h2>
          {contracts.length > 0 ? (
            <div className="linked-items-grid">
              {contracts.map(contract => (
                <div key={contract.id} className="linked-item">
                  <div className="linked-item-icon">📄</div>
                  <div className="linked-item-content">
                    <div className="linked-item-name">{contract.fileName}</div>
                    <div className="linked-item-detail">
                      {contract.uploadDate && new Date(contract.uploadDate).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">Keine Verträge verknüpft</p>
          )}
        </div>
      </div>

      {showEditForm && (
        <HealthInsuranceForm
          insurance={insurance}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  )
}

export default HealthInsuranceDetail
