import { useState, useEffect } from 'react'
import { getContractPrices } from '../services/api'
import './ContractPriceTable.css'

const ContractPriceTable = ({ contractFileId, onClose }) => {
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPrices()
  }, [contractFileId])

  const loadPrices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getContractPrices(contractFileId)
      setPrices(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <div className="price-modal-overlay" onClick={onClose}>
      <div className="price-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="price-modal-header">
          <h2>Vertragspreise</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="price-modal-body">
          {loading && (
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Preise werden geladen...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && prices.length === 0 && (
            <div className="empty-message">
              <div className="empty-icon">📝</div>
              <p>Keine Preise für diesen Vertrag vorhanden</p>
            </div>
          )}

          {!loading && !error && prices.length > 0 && (
            <div className="price-table-wrapper">
              <table className="price-table">
                <thead>
                  <tr>
                    <th>Positionsnummer</th>
                    <th>Beschreibung</th>
                    <th>Preis</th>
                    <th>Einheit</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price, index) => (
                    <tr key={price.id || index}>
                      <td className="position-cell">{price.positionNumber || '-'}</td>
                      <td className="description-cell">{price.description || '-'}</td>
                      <td className="price-cell">{formatPrice(price.price)}</td>
                      <td className="unit-cell">{price.unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="price-modal-footer">
          <button className="close-footer-button" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContractPriceTable
