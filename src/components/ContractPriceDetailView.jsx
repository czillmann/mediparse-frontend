import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { getContractPositions } from '../services/api'
import './ContractPriceDetailView.css'

// Configure PDF.js worker - use unpkg CDN which has all versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function ContractPriceDetailView({ contractFileId, contractFileName, onBack }) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedPositions, setExpandedPositions] = useState(new Set())
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [pdfData, setPdfData] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [pdfCollapsed, setPdfCollapsed] = useState(false)
  const [pageSize, setPageSize] = useState(null)

  useEffect(() => {
    loadPositions()
    loadPdfData()
  }, [contractFileId])

  const loadPositions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getContractPositions(contractFileId)
      setPositions(data)

      // Select first price of first position if available
      if (data.length > 0 && data[0].prices && data[0].prices.length > 0) {
        const firstPrice = data[0].prices[0]
        setSelectedPrice(firstPrice)
        if (firstPrice.pageNumber) {
          setPageNumber(firstPrice.pageNumber)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePositionClick = (position) => {
    const isCurrentlySelected = selectedPosition?.id === position.id
    const isCurrentlyExpanded = expandedPositions.has(position.id)

    if (!isCurrentlySelected) {
      // First click: Select the position and highlight in PDF
      console.log('First click - selecting position:', position.positionNumber)
      setSelectedPosition(position)
      setSelectedPrice(null) // Clear any selected price

      if (position.pageNumber) {
        setPageNumber(position.pageNumber)
      }

      if (!position.boundingBox) {
        console.warn('⚠️ Position has no bounding box - cannot highlight in PDF')
      }
    } else if (!isCurrentlyExpanded) {
      // Second click: Expand to show prices
      console.log('Second click - expanding position:', position.positionNumber)
      const newExpanded = new Set(expandedPositions)
      newExpanded.add(position.id)
      setExpandedPositions(newExpanded)
    } else {
      // Third click: Collapse
      console.log('Third click - collapsing position:', position.positionNumber)
      const newExpanded = new Set(expandedPositions)
      newExpanded.delete(position.id)
      setExpandedPositions(newExpanded)
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

  const onPageLoadSuccess = (page) => {
    const { width, height } = page
    setPageSize({ width, height })
    console.log('PDF Page loaded:', { width, height, scale })
  }

  const handlePriceSelect = (price) => {
    console.log('Price selected:', {
      id: price.id,
      positionNumber: price.positionNumber,
      price: price.price,
      region: price.region,
      priceType: price.priceType,
      pageNumber: price.pageNumber,
      boundingBox: price.boundingBox,
      columnIndex: price.columnIndex,
      rowIndex: price.rowIndex
    })

    // Clear any selected position
    setSelectedPosition(null)
    setSelectedPrice(price)

    if (price.pageNumber) {
      setPageNumber(price.pageNumber)
    }

    if (!price.boundingBox) {
      console.warn('⚠️ Price has no bounding box - cannot highlight in PDF')
    }
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-'
    return `${price.toFixed(2)} €`
  }

  const formatTax = (tax) => {
    if (!tax) return '-'
    const taxLabels = {
      'REDUCED': '7%',
      'STANDARD': '19%'
    }
    return taxLabels[tax] || tax
  }

  const formatCostEstimate = (costEstimate) => {
    if (!costEstimate) return '-'
    const labels = {
      'YES': 'Ja',
      'NO': 'Nein',
      'UNKNOWN': '?'
    }
    return labels[costEstimate] || costEstimate
  }

  const formatSupplyType = (supplyType) => {
    if (!supplyType) return '-'
    const labels = {
      'INITIAL': 'Erstversorgung',
      'REPLACEMENT': 'Wechselversorgung',
      'BOTH': 'Beides'
    }
    return labels[supplyType] || supplyType
  }

  const formatHmvCategory = (hmvCategory) => {
    if (!hmvCategory) return '-'
    const labels = {
      'MASSCHUH': 'Maßschuh',
      'KONFEKTIONSSCHUH_SPEZIALSCHUH': 'Konfektionsschuh/Spezialschuh',
      'ZURICHTUNG': 'Zurichtung',
      'EINLAGENAENHLICHE_ARBEIT_AM_SCHUH': 'Einlagenähnliche Arbeit',
      'DAF': 'DAF',
      'SONSTIGE_OST': 'Sonstige OST',
      'FREMD_PG': 'Fremd-PG',
      'UNSICHER': 'Unsicher'
    }
    return labels[hmvCategory] || hmvCategory
  }

  const formatCopayment = (price) => {
    if (!price) return '-'

    // Check if there's a universal copayment (same for adults and children)
    if (price.copaymentUniversal !== null && price.copaymentUniversal !== undefined) {
      return `${price.copaymentUniversal.toFixed(2)} €`
    }

    // Check if there are separate copayments for adults and children
    const hasAdult = price.copaymentAdult !== null && price.copaymentAdult !== undefined
    const hasChild = price.copaymentChild !== null && price.copaymentChild !== undefined

    if (hasAdult && hasChild) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <span>Erw: {price.copaymentAdult.toFixed(2)} €</span>
          <span>Kind: {price.copaymentChild.toFixed(2)} €</span>
        </div>
      )
    }

    if (hasAdult) {
      return `Erw: ${price.copaymentAdult.toFixed(2)} €`
    }

    if (hasChild) {
      return `Kind: ${price.copaymentChild.toFixed(2)} €`
    }

    return '-'
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

  // Group positions by HMV category
  const groupPositionsByHmvCategory = () => {
    const groups = {}

    positions.forEach(positionData => {
      const category = positionData.position.hmvCategory || 'KEINE_KATEGORIE'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(positionData)
    })

    return groups
  }

  const positionGroups = groupPositionsByHmvCategory()

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
            📊 {positions.length} Position{positions.length !== 1 ? 'en' : ''}
          </span>
          <span className="stat-badge">
            💰 {positions.reduce((sum, pos) => sum + (pos.prices?.length || 0), 0)} Preise
          </span>
        </div>
      </div>

      <div className="detail-content">
        {/* Price Table Section */}
        <div className="prices-section">
          <div className="section-header">
            <h3>Extrahierte Positionen & Preise</h3>
          </div>

          {positions.length === 0 ? (
            <div className="empty-prices">
              <p>Keine Positionen gefunden</p>
            </div>
          ) : (
            <div className="prices-table-container">
              <table className="prices-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Position</th>
                    <th>Beschreibung</th>
                    <th>Einheit</th>
                    <th>MwSt</th>
                    <th>KV-Pflicht</th>
                    <th>HMV-Kategorie</th>
                    <th>HMV-Hauptgruppe</th>
                    <th>Preise</th>
                    <th>Quelle</th>
                    <th>Seite</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(positionGroups).map(([category, categoryPositions]) => (
                    <>
                      {/* Category Header Row */}
                      <tr key={`category-${category}`} className="category-header-row">
                        <td colSpan="11" className="category-header-cell">
                          <strong>{formatHmvCategory(category)}</strong>
                          <span style={{ marginLeft: '1rem', fontSize: '0.9rem', fontWeight: 'normal' }}>
                            ({categoryPositions.length} Position{categoryPositions.length !== 1 ? 'en' : ''})
                          </span>
                        </td>
                      </tr>

                      {/* Positions in this category */}
                      {categoryPositions.map((positionData) => {
                        const position = positionData.position
                        const prices = positionData.prices || []
                        const isExpanded = expandedPositions.has(position.id)

                        return (
                          <>
                            {/* Position Row */}
                            <tr
                              key={position.id}
                              className={`position-row ${selectedPosition?.id === position.id ? 'selected' : ''}`}
                              onClick={() => handlePositionClick(position)}
                            >
                              <td className="expand-cell">
                                <span className="expand-icon">
                                  {prices.length > 0 ? (isExpanded ? '▼' : '▶') : ''}
                                </span>
                              </td>
                              <td className="position-cell">{position.positionNumber}</td>
                              <td className="description-cell">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span>{position.description || '-'}</span>
                                  {position.supplyType && (
                                    <span className="supply-type-label">{formatSupplyType(position.supplyType)}</span>
                                  )}
                                </div>
                              </td>
                              <td>{position.unit || '-'}</td>
                              <td className="tax-cell">{formatTax(position.tax)}</td>
                              <td className="cost-estimate-cell">{formatCostEstimate(position.costEstimateRequired)}</td>
                              <td className="hmv-category-cell">{formatHmvCategory(position.hmvCategory)}</td>
                              <td className="hmv-main-group-cell">{position.hmvMainGroup || '-'}</td>
                              <td className="price-count-cell">
                                <span className="price-count-badge">{prices.length}</span>
                              </td>
                              <td>{getSourceBadge(position.source)}</td>
                              <td className="page-cell">{position.pageNumber || '-'}</td>
                            </tr>

                            {/* Expanded Price Rows */}
                            {isExpanded && prices.map((price) => (
                              <tr
                                key={price.id}
                                className={`price-row ${selectedPrice?.id === price.id ? 'selected' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePriceSelect(price)
                                }}
                              >
                                <td></td>
                                <td></td>
                                <td colSpan="3" className="price-detail-cell">
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    {price.priceType && <span className="price-type-label">{price.priceType}</span>}
                                    {price.region && <span className="region-label">{price.region}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem', flexWrap: 'nowrap' }}>
                                    <div style={{ whiteSpace: 'nowrap' }}>
                                      <strong>Preis:</strong> {formatPrice(price.price)}
                                    </div>
                                    <div style={{ whiteSpace: 'nowrap' }}>
                                      <strong>Zuzahlung:</strong> {formatCopayment(price)}
                                    </div>
                                    <div style={{ whiteSpace: 'nowrap' }}>
                                      <strong>Gültig:</strong> {price.validAt || '-'} - {price.validUntil || '-'}
                                    </div>
                                  </div>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>{getSourceBadge(price.source)}</td>
                                <td className="page-cell">{price.pageNumber || '-'}</td>
                              </tr>
                            ))}
                          </>
                        )
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PDF Viewer Section */}
        <div className={`pdf-section ${pdfCollapsed ? 'collapsed' : ''}`}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3>PDF Vorschau</h3>
              <button
                onClick={() => setPdfCollapsed(!pdfCollapsed)}
                className="pdf-toggle-button"
                title={pdfCollapsed ? 'PDF einblenden' : 'PDF ausblenden'}
              >
                {pdfCollapsed ? '◀' : '▶'}
              </button>
            </div>
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
              <div className="pdf-canvas-wrapper" style={{ position: 'relative' }}>
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
                    onLoadSuccess={onPageLoadSuccess}
                  />
                </Document>
                {/* Highlight overlay for selected position (whole row) */}
                {selectedPosition &&
                 selectedPosition.pageNumber === pageNumber &&
                 selectedPosition.boundingBox && (
                  <div
                    className="position-highlight-box"
                    style={{
                      position: 'absolute',
                      left: `${selectedPosition.boundingBox.left * 100}%`,
                      top: `${selectedPosition.boundingBox.top * 100}%`,
                      width: `${selectedPosition.boundingBox.width * 100}%`,
                      height: `${selectedPosition.boundingBox.height * 100}%`,
                      border: '3px solid #4CAF50',
                      backgroundColor: 'rgba(76, 175, 80, 0.2)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
                      animation: 'pulse-highlight 1.5s ease-in-out infinite'
                    }}
                  />
                )}

                {/* Highlight overlay for selected price (specific cell) */}
                {selectedPrice &&
                 selectedPrice.pageNumber === pageNumber &&
                 selectedPrice.boundingBox && (
                  <div
                    className="price-highlight-box"
                    style={{
                      position: 'absolute',
                      left: `${selectedPrice.boundingBox.left * 100}%`,
                      top: `${selectedPrice.boundingBox.top * 100}%`,
                      width: `${selectedPrice.boundingBox.width * 100}%`,
                      height: `${selectedPrice.boundingBox.height * 100}%`,
                      border: '3px solid #ff6b6b',
                      backgroundColor: 'rgba(255, 107, 107, 0.2)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)',
                      animation: 'pulse-highlight 1.5s ease-in-out infinite'
                    }}
                  />
                )}
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