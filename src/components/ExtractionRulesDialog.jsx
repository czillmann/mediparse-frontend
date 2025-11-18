import { useState, useEffect } from 'react'
import { getExtractionRules, updateExtractionRules, detectTableTypes } from '../services/api'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './ExtractionRulesDialog.css'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

function ExtractionRulesDialog({ contractFile, onClose, onSave }) {
  const [rules, setRules] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('tableTypeConfig')
  const [selectedTableTypeIndex, setSelectedTableTypeIndex] = useState(0)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [scale, setScale] = useState(1.0)

  useEffect(() => {
    loadRules()
    loadPdf()
  }, [contractFile.id])

  const loadRules = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getExtractionRules(contractFile.id)

      // If no rules exist, automatically detect table types
      if (!data) {
        try {
          const detectionResult = await detectTableTypes(contractFile.id)

          if (detectionResult.tableTypes && detectionResult.tableTypes.length > 0) {
            setRules({
              contractMetadata: {},
              tableTypes: detectionResult.tableTypes
            })
          } else {
            // Fallback to default
            setRules({
              contractMetadata: {},
              tableTypes: [{
                tableTypeId: 'default',
                tableName: 'Haupttabelle',
                headerMatcher: {
                  requiredHeaders: [],
                  optionalHeaders: [],
                  matchingStrategy: 'ALL_REQUIRED',
                  minimumMatchCount: 0,
                  explanation: ''
                },
                transformationRules: {},
                multiPriceConfig: { hasMultiplePrices: false, priceColumns: [] },
                validationRules: { validityDateRules: {} },
                conditionalRules: []
              }]
            })
          }
        } catch (detectionError) {
          console.error('Fehler bei automatischer Tabellentyp-Erkennung:', detectionError)
          // Fallback to default
          setRules({
            contractMetadata: {},
            tableTypes: [{
              tableTypeId: 'default',
              tableName: 'Haupttabelle',
              headerMatcher: {
                requiredHeaders: [],
                optionalHeaders: [],
                matchingStrategy: 'ALL_REQUIRED',
                minimumMatchCount: 0,
                explanation: ''
              },
              transformationRules: {},
              multiPriceConfig: { hasMultiplePrices: false, priceColumns: [] },
              validationRules: { validityDateRules: {} },
              conditionalRules: []
            }]
          })
        }
      } else {
        // Migrate old structure to new structure if needed
        if (!data.tableTypes) {
          // Old structure detected - migrate to new structure
          setRules({
            contractMetadata: data.contractMetadata || {},
            tableTypes: [{
              tableTypeId: 'default',
              tableName: 'Haupttabelle',
              headerMatcher: {
                requiredHeaders: [],
                optionalHeaders: [],
                matchingStrategy: 'ALL_REQUIRED',
                minimumMatchCount: 0,
                explanation: ''
              },
              transformationRules: data.transformationRules || {},
              multiPriceConfig: data.multiPriceConfig || { hasMultiplePrices: false, priceColumns: [] },
              validationRules: data.validationRules || { validityDateRules: {} },
              conditionalRules: data.conditionalRules || []
            }]
          })
        } else {
          // New structure already present
          setRules(data)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Table Type Management Functions
  const addTableType = () => {
    const newTableType = {
      tableTypeId: `table_type_${Date.now()}`,
      tableName: 'Neue Tabelle',
      headerMatcher: {
        requiredHeaders: [],
        optionalHeaders: [],
        matchingStrategy: 'ALL_REQUIRED',
        minimumMatchCount: 0,
        explanation: ''
      },
      transformationRules: {},
      multiPriceConfig: { hasMultiplePrices: false, priceColumns: [] },
      validationRules: { validityDateRules: {} },
      conditionalRules: []
    }

    setRules(prev => ({
      ...prev,
      tableTypes: [...(prev.tableTypes || []), newTableType]
    }))
    setSelectedTableTypeIndex(rules.tableTypes?.length || 0)
  }

  const deleteTableType = (index) => {
    if (rules.tableTypes?.length <= 1) {
      alert('Mindestens ein Tabellentyp muss vorhanden sein.')
      return
    }

    setRules(prev => ({
      ...prev,
      tableTypes: prev.tableTypes.filter((_, i) => i !== index)
    }))

    // Adjust selected index if needed
    if (selectedTableTypeIndex >= index && selectedTableTypeIndex > 0) {
      setSelectedTableTypeIndex(selectedTableTypeIndex - 1)
    }
  }

  const updateTableType = (index, updates) => {
    setRules(prev => ({
      ...prev,
      tableTypes: prev.tableTypes.map((tt, i) =>
        i === index ? { ...tt, ...updates } : tt
      )
    }))
  }

  const updateSelectedTableType = (updates) => {
    updateTableType(selectedTableTypeIndex, updates)
  }

  const loadPdf = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
      const token = localStorage.getItem('mediparse_auth')
      const authData = token ? JSON.parse(token) : null
      const idToken = authData?.idToken || authData?.accessToken

      if (!idToken) {
        console.warn('No auth token found for PDF download')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/contract-files/${contractFile.id}/download`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      }
    } catch (err) {
      console.error('Failed to load PDF:', err)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }

  const zoomIn = () => {
    setScale(prev => Math.min(2.0, prev + 0.1))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.1))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const updatedFile = await updateExtractionRules(contractFile.id, rules)
      onSave && onSave(updatedFile)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateContractMetadata = (field, value) => {
    setRules({
      ...rules,
      contractMetadata: {
        ...rules.contractMetadata,
        [field]: value
      }
    })
  }

  const updateValidationRule = (field, value) => {
    updateSelectedTableType({
      validationRules: {
        ...rules.tableTypes[selectedTableTypeIndex].validationRules,
        [field]: value === '' ? null : (field === 'positionNumberPattern' ? value : parseInt(value))
      }
    })
  }

  const updateMultiPriceConfig = (field, value) => {
    updateSelectedTableType({
      multiPriceConfig: {
        ...rules.tableTypes[selectedTableTypeIndex].multiPriceConfig,
        [field]: field === 'hasMultiplePrices' ? value : rules.tableTypes[selectedTableTypeIndex].multiPriceConfig[field]
      }
    })
  }

  const addPriceColumn = () => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    updateSelectedTableType({
      multiPriceConfig: {
        ...currentTableType.multiPriceConfig,
        priceColumns: [
          ...(currentTableType.multiPriceConfig.priceColumns || []),
          { columnIndex: null, priceType: '' }
        ]
      }
    })
  }

  const removePriceColumn = (index) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    updateSelectedTableType({
      multiPriceConfig: {
        ...currentTableType.multiPriceConfig,
        priceColumns: currentTableType.multiPriceConfig.priceColumns.filter((_, i) => i !== index)
      }
    })
  }

  const updatePriceColumn = (index, field, value) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    const updatedColumns = [...currentTableType.multiPriceConfig.priceColumns]
    updatedColumns[index] = {
      ...updatedColumns[index],
      [field]: field === 'columnIndex' ? (value === '' ? null : parseInt(value)) : value
    }
    updateSelectedTableType({
      multiPriceConfig: {
        ...currentTableType.multiPriceConfig,
        priceColumns: updatedColumns
      }
    })
  }

  const addConditionalRule = () => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    updateSelectedTableType({
      conditionalRules: [
        ...(currentTableType.conditionalRules || []),
        {
          name: '',
          enabled: true,
          condition: {
            type: 'COLUMN_CONTAINS',
            columnIndex: null,
            value: '',
            caseSensitive: false
          },
          actions: [{
            type: 'SET_FIELD',
            fieldName: '',
            value: '',
            scope: 'POSITION',
            targetPriceColumn: null
          }]
        }
      ]
    })
  }

  const removeConditionalRule = (index) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    updateSelectedTableType({
      conditionalRules: currentTableType.conditionalRules.filter((_, i) => i !== index)
    })
  }

  const updateConditionalRule = (index, field, value) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    const updatedRules = [...currentTableType.conditionalRules]
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value
    }
    updateSelectedTableType({
      conditionalRules: updatedRules
    })
  }

  const updateCondition = (ruleIndex, field, value) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    const updatedRules = [...currentTableType.conditionalRules]
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      condition: {
        ...updatedRules[ruleIndex].condition,
        [field]: field === 'columnIndex' ? (value === '' ? null : parseInt(value)) : value
      }
    }
    updateSelectedTableType({
      conditionalRules: updatedRules
    })
  }

  const updateAction = (ruleIndex, actionIndex, field, value) => {
    const currentTableType = rules.tableTypes[selectedTableTypeIndex]
    const updatedRules = [...currentTableType.conditionalRules]
    const updatedActions = [...updatedRules[ruleIndex].actions]
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      [field]: value
    }
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      actions: updatedActions
    }
    updateSelectedTableType({
      ...rules,
      conditionalRules: updatedRules
    })
  }

  const addAction = (ruleIndex) => {
    const updatedRules = [...rules.conditionalRules]
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      actions: [
        ...updatedRules[ruleIndex].actions,
        { type: 'SET_FIELD', fieldName: '', value: '', scope: 'POSITION', targetPriceColumn: null }
      ]
    }
    setRules({
      ...rules,
      conditionalRules: updatedRules
    })
  }

  const removeAction = (ruleIndex, actionIndex) => {
    const updatedRules = [...rules.conditionalRules]
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      actions: updatedRules[ruleIndex].actions.filter((_, i) => i !== actionIndex)
    }
    setRules({
      ...rules,
      conditionalRules: updatedRules
    })
  }

  // Column management functions
  const addColumn = () => {
    const currentColumns = rules?.tableTypes?.[selectedTableTypeIndex]?.columns || []
    const newColumn = {
      index: currentColumns.length,
      name: '',
      dataType: 'TEXT',
      description: '',
      required: false,
      mappedTo: ''
    }
    updateSelectedTableType({
      columns: [...currentColumns, newColumn]
    })
  }

  const updateColumn = (columnIndex, field, value) => {
    const currentColumns = [...(rules?.tableTypes?.[selectedTableTypeIndex]?.columns || [])]
    currentColumns[columnIndex] = {
      ...currentColumns[columnIndex],
      [field]: value
    }
    // Update indices to match array positions
    currentColumns.forEach((col, idx) => {
      col.index = idx
    })
    updateSelectedTableType({
      columns: currentColumns
    })
  }

  const removeColumn = (columnIndex) => {
    const currentColumns = rules?.tableTypes?.[selectedTableTypeIndex]?.columns || []
    const updatedColumns = currentColumns.filter((_, i) => i !== columnIndex)
    // Update indices to match new array positions
    updatedColumns.forEach((col, idx) => {
      col.index = idx
    })
    updateSelectedTableType({
      columns: updatedColumns
    })
  }

  const moveColumnUp = (columnIndex) => {
    if (columnIndex === 0) return
    const currentColumns = [...(rules?.tableTypes?.[selectedTableTypeIndex]?.columns || [])]
    const temp = currentColumns[columnIndex]
    currentColumns[columnIndex] = currentColumns[columnIndex - 1]
    currentColumns[columnIndex - 1] = temp
    // Update indices
    currentColumns.forEach((col, idx) => {
      col.index = idx
    })
    updateSelectedTableType({
      columns: currentColumns
    })
  }

  const moveColumnDown = (columnIndex) => {
    const currentColumns = [...(rules?.tableTypes?.[selectedTableTypeIndex]?.columns || [])]
    if (columnIndex >= currentColumns.length - 1) return
    const temp = currentColumns[columnIndex]
    currentColumns[columnIndex] = currentColumns[columnIndex + 1]
    currentColumns[columnIndex + 1] = temp
    // Update indices
    currentColumns.forEach((col, idx) => {
      col.index = idx
    })
    updateSelectedTableType({
      columns: currentColumns
    })
  }

  if (loading) {
    return (
      <div className="dialog-overlay">
        <div className="dialog-content extraction-rules-dialog">
          <div className="dialog-header">
            <h2>Extraction Rules bearbeiten</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="dialog-body">
            <div className="loading-message">Lade Extraction Rules...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog-content extraction-rules-dialog">
        <div className="dialog-header">
          <div className="header-title-section">
            <h2>Extraction Rules - {contractFile.fileName}</h2>
            <div className="table-type-selector">
              <label>Tabellentyp:</label>
              <select
                value={selectedTableTypeIndex}
                onChange={(e) => setSelectedTableTypeIndex(parseInt(e.target.value))}
                className="table-type-select"
              >
                {rules?.tableTypes?.map((tableType, index) => (
                  <option key={tableType.tableTypeId} value={index}>
                    {tableType.tableName}
                  </option>
                ))}
              </select>
              <button onClick={addTableType} className="add-table-type-button" title="Neuen Tabellentyp hinzufügen">
                +
              </button>
              <button
                onClick={() => deleteTableType(selectedTableTypeIndex)}
                className="delete-table-type-button"
                disabled={rules?.tableTypes?.length <= 1}
                title="Tabellentyp löschen"
              >
                ✕
              </button>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="dialog-tabs">
          <button
            className={`tab-button ${activeTab === 'tableTypeConfig' ? 'active' : ''}`}
            onClick={() => setActiveTab('tableTypeConfig')}
          >
            Typ-Konfiguration
          </button>
          <button
            className={`tab-button ${activeTab === 'multiPrice' ? 'active' : ''}`}
            onClick={() => setActiveTab('multiPrice')}
          >
            Mehrfachpreise
          </button>
          <button
            className={`tab-button ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Validierung
          </button>
          <button
            className={`tab-button ${activeTab === 'conditionalRules' ? 'active' : ''}`}
            onClick={() => setActiveTab('conditionalRules')}
          >
            Bedingte Regeln
          </button>
          <button
            className={`tab-button ${activeTab === 'contractMetadata' ? 'active' : ''}`}
            onClick={() => setActiveTab('contractMetadata')}
          >
            Vertragsdaten (Global)
          </button>
        </div>

        <div className="dialog-body">
          {activeTab === 'tableTypeConfig' && (
            <div className="tab-content">
              <h3>Typ-Konfiguration: {rules?.tableTypes?.[selectedTableTypeIndex]?.tableName}</h3>
              <p className="tab-description">
                Konfigurieren Sie die Header-Erkennung für diesen Tabellentyp. Die Tabelle wird anhand ihrer Header-Zeile automatisch erkannt.
              </p>

              <div className="form-group">
                <label>Tabellenname</label>
                <input
                  type="text"
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.tableName || ''}
                  onChange={(e) => updateSelectedTableType({ tableName: e.target.value })}
                  placeholder="z.B. Haupttabelle, Zusatzleistungen, etc."
                />
              </div>

              <div className="form-group">
                <label>Spalten-Definitionen</label>
                <small className="mb-2">Definieren Sie alle Spalten dieser Tabelle mit ihren Eigenschaften</small>

                {rules?.tableTypes?.[selectedTableTypeIndex]?.columns?.map((column, colIndex) => (
                  <div key={colIndex} className="column-definition-item">
                    <div className="column-definition-header">
                      <span className="column-index">#{colIndex}</span>
                      <div className="column-actions">
                        <button
                          type="button"
                          className="move-button"
                          onClick={() => moveColumnUp(colIndex)}
                          disabled={colIndex === 0}
                          title="Nach oben"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="move-button"
                          onClick={() => moveColumnDown(colIndex)}
                          disabled={colIndex === (rules?.tableTypes?.[selectedTableTypeIndex]?.columns?.length || 0) - 1}
                          title="Nach unten"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="remove-button small"
                          onClick={() => removeColumn(colIndex)}
                          title="Spalte entfernen"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="column-definition-fields">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Spaltenname *</label>
                          <input
                            type="text"
                            value={column.name || ''}
                            onChange={(e) => updateColumn(colIndex, 'name', e.target.value)}
                            placeholder="z.B. Position, Bezeichnung, Preis"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Datentyp</label>
                          <select
                            value={column.dataType || 'TEXT'}
                            onChange={(e) => updateColumn(colIndex, 'dataType', e.target.value)}
                          >
                            <option value="TEXT">Text</option>
                            <option value="NUMBER">Zahl</option>
                            <option value="CURRENCY">Währung</option>
                            <option value="DATE">Datum</option>
                            <option value="PERCENTAGE">Prozent</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Zuordnung zu Feld</label>
                          <select
                            value={column.mappedTo || ''}
                            onChange={(e) => updateColumn(colIndex, 'mappedTo', e.target.value)}
                          >
                            <option value="">-- Keine Zuordnung --</option>
                            <option value="positionNumber">Positionsnummer</option>
                            <option value="description">Beschreibung</option>
                            <option value="unit">Einheit</option>
                            <option value="price">Preis</option>
                            <option value="tax">MwSt</option>
                            <option value="costEstimate">Kostenvoranschlag</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={column.required || false}
                              onChange={(e) => updateColumn(colIndex, 'required', e.target.checked)}
                            />
                            Erforderlich
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Beschreibung</label>
                        <input
                          type="text"
                          value={column.description || ''}
                          onChange={(e) => updateColumn(colIndex, 'description', e.target.value)}
                          placeholder="Was enthält diese Spalte?"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className="add-button" onClick={addColumn}>
                  + Spalte hinzufügen
                </button>
              </div>

              <div className="form-group">
                <label>Typ-ID</label>
                <input
                  type="text"
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.tableTypeId || ''}
                  disabled
                  className="readonly-input"
                />
                <small>Die Typ-ID wird automatisch generiert</small>
              </div>

              <div className="form-group">
                <label>Matching-Strategie</label>
                <select
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.matchingStrategy || 'ALL_REQUIRED'}
                  onChange={(e) => updateSelectedTableType({
                    headerMatcher: {
                      ...rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher,
                      matchingStrategy: e.target.value
                    }
                  })}
                >
                  <option value="ALL_REQUIRED">Alle erforderlichen Header müssen vorhanden sein</option>
                  <option value="ANY_REQUIRED">Mindestens ein erforderlicher Header muss vorhanden sein</option>
                  <option value="MINIMUM_COUNT">Mindestanzahl an Headern muss vorhanden sein</option>
                </select>
                <small>Legt fest, wie streng die Header-Übereinstimmung sein muss</small>
              </div>

              {rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.matchingStrategy === 'MINIMUM_COUNT' && (
                <div className="form-group">
                  <label>Mindestanzahl</label>
                  <input
                    type="number"
                    value={rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.minimumMatchCount || 0}
                    onChange={(e) => updateSelectedTableType({
                      headerMatcher: {
                        ...rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher,
                        minimumMatchCount: parseInt(e.target.value)
                      }
                    })}
                    min="0"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Erforderliche Header (einer pro Zeile)</label>
                <textarea
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.requiredHeaders?.join('\n') || ''}
                  onChange={(e) => updateSelectedTableType({
                    headerMatcher: {
                      ...rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher,
                      requiredHeaders: e.target.value.split('\n').filter(h => h.trim())
                    }
                  })}
                  rows={5}
                  placeholder="z.B.&#10;Positionsnummer&#10;Artikelbezeichnung&#10;Preis"
                />
                <small>Diese Header müssen in der Tabelle vorhanden sein, um sie als diesen Typ zu erkennen</small>
              </div>

              <div className="form-group">
                <label>Optionale Header (einer pro Zeile)</label>
                <textarea
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.optionalHeaders?.join('\n') || ''}
                  onChange={(e) => updateSelectedTableType({
                    headerMatcher: {
                      ...rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher,
                      optionalHeaders: e.target.value.split('\n').filter(h => h.trim())
                    }
                  })}
                  rows={3}
                  placeholder="z.B.&#10;Hinweis&#10;Bemerkung"
                />
                <small>Diese Header erhöhen die Übereinstimmung, sind aber nicht zwingend erforderlich</small>
              </div>

              <div className="form-group">
                <label>Erklärung / Beschreibung</label>
                <textarea
                  value={rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher?.explanation || ''}
                  onChange={(e) => updateSelectedTableType({
                    headerMatcher: {
                      ...rules?.tableTypes?.[selectedTableTypeIndex]?.headerMatcher,
                      explanation: e.target.value
                    }
                  })}
                  rows={2}
                  placeholder="Beschreibung, wann dieser Tabellentyp verwendet werden soll..."
                />
                <small>Optional: Zusätzliche Informationen zu diesem Tabellentyp</small>
              </div>
            </div>
          )}

          {activeTab === 'contractMetadata' && (
            <div className="tab-content">
              <h3>Vertragsdaten</h3>
              <p className="tab-description">Allgemeine Metadaten des Vertrags.</p>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Krankenkasse</label>
                  <input
                    type="text"
                    value={rules.contractMetadata?.healthInsuranceName ?? ''}
                    onChange={(e) => updateContractMetadata('healthInsuranceName', e.target.value)}
                    placeholder="z.B. AOK Bayern"
                  />
                </div>

                <div className="form-group">
                  <label>Gültig von</label>
                  <input
                    type="date"
                    value={rules.contractMetadata?.validFrom ?? ''}
                    onChange={(e) => updateContractMetadata('validFrom', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Gültig bis</label>
                  <input
                    type="date"
                    value={rules.contractMetadata?.validUntil ?? ''}
                    onChange={(e) => updateContractMetadata('validUntil', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Standard-Steuersatz</label>
                  <select
                    value={rules.contractMetadata?.defaultTax ?? ''}
                    onChange={(e) => updateContractMetadata('defaultTax', e.target.value)}
                  >
                    <option value="">Nicht festgelegt</option>
                    <option value="REDUCED">Ermäßigt (7%)</option>
                    <option value="STANDARD">Standard (19%)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Standard-Kostenvoranschlag</label>
                  <select
                    value={rules.contractMetadata?.defaultCostEstimate ?? ''}
                    onChange={(e) => updateContractMetadata('defaultCostEstimate', e.target.value)}
                  >
                    <option value="">Nicht festgelegt</option>
                    <option value="YES">Ja</option>
                    <option value="NO">Nein</option>
                    <option value="UNKNOWN">Unbekannt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'multiPrice' && (
            <div className="tab-content">
              <h3>Mehrfachpreise</h3>
              <p className="tab-description">
                Konfiguration für Tabellen mit mehreren Preisspalten für <strong>{rules?.tableTypes?.[selectedTableTypeIndex]?.tableName}</strong>.
              </p>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={rules?.tableTypes?.[selectedTableTypeIndex]?.multiPriceConfig?.hasMultiplePrices ?? false}
                    onChange={(e) => updateMultiPriceConfig('hasMultiplePrices', e.target.checked)}
                  />
                  Tabelle hat mehrere Preisspalten
                </label>
              </div>

              {rules?.tableTypes?.[selectedTableTypeIndex]?.multiPriceConfig?.hasMultiplePrices && (
                <div className="price-columns-list">
                  <h4>Preisspalten</h4>
                  {rules?.tableTypes?.[selectedTableTypeIndex]?.multiPriceConfig?.priceColumns?.map((priceCol, index) => (
                    <div key={index} className="price-column-item">
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Spaltenindex</label>
                          <input
                            type="number"
                            value={priceCol.columnIndex ?? ''}
                            onChange={(e) => updatePriceColumn(index, 'columnIndex', e.target.value)}
                            placeholder="z.B. 3"
                          />
                        </div>
                        <div className="form-group">
                          <label>Preistyp</label>
                          <input
                            type="text"
                            value={priceCol.priceType ?? ''}
                            onChange={(e) => updatePriceColumn(index, 'priceType', e.target.value)}
                            placeholder="z.B. Festpreis, Höchstpreis"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removePriceColumn(index)}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-button"
                    onClick={addPriceColumn}
                  >
                    + Preisspalte hinzufügen
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="tab-content">
              <h3>Validierungsregeln</h3>
              <p className="tab-description">
                Regeln zur Validierung der extrahierten Daten für <strong>{rules?.tableTypes?.[selectedTableTypeIndex]?.tableName}</strong>.
              </p>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Positionsnummer-Muster (Regex)</label>
                  <input
                    type="text"
                    value={rules?.tableTypes?.[selectedTableTypeIndex]?.validationRules?.positionNumberPattern ?? ''}
                    onChange={(e) => updateValidationRule('positionNumberPattern', e.target.value)}
                    placeholder="z.B. 31\\.\\d+\\.\\d+"
                  />
                </div>

                <div className="form-group">
                  <label>Kopfzeilen-Index</label>
                  <input
                    type="number"
                    value={rules?.tableTypes?.[selectedTableTypeIndex]?.validationRules?.headerRowIndex ?? ''}
                    onChange={(e) => updateValidationRule('headerRowIndex', e.target.value)}
                    placeholder="z.B. 0"
                  />
                </div>

                <div className="form-group">
                  <label>Erste Datenzeile</label>
                  <input
                    type="number"
                    value={rules?.tableTypes?.[selectedTableTypeIndex]?.validationRules?.firstDataRowIndex ?? ''}
                    onChange={(e) => updateValidationRule('firstDataRowIndex', e.target.value)}
                    placeholder="z.B. 1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conditionalRules' && (
            <div className="tab-content">
              <h3>Bedingte Regeln (Wenn/Dann)</h3>
              <p className="tab-description">
                Definieren Sie Regeln, die basierend auf Zellinhalten bestimmte Felder setzen für <strong>{rules?.tableTypes?.[selectedTableTypeIndex]?.tableName}</strong>.
                Beispiel: Wenn Spalte 4 "KV" enthält, dann setze Kostenvoranschlag auf "JA".
              </p>

              <div className="conditional-rules-list">
                {rules?.tableTypes?.[selectedTableTypeIndex]?.conditionalRules?.map((rule, ruleIndex) => (
                  <div key={ruleIndex} className="conditional-rule-item">
                    <div className="rule-header">
                      <div className="form-group full-width">
                        <label>Regelname</label>
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => updateConditionalRule(ruleIndex, 'name', e.target.value)}
                          placeholder="z.B. KV bedeutet Kostenvoranschlag"
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => updateConditionalRule(ruleIndex, 'enabled', e.target.checked)}
                          />
                          Aktiv
                        </label>
                      </div>
                    </div>

                    <div className="rule-condition">
                      <h4>Wenn (Bedingung)</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Bedingungstyp</label>
                          <select
                            value={rule.condition?.type || 'COLUMN_CONTAINS'}
                            onChange={(e) => updateCondition(ruleIndex, 'type', e.target.value)}
                          >
                            <option value="COLUMN_CONTAINS">Spalte enthält</option>
                            <option value="COLUMN_EQUALS">Spalte ist gleich</option>
                            <option value="COLUMN_MATCHES_REGEX">Spalte matched Regex</option>
                            <option value="COLUMN_NOT_EMPTY">Spalte ist nicht leer</option>
                            <option value="COLUMN_EMPTY">Spalte ist leer</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Spalte</label>
                          {rules?.tableTypes?.[selectedTableTypeIndex]?.columns?.length > 0 ? (
                            <select
                              value={rule.condition?.columnName || ''}
                              onChange={(e) => {
                                // Clear columnIndex when columnName is set
                                updateCondition(ruleIndex, 'columnName', e.target.value)
                                updateCondition(ruleIndex, 'columnIndex', null)
                              }}
                            >
                              <option value="">-- Spalte wählen --</option>
                              {rules.tableTypes[selectedTableTypeIndex].columns.map((column, idx) => (
                                <option key={idx} value={column.name}>
                                  {column.name} ({column.dataType})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={rule.condition?.columnIndex ?? ''}
                              onChange={(e) => updateCondition(ruleIndex, 'columnIndex', e.target.value)}
                              placeholder="z.B. 4"
                            />
                          )}
                          <small className="field-hint">
                            {rules?.tableTypes?.[selectedTableTypeIndex]?.columns?.length > 0
                              ? 'Wählen Sie eine Spalte nach Name'
                              : 'Geben Sie den Spaltenindex ein (0-basiert)'}
                          </small>
                        </div>

                        {(rule.condition?.type === 'COLUMN_CONTAINS' ||
                          rule.condition?.type === 'COLUMN_EQUALS' ||
                          rule.condition?.type === 'COLUMN_MATCHES_REGEX') && (
                          <div className="form-group">
                            <label>Wert</label>
                            <input
                              type="text"
                              value={rule.condition?.value || ''}
                              onChange={(e) => updateCondition(ruleIndex, 'value', e.target.value)}
                              placeholder="z.B. KV"
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={rule.condition?.caseSensitive || false}
                              onChange={(e) => updateCondition(ruleIndex, 'caseSensitive', e.target.checked)}
                            />
                            Groß-/Kleinschreibung beachten
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="rule-actions">
                      <h4>Dann (Aktionen)</h4>
                      {rule.actions?.map((action, actionIndex) => (
                        <div key={actionIndex} className="action-item">
                          <div className="form-grid">
                            <div className="form-group">
                              <label>Gültigkeitsbereich</label>
                              <select
                                value={action.scope || 'POSITION'}
                                onChange={(e) => updateAction(ruleIndex, actionIndex, 'scope', e.target.value)}
                              >
                                <option value="POSITION">Position</option>
                                <option value="PRICE">Preis</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Feld</label>
                              <select
                                value={action.fieldName || ''}
                                onChange={(e) => updateAction(ruleIndex, actionIndex, 'fieldName', e.target.value)}
                              >
                                <option value="">Bitte wählen</option>
                                {action.scope === 'POSITION' ? (
                                  <optgroup label="Position-Felder">
                                    <option value="positionNumber">Positionsnummer</option>
                                    <option value="description">Beschreibung</option>
                                    <option value="unit">Einheit</option>
                                    <option value="tax">Steuersatz</option>
                                    <option value="costEstimateRequired">Kostenvoranschlag</option>
                                    <option value="supplyType">Versorgungsart</option>
                                    <option value="hmvCategory">HMV Kategorie</option>
                                    <option value="hmvMainGroup">HMV Hauptgruppe</option>
                                  </optgroup>
                                ) : (
                                  <optgroup label="Preis-Felder">
                                    <option value="price">Preis</option>
                                    <option value="priceType">Preistyp</option>
                                    <option value="validAt">Gültig ab</option>
                                    <option value="validUntil">Gültig bis</option>
                                    <option value="copaymentAdult">Zuzahlung Erwachsene</option>
                                    <option value="copaymentChild">Zuzahlung Kinder</option>
                                    <option value="copaymentUniversal">Zuzahlung Universal</option>
                                  </optgroup>
                                )}
                              </select>
                            </div>

                            {action.scope === 'PRICE' && rules.multiPriceConfig?.hasMultiplePrices && (
                              <div className="form-group">
                                <label>Ziel-Preisspalte</label>
                                <select
                                  value={action.targetPriceColumn ?? ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'targetPriceColumn', e.target.value === '' ? null : parseInt(e.target.value))}
                                >
                                  <option value="">Alle Preise</option>
                                  {rules.multiPriceConfig.priceColumns?.map((priceCol, idx) => (
                                    <option key={idx} value={priceCol.columnIndex}>
                                      Spalte {priceCol.columnIndex} {priceCol.priceType ? `(${priceCol.priceType})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="form-group">
                              <label>Wert setzen auf</label>
                              {action.fieldName === 'tax' ? (
                                <select
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                >
                                  <option value="">Bitte wählen</option>
                                  <option value="REDUCED">Ermäßigt (7%)</option>
                                  <option value="STANDARD">Standard (19%)</option>
                                </select>
                              ) : action.fieldName === 'costEstimateRequired' ? (
                                <select
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                >
                                  <option value="">Bitte wählen</option>
                                  <option value="YES">Ja</option>
                                  <option value="NO">Nein</option>
                                  <option value="UNKNOWN">Unbekannt</option>
                                </select>
                              ) : action.fieldName === 'supplyType' ? (
                                <select
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                >
                                  <option value="">Bitte wählen</option>
                                  <option value="INITIAL">Erstversorgung</option>
                                  <option value="REPLACEMENT">Wechselversorgung</option>
                                  <option value="BOTH">Beides</option>
                                </select>
                              ) : action.fieldName === 'price' ||
                                 action.fieldName === 'copaymentAdult' ||
                                 action.fieldName === 'copaymentChild' ||
                                 action.fieldName === 'copaymentUniversal' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                  placeholder="z.B. 125.50"
                                />
                              ) : action.fieldName === 'validAt' || action.fieldName === 'validUntil' ? (
                                <input
                                  type="date"
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={action.value || ''}
                                  onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                                  placeholder="Wert eingeben"
                                />
                              )}
                            </div>
                          </div>
                          {rule.actions.length > 1 && (
                            <button
                              type="button"
                              className="remove-button small"
                              onClick={() => removeAction(ruleIndex, actionIndex)}
                            >
                              Aktion entfernen
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-button small"
                        onClick={() => addAction(ruleIndex)}
                      >
                        + Weitere Aktion
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeConditionalRule(ruleIndex)}
                    >
                      Regel entfernen
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="add-button"
                  onClick={addConditionalRule}
                >
                  + Neue Regel hinzufügen
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-button" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button className="save-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExtractionRulesDialog
