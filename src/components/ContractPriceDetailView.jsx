import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { getContractPrices } from '../services/api'
import './ContractPriceDetailView.css'

// Configure PDF.js worker - use unpkg CDN which has all versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function ContractPriceDetailView({ contractFileId, contractFileName, onBack }) {
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [pdfData, setPdfData] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loadingPdf, setLoadingPdf] = useState(false)

  useEffect(() => {
    loadPrices()
    loadPdfData()
  }, [contractFileId])

  const loadPrices = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getContractPrices(contractFileId)
      setPrices(data)

      // Select first price if available
      if (data.length > 0 && data[0].pageNumber) {
        setSelectedPrice(data[0])
        setPageNumber(data[0].pageNumber)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPdfData = async () => {
    setLoadingPdf(true)
    try {
      // Download PDF as blob
      const response = await fetch(`http://localhost:8080/api/contract-files/${contractFileId}/download`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('mediparse_auth')).accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setPdfData(url)
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError('PDF konnte nicht geladen werden')
    } finally {
      setLoadingPdf(false)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
  }

  const handlePriceSelect = (price) => {
    setSelectedPrice(price)
    if (price.pageNumber) {
      setPageNumber(price.pageNumber)
    }
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-'
    return `${price.toFixed(2)} €`
  }

  const getSourceBadge = (source) => {
    if (!source) return null

    const badges = {
      'TABLE': { label: 'Tabelle', className: 'source-table' },
      'TEXT': { label: 'Text', className: 'source-text' }
    }

    const badge = badges[source] || { label: source, className: 'source-unknown' }

    return (
      <span className={`source-badge ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const goToPrevPage = () => {
    setPageNumber(prevPage => Math.max(1, prevPage - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prevPage => Math.min(numPages, prevPage + 1))
  }

  const zoomIn = () => {
    setScale(prevScale => Math.min(2.0, prevScale + 0.1))
  }

  const zoomOut = () => {
    setScale(prevScale => Math.max(0.5, prevScale - 0.1))
  }

  if (loading) {
    return (
      <div className="price-detail-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Preise...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="price-detail-view">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={onBack} className="back-button">Zurück</button>
        </div>
      </div>
    )
  }

  return (
    <div className="price-detail-view">
      <div className="detail-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← Zurück
          </button>
          <h2>{contractFileName}</h2>
        </div>
        <div className="header-stats">
          <span className="stat-badge">
            📊 {prices.length} Position{prices.length !== 1 ? 'en' : ''}
          </span>
        </div>
      </div>

      <div className="detail-content">
        {/* Price Table Section */}
        <div className="prices-section">
          <div className="section-header">
            <h3>Extrahierte Preise</h3>
          </div>

          {prices.length === 0 ? (
            <div className="empty-prices">
              <p>Keine Preise gefunden</p>
            </div>
          ) : (
            <div className="prices-table-container">
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Beschreibung</th>
                    <th>Preis</th>
                    <th>Einheit</th>
                    <th>Quelle</th>
                    <th>Seite</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr
                      key={price.id}
                      className={selectedPrice?.id === price.id ? 'selected' : ''}
                      onClick={() => handlePriceSelect(price)}
                    >
                      <td className="position-cell">{price.positionNumber}</td>
                      <td className="description-cell">{price.description || '-'}</td>
                      <td className="price-cell">{formatPrice(price.price)}</td>
                      <td>{price.unit || '-'}</td>
                      <td>{getSourceBadge(price.source)}</td>
                      <td className="page-cell">{price.pageNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PDF Viewer Section */}
        <div className="pdf-section">
          <div className="section-header">
            <h3>PDF Vorschau</h3>
            <div className="pdf-controls">
              <button onClick={zoomOut} className="zoom-button" title="Verkleinern">
                🔍-
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="zoom-button" title="Vergrößern">
                🔍+
              </button>
              <div className="page-controls">
                <button onClick={goToPrevPage} disabled={pageNumber <= 1}>
                  ←
                </button>
                <span className="page-info">
                  Seite {pageNumber} von {numPages || '?'}
                </span>
                <button onClick={goToNextPage} disabled={pageNumber >= numPages}>
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="pdf-viewer-container">
            {loadingPdf ? (
              <div className="pdf-loading">
                <div className="loading-spinner"></div>
                <p>Lade PDF...</p>
              </div>
            ) : pdfData ? (
              <div className="pdf-canvas-wrapper">
                <Document
                  file={pdfData}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="pdf-loading">
                      <div className="loading-spinner"></div>
                      <p>PDF wird geladen...</p>
                    </div>
                  }
                  error={
                    <div className="pdf-error">
                      <p>PDF konnte nicht geladen werden</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>
            ) : (
              <div className="pdf-error">
                <p>PDF nicht verfügbar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractPriceDetailView