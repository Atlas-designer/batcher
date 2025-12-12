import { useState, useRef } from 'react';
import { isSupportedFileType } from '../utils/fileParser';

/**
 * File uploader component with drag-and-drop support
 */
export default function FileUploader({ onFileSelect, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
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
      validateAndSelectFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const validateAndSelectFile = (file) => {
    if (!isSupportedFileType(file.name)) {
      setError('Unsupported file type. Please use .csv, .xls, .xlsx, or .pdf');
      return;
    }

    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="card">
      <div
        className={`file-uploader ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      >
        <div className="file-uploader-icon">📁</div>
        <h3>Upload Batch File</h3>
        <p>Drag and drop your file here, or click to browse</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Supports: .csv, .xls, .xlsx, .pdf
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.pdf"
          onChange={handleFileChange}
          disabled={disabled}
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
