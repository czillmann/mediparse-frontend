import { useState, useRef } from 'react'
import { uploadContractFile } from '../services/api'
import './FileUpload.css'

function FileUpload({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleFileInputChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleFileSelection = (file) => {
    setError(null)

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Nur PDF-Dateien sind erlaubt')
      return
    }

    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Datei ist zu groß. Maximale Größe: 10 MB')
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const response = await uploadContractFile(selectedFile, (progress) => {
        setUploadProgress(progress)
      })

      // Reset form
      setSelectedFile(null)
      setUploadProgress(0)
      setIsUploading(false)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(response)
      }
    } catch (err) {
      setError(err.message)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="file-upload-container">
      <h3>Vertragsdatei hochladen</h3>

      {!selectedFile && !isUploading && (
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="upload-icon">📄</div>
          <p className="upload-text">
            PDF-Datei hierher ziehen oder <span className="browse-text">durchsuchen</span>
          </p>
          <p className="upload-hint">Maximale Dateigröße: 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {selectedFile && !isUploading && (
        <div className="file-selected">
          <div className="file-info">
            <div className="file-icon">📄</div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">{formatFileSize(selectedFile.size)}</div>
            </div>
          </div>
          <div className="file-actions">
            <button className="cancel-button" onClick={handleCancel}>
              Abbrechen
            </button>
            <button className="upload-button" onClick={handleUpload}>
              Hochladen
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-info">
            <span>Wird hochgeladen...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="uploading-file-name">{selectedFile?.name}</div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default FileUpload
