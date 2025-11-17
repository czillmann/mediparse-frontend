import { useState, useEffect } from 'react'
import { getExtractionRules, updateExtractionRules } from '../services/api'
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
  const [activeTab, setActiveTab] = useState('columnMappings')
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
      // Initialize with empty structure if no rules exist
      setRules(data || {
        columnMappings: {},
        transformationRules: {},
        multiPriceConfig: { hasMultiplePrices: false, priceColumns: [] },
        contractMetadata: {},
        validationRules: { validityDateRules: {} },
        conditionalRules: []
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  const updateColumnMapping = (field, value) => {
    setRules({
      ...rules,
      columnMappings: {
        ...rules.columnMappings,
        [field]: value === '' ? null : parseInt(value)
      }
    })
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
    setRules({
      ...rules,
      validationRules: {
        ...rules.validationRules,
        [field]: value === '' ? null : (field === 'positionNumberPattern' ? value : parseInt(value))
      }
    })
  }

  const updateMultiPriceConfig = (field, value) => {
    setRules({
      ...rules,
      multiPriceConfig: {
        ...rules.multiPriceConfig,
        [field]: field === 'hasMultiplePrices' ? value : rules.multiPriceConfig[field]
      }
    })
  }

  const addPriceColumn = () => {
    setRules({
      ...rules,
      multiPriceConfig: {
        ...rules.multiPriceConfig,
        priceColumns: [
          ...(rules.multiPriceConfig.priceColumns || []),
          { columnIndex: null, priceType: '' }
        ]
      }
    })
  }

  const removePriceColumn = (index) => {
    setRules({
      ...rules,
      multiPriceConfig: {
        ...rules.multiPriceConfig,
        priceColumns: rules.multiPriceConfig.priceColumns.filter((_, i) => i !== index)
      }
    })
  }

  const updatePriceColumn = (index, field, value) => {
    const updatedColumns = [...rules.multiPriceConfig.priceColumns]
    updatedColumns[index] = {
      ...updatedColumns[index],
      [field]: field === 'columnIndex' ? (value === '' ? null : parseInt(value)) : value
    }
    setRules({
      ...rules,
      multiPriceConfig: {
        ...rules.multiPriceConfig,
        priceColumns: updatedColumns
      }
    })
  }

  const addConditionalRule = () => {
    setRules({
      ...rules,
      conditionalRules: [
        ...(rules.conditionalRules || []),
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
    setRules({
      ...rules,
      conditionalRules: rules.conditionalRules.filter((_, i) => i !== index)
    })
  }

  const updateConditionalRule = (index, field, value) => {
    const updatedRules = [...rules.conditionalRules]
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value
    }
    setRules({
      ...rules,
      conditionalRules: updatedRules
    })
  }

  const updateCondition = (ruleIndex, field, value) => {
    const updatedRules = [...rules.conditionalRules]
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      condition: {
        ...updatedRules[ruleIndex].condition,
        [field]: field === 'columnIndex' ? (value === '' ? null : parseInt(value)) : value
      }
    }
    setRules({
      ...rules,
      conditionalRules: updatedRules
    })
  }

  const updateAction = (ruleIndex, actionIndex, field, value) => {
    const updatedRules = [...rules.conditionalRules]
    const updatedActions = [...updatedRules[ruleIndex].actions]
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      [field]: value
    }
    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      actions: updatedActions
    }
    setRules({
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
          <h2>Extraction Rules - {contractFile.fileName}</h2>
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
            className={`tab-button ${activeTab === 'columnMappings' ? 'active' : ''}`}
            onClick={() => setActiveTab('columnMappings')}
          >
            Spaltenzuordnung
          </button>
          <button
            className={`tab-button ${activeTab === 'contractMetadata' ? 'active' : ''}`}
            onClick={() => setActiveTab('contractMetadata')}
          >
            Vertragsdaten
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
        </div>

        <div className="dialog-body">
          {activeTab === 'columnMappings' && (
            <div className="tab-content">
              <h3>Spaltenzuordnung</h3>
              <p className="tab-description">Definieren Sie, welche Spalte (Index) welche Information enthält.</p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Positionsnummer</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.positionNumberColumn ?? ''}
                    onChange={(e) => updateColumnMapping('positionNumberColumn', e.target.value)}
                    placeholder="z.B. 0"
                  />
                </div>

                <div className="form-group">
                  <label>Beschreibung</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.descriptionColumn ?? ''}
                    onChange={(e) => updateColumnMapping('descriptionColumn', e.target.value)}
                    placeholder="z.B. 1"
                  />
                </div>

                <div className="form-group">
                  <label>Einheit</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.unitColumn ?? ''}
                    onChange={(e) => updateColumnMapping('unitColumn', e.target.value)}
                    placeholder="z.B. 2"
                  />
                </div>

                <div className="form-group">
                  <label>Preis</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.priceColumn ?? ''}
                    onChange={(e) => updateColumnMapping('priceColumn', e.target.value)}
                    placeholder="z.B. 3"
                  />
                </div>

                <div className="form-group">
                  <label>Steuersatz</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.taxColumn ?? ''}
                    onChange={(e) => updateColumnMapping('taxColumn', e.target.value)}
                    placeholder="z.B. 4"
                  />
                </div>

                <div className="form-group">
                  <label>Kostenvoranschlag</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.costEstimateColumn ?? ''}
                    onChange={(e) => updateColumnMapping('costEstimateColumn', e.target.value)}
                    placeholder="z.B. 5"
                  />
                </div>

                <div className="form-group">
                  <label>Versorgungsart</label>
                  <input
                    type="number"
                    value={rules.columnMappings?.supplyTypeColumn ?? ''}
                    onChange={(e) => updateColumnMapping('supplyTypeColumn', e.target.value)}
                    placeholder="z.B. 6"
                  />
                </div>
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
              <p className="tab-description">Konfiguration für Tabellen mit mehreren Preisspalten.</p>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={rules.multiPriceConfig?.hasMultiplePrices ?? false}
                    onChange={(e) => updateMultiPriceConfig('hasMultiplePrices', e.target.checked)}
                  />
                  Tabelle hat mehrere Preisspalten
                </label>
              </div>

              {rules.multiPriceConfig?.hasMultiplePrices && (
                <div className="price-columns-list">
                  <h4>Preisspalten</h4>
                  {rules.multiPriceConfig.priceColumns?.map((priceCol, index) => (
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
              <p className="tab-description">Regeln zur Validierung der extrahierten Daten.</p>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Positionsnummer-Muster (Regex)</label>
                  <input
                    type="text"
                    value={rules.validationRules?.positionNumberPattern ?? ''}
                    onChange={(e) => updateValidationRule('positionNumberPattern', e.target.value)}
                    placeholder="z.B. 31\\.\\d+\\.\\d+"
                  />
                </div>

                <div className="form-group">
                  <label>Kopfzeilen-Index</label>
                  <input
                    type="number"
                    value={rules.validationRules?.headerRowIndex ?? ''}
                    onChange={(e) => updateValidationRule('headerRowIndex', e.target.value)}
                    placeholder="z.B. 0"
                  />
                </div>

                <div className="form-group">
                  <label>Erste Datenzeile</label>
                  <input
                    type="number"
                    value={rules.validationRules?.firstDataRowIndex ?? ''}
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
                Definieren Sie Regeln, die basierend auf Zellinhalten bestimmte Felder setzen.
                Beispiel: Wenn Spalte 4 "KV" enthält, dann setze Kostenvoranschlag auf "JA".
              </p>

              <div className="conditional-rules-list">
                {rules.conditionalRules?.map((rule, ruleIndex) => (
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
                          <label>Spaltenindex</label>
                          <input
                            type="number"
                            value={rule.condition?.columnIndex ?? ''}
                            onChange={(e) => updateCondition(ruleIndex, 'columnIndex', e.target.value)}
                            placeholder="z.B. 4"
                          />
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
