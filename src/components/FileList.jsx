import { useState, useEffect } from 'react'
import { getContractFiles, deleteContractFile, downloadContractFile, updateContractFileOcrStatus, updateContractFileStatus } from '../services/api'
import ContractFileForm from './ContractFileForm'
import './FileList.css'

function FileList({ refreshTrigger }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [updatingOcrId, setUpdatingOcrId] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [editingFile, setEditingFile] = useState(null)

  const loadFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getContractFiles()
      setFiles(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [refreshTrigger])

  const handleDelete = async (id, fileName) => {
    if (!confirm(`Möchten Sie "${fileName}" wirklich löschen?`)) {
      return
    }

    setDeletingId(id)

    try {
      await deleteContractFile(id)
      setFiles(files.filter(file => file.id !== id))
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (id, fileName) => {
    setDownloadingId(id)

    try {
      await downloadContractFile(id, fileName)
    } catch (err) {
      alert(`Fehler beim Herunterladen: ${err.message}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleResetOcrStatus = async (id, fileName) => {
    if (!confirm(`OCR-Status für "${fileName}" auf "OCR erforderlich" zurücksetzen?`)) {
      return
    }

    setUpdatingOcrId(id)

    try {
      const updatedFile = await updateContractFileOcrStatus(id, 'OCR_REQUIRED')
      // Update file in list
      setFiles(files.map(file =>
        file.id === id ? { ...file, ocrStatus: updatedFile.ocrStatus } : file
      ))
    } catch (err) {
      alert(`Fehler beim Zurücksetzen des OCR-Status: ${err.message}`)
    } finally {
      setUpdatingOcrId(null)
    }
  }

  const handleResetStatus = async (id, fileName) => {
    if (!confirm(`Status für "${fileName}" auf "Hochgeladen" zurücksetzen?`)) {
      return
    }

    setUpdatingStatusId(id)

    try {
      const updatedFile = await updateContractFileStatus(id, 'UPLOADED')
      // Update file in list
      setFiles(files.map(file =>
        file.id === id ? { ...file, status: updatedFile.status } : file
      ))
    } catch (err) {
      alert(`Fehler beim Zurücksetzen des Status: ${err.message}`)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const handleSave = (updatedFile) => {
    // Update the file in the list
    setFiles(files.map(file =>
      file.id === updatedFile.id ? updatedFile : file
    ))
    setEditingFile(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (file) => {
    const status = file.status
    const badges = {
      UPLOADED: { label: 'Hochgeladen', className: 'status-uploaded' },
      PROCESSING: { label: 'In Bearbeitung', className: 'status-processing' },
      PROCESSED: { label: 'Verarbeitet', className: 'status-processed' },
      FAILED: { label: 'Fehlgeschlagen', className: 'status-failed' }
    }

    const badge = badges[status] || { label: status, className: 'status-unknown' }

    return (
      <div className="status-cell">
        <span className={`status-badge ${badge.className}`}>
          {badge.label}
        </span>
        {status === 'FAILED' && (
          <button
            className="reset-status-button"
            onClick={() => handleResetStatus(file.id, file.fileName)}
            disabled={updatingStatusId === file.id}
            title="Status zurücksetzen"
          >
            {updatingStatusId === file.id ? '⏳' : '🔄'}
          </button>
        )}
      </div>
    )
  }

  const getOcrStatusBadge = (file) => {
    const ocrStatus = file.ocrStatus
    const badges = {
      OCR_REQUIRED: { label: 'OCR erforderlich', className: 'ocr-required' },
      OCR_DONE: { label: 'OCR vorhanden', className: 'ocr-done' },
      OCR_FAILED: { label: 'OCR fehlgeschlagen', className: 'ocr-failed' },
      OCR_IN_PROGRESS: { label: 'OCR läuft', className: 'ocr-in-progress' },
      OCR_CANCELLED: { label: 'OCR abgebrochen', className: 'ocr-cancelled' },
      OCR_SKIPPED: { label: 'OCR übersprungen', className: 'ocr-skipped' },
      OCR_SKIPPED_BY_USER: { label: 'OCR übersprungen', className: 'ocr-skipped' },
      OCR_SKIPPED_BY_TIMEOUT: { label: 'OCR Timeout', className: 'ocr-failed' },
      OCR_SKIPPED_BY_ERROR: { label: 'OCR Fehler', className: 'ocr-failed' },
      OCR_SKIPPED_BY_CONFLICT: { label: 'OCR Konflikt', className: 'ocr-failed' }
    }

    if (!ocrStatus) return null

    const badge = badges[ocrStatus] || { label: ocrStatus, className: 'ocr-unknown' }

    return (
      <div className="ocr-status-cell">
        <span className={`status-badge ${badge.className}`}>
          {badge.label}
        </span>
        {ocrStatus === 'OCR_DONE' && (
          <button
            className="reset-ocr-button"
            onClick={() => handleResetOcrStatus(file.id, file.fileName)}
            disabled={updatingOcrId === file.id}
            title="OCR zurücksetzen"
          >
            {updatingOcrId === file.id ? '⏳' : '🔄'}
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="file-list-container">
        <h3>Meine Vertragsdateien</h3>
        <div className="loading-message">Lade Dateien...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="file-list-container">
        <h3>Meine Vertragsdateien</h3>
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
        <button className="retry-button" onClick={loadFiles}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="file-list-container">
        <h3>Meine Vertragsdateien</h3>
        <div className="empty-message">
          <div className="empty-icon">📁</div>
          <p>Noch keine Dateien hochgeladen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="file-list-container">
      <div className="file-list-header">
        <h3>Meine Vertragsdateien</h3>
        <button className="refresh-button" onClick={loadFiles}>
          🔄 Aktualisieren
        </button>
      </div>

      <div className="file-table-wrapper">
        <table className="file-table">
          <thead>
            <tr>
              <th>Dateiname</th>
              <th>Status</th>
              <th>OCR Status</th>
              <th>Größe</th>
              <th>Hochgeladen</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td className="file-name-cell">
                  <span className="file-icon">📄</span>
                  <span>{file.fileName}</span>
                </td>
                <td>{getStatusBadge(file)}</td>
                <td>{getOcrStatusBadge(file)}</td>
                <td>{formatFileSize(file.fileSize)}</td>
                <td>{formatDate(file.uploadedAt)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => setEditingFile(file)}
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button
                      className="download-button"
                      onClick={() => handleDownload(file.id, file.fileName)}
                      disabled={downloadingId === file.id}
                      title="Herunterladen"
                    >
                      {downloadingId === file.id ? '⏳' : '⬇️'}
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(file.id, file.fileName)}
                      disabled={deletingId === file.id}
                      title="Löschen"
                    >
                      {deletingId === file.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingFile && (
        <ContractFileForm
          contractFile={editingFile}
          onSave={handleSave}
          onCancel={() => setEditingFile(null)}
        />
      )}
    </div>
  )
}

export default FileList
