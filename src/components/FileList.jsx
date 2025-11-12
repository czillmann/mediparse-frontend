import { useState, useEffect } from 'react'
import { getContractFiles, deleteContractFile, downloadContractFile } from '../services/api'
import './FileList.css'

function FileList({ refreshTrigger }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

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

  const getStatusBadge = (status) => {
    const badges = {
      UPLOADED: { label: 'Hochgeladen', className: 'status-uploaded' },
      PROCESSING: { label: 'In Bearbeitung', className: 'status-processing' },
      PROCESSED: { label: 'Verarbeitet', className: 'status-processed' },
      FAILED: { label: 'Fehlgeschlagen', className: 'status-failed' }
    }

    const badge = badges[status] || { label: status, className: 'status-unknown' }

    return (
      <span className={`status-badge ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const getOcrStatusBadge = (ocrStatus) => {
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
      <span className={`status-badge ${badge.className}`}>
        {badge.label}
      </span>
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
                <td>{getStatusBadge(file.status)}</td>
                <td>{getOcrStatusBadge(file.ocrStatus)}</td>
                <td>{formatFileSize(file.fileSize)}</td>
                <td>{formatDate(file.uploadedAt)}</td>
                <td>
                  <div className="action-buttons">
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
    </div>
  )
}

export default FileList
