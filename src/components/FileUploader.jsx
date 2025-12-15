import { useState, useRef } from 'react';
import { isSupportedFileType } from '../utils/fileParser';

/**
 * File uploader component with drag-and-drop support
 * Supports multiple file selection and combination mode
 */
export default function FileUploader({ onFileSelect, onCombineFiles, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [combinationMode, setCombinationMode] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setError('');

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndSelectFiles(Array.from(files));
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFiles(Array.from(files));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const validateAndSelectFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      if (isSupportedFileType(file.name)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Unsupported file type(s): ${invalidFiles.join(', ')}. Please use .csv, .xls, .xlsx, or .pdf`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);

      // Combination mode: combine all files into one dataset
      if (combinationMode && validFiles.length > 1 && onCombineFiles) {
        onCombineFiles(validFiles);
      } else {
        // Normal mode: pass array if multiple, single file if one
        onFileSelect(validFiles.length === 1 ? validFiles[0] : validFiles);
      }
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="card">
      {/* Combination Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.75rem',
        background: combinationMode ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg)',
        borderRadius: '0.5rem',
        border: combinationMode ? '2px solid var(--primary)' : '1px solid var(--border)'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={combinationMode}
            onChange={(e) => setCombinationMode(e.target.checked)}
            disabled={disabled}
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
          <div>
            <strong style={{ color: combinationMode ? 'var(--primary)' : 'inherit' }}>
              Combination Mode
            </strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Combine multiple single-applicant PDFs into one output file
            </p>
          </div>
        </label>
      </div>

      <div
        className={`file-uploader ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      >
        <div className="file-uploader-icon">{combinationMode ? '📑' : '📁'}</div>
        <h3>{combinationMode ? 'Upload PDFs to Combine' : 'Upload Batch Files'}</h3>
        <p>Drag and drop your files here, or click to browse</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Supports: .csv, .xls, .xlsx, .pdf
        </p>
        {combinationMode ? (
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500' }}>
            Select all PDFs to combine into one batch
          </p>
        ) : (
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
            You can select multiple files at once
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.pdf"
          onChange={handleFileChange}
          disabled={disabled}
          multiple
        />
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}
