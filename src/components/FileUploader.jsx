import { useState, useRef } from 'react';
import { isSupportedFileType } from '../utils/fileParser';

/**
 * File uploader component with drag-and-drop support
 * Supports multiple file selection
 */
export default function FileUploader({ onFileSelect, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
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
      // Pass array if multiple, single file if one
      onFileSelect(validFiles.length === 1 ? validFiles[0] : validFiles);
    }
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
        <h3>Upload Batch Files</h3>
        <p>Drag and drop your files here, or click to browse</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Supports: .csv, .xls, .xlsx, .pdf
        </p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
          You can select multiple files at once
        </p>

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
