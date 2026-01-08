import { useState, useEffect, useMemo } from 'react';
import { OUTPUT_COLUMNS, downloadCSV, downloadSFTPCSV, downloadPersonalGroupCSV, toCSV, toSFTPCSV, toPersonalGroupCSV } from '../utils/outputFormatter';
import { getErrorRowNumbers } from '../utils/validation';
import DuplicateChecker from './DuplicateChecker';

/**
 * Output preview component with validation warnings
 */
export default function OutputPreview({
  data,
  validationErrors,
  onDownload,
  filename,
  onRemoveDuplicates,
  companyName,
  sourceFilename,
  sourceData,
  sourceColumns
}) {
  const [duplicateCheckPassed, setDuplicateCheckPassed] = useState(null);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [isCarMaintenance, setIsCarMaintenance] = useState(false);
  const [isPersonalGroup, setIsPersonalGroup] = useState(false);
  const [maxEmployees, setMaxEmployees] = useState(50);

  // Auto-detect car maintenance or personal group from source filename
  useEffect(() => {
    if (sourceFilename) {
      const lowerFilename = sourceFilename.toLowerCase();
      if (lowerFilename.includes('car maintenance')) {
        setIsCarMaintenance(true);
      }
      if (lowerFilename.includes('personal group')) {
        setIsPersonalGroup(true);
      }
    }
  }, [sourceFilename]);

  // Get date string for filenames
  const getDateStr = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };

  // Handle CSV download for a specific chunk
  const handleChunkDownload = (chunkIndex) => {
    const chunk = dataChunks[chunkIndex];
    if (!chunk) return;

    const dateStr = getDateStr();
    const suffix = needsSplit ? ` ${chunkIndex + 1}` : '';
    const downloadFilename = `${companyName} ${dateStr}${suffix}.csv`;
    downloadCSV(chunk, downloadFilename);
  };

  // Handle SFTP download for a specific chunk
  const handleSFTPChunkDownload = (chunkIndex) => {
    const chunk = dataChunks[chunkIndex];
    if (!chunk || !companyName) return;

    const dateStr = getDateStr();
    const suffix = needsSplit ? ` ${chunkIndex + 1}` : '';
    const downloadFilename = `${companyName} SFTP ${dateStr}${suffix}.csv`;

    // Create and download
    const csvContent = toSFTPCSV(chunk);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Personal Group download for a specific chunk
  const handlePersonalGroupChunkDownload = (chunkIndex) => {
    const chunk = dataChunks[chunkIndex];
    if (!chunk || !companyName || !sourceData || !sourceColumns) return;

    // Get list of processed emails from this chunk
    const processedEmails = chunk.map(row => row['Email']).filter(e => e);

    const dateStr = getDateStr();
    const suffix = needsSplit ? ` ${chunkIndex + 1}` : '';
    const downloadFilename = `Uploaded ${companyName} ${dateStr}${suffix}.csv`;

    // Create and download
    const csvContent = toPersonalGroupCSV(sourceData, processedEmails, sourceColumns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Legacy handlers for single file (when not split)
  const handleSFTPDownload = () => handleSFTPChunkDownload(0);
  const handlePersonalGroupDownload = () => handlePersonalGroupChunkDownload(0);

  // Handle duplicate check results
  const handleDuplicatesFound = (duplicates) => {
    setHasDuplicates(duplicates.length > 0);
    if (duplicates.length === 0) {
      setDuplicateCheckPassed(true);
    }
  };

  // Handle proceed decision from duplicate dialog
  const handleProceedDecision = (proceed) => {
    setDuplicateCheckPassed(proceed);
  };
  const errorRows = getErrorRowNumbers(validationErrors);
  const hasErrors = validationErrors.length > 0;

  // Calculate LOC Sum
  const locSum = data ? data.reduce((sum, row) => {
    const locValue = parseFloat(row['LOC Amount']) || 0;
    return sum + locValue;
  }, 0) : 0;

  // Calculate number of files needed and split data into chunks
  const dataChunks = useMemo(() => {
    if (!data || data.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < data.length; i += maxEmployees) {
      chunks.push(data.slice(i, i + maxEmployees));
    }
    return chunks;
  }, [data, maxEmployees]);

  const needsSplit = dataChunks.length > 1;

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Output Data</h3>
          <p>Complete the mapping to see output preview</p>
        </div>
      </div>
    );
  }

  const columns = OUTPUT_COLUMNS.map(c => c.key);

  return (
    <div>
      {/* Validation Warnings */}
      {hasErrors && (
        <ValidationPanel errors={validationErrors} />
      )}

      {/* Special Mode Checkboxes */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isCarMaintenance}
            onChange={(e) => setIsCarMaintenance(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontWeight: 500 }}>Car Maintenance</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPersonalGroup}
            onChange={(e) => setIsPersonalGroup(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontWeight: 500 }}>Personal Group</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(adds LOC Upload Date)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 500 }}>Max Employees:</span>
          <input
            type="number"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(parseInt(e.target.value) || 50)}
            min="1"
            style={{
              width: '70px',
              padding: '0.25rem 0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}
          />
        </label>
      </div>

      {/* Output Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Output Preview</h3>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>
              {data.length} row{data.length !== 1 ? 's' : ''}
              {hasErrors && ` (${validationErrors.length} with issues)`}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>
              LOC Sum: £{locSum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="data-table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                {columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={errorRows.includes(rowIdx + 1) ? 'row-error' : ''}
                >
                  <td style={{ color: 'var(--text-muted)' }}>
                    {rowIdx + 1}
                    {errorRows.includes(rowIdx + 1) && (
                      <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>⚠</span>
                    )}
                  </td>
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      style={{
                        color: isCellError(validationErrors, rowIdx + 1, col)
                          ? 'var(--danger)'
                          : undefined
                      }}
                    >
                      {row[col] !== undefined && row[col] !== null
                        ? String(row[col]).substring(0, 50)
                        : ''}
                      {row[col] && String(row[col]).length > 50 && '...'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Duplicate Checker */}
        <DuplicateChecker
          outputData={data}
          onDuplicatesFound={handleDuplicatesFound}
          onProceed={handleProceedDecision}
          onRemoveDuplicates={onRemoveDuplicates}
        />

        {/* Download Button(s) */}
        <div className="action-bar">
          <div className="action-bar-left">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Output: {filename}
              {needsSplit && (
                <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>
                  (Split into {dataChunks.length} files)
                </span>
              )}
            </span>
          </div>
          <div className="action-bar-right" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!needsSplit ? (
              // Single file download
              <>
                <button
                  className="btn btn-success"
                  onClick={onDownload}
                >
                  ⬇ Download CSV
                </button>
                {isCarMaintenance && (
                  <button
                    className="btn btn-success"
                    onClick={handleSFTPDownload}
                  >
                    ⬇ Download SFTP
                  </button>
                )}
                {isPersonalGroup && sourceData && (
                  <button
                    className="btn btn-success"
                    onClick={handlePersonalGroupDownload}
                  >
                    ⬇ Download Personal Group
                  </button>
                )}
              </>
            ) : (
              // Multiple file downloads
              <>
                {dataChunks.map((chunk, idx) => (
                  <button
                    key={`csv-${idx}`}
                    className="btn btn-success"
                    onClick={() => handleChunkDownload(idx)}
                    title={`${chunk.length} employees`}
                  >
                    ⬇ Download CSV {idx + 1}
                  </button>
                ))}
                {isCarMaintenance && dataChunks.map((chunk, idx) => (
                  <button
                    key={`sftp-${idx}`}
                    className="btn btn-success"
                    onClick={() => handleSFTPChunkDownload(idx)}
                    title={`${chunk.length} employees`}
                  >
                    ⬇ Download SFTP {idx + 1}
                  </button>
                ))}
                {isPersonalGroup && sourceData && dataChunks.map((chunk, idx) => (
                  <button
                    key={`pg-${idx}`}
                    className="btn btn-success"
                    onClick={() => handlePersonalGroupChunkDownload(idx)}
                    title={`${chunk.length} employees`}
                  >
                    ⬇ Download Personal Group {idx + 1}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Validation panel showing errors
 */
function ValidationPanel({ errors }) {
  // Group errors by type
  const flatErrors = errors.flatMap(rowError =>
    rowError.errors.map(err => ({
      ...err,
      row: rowError.row
    }))
  );

  // Limit displayed errors
  const displayErrors = flatErrors.slice(0, 20);
  const hasMore = flatErrors.length > 20;

  return (
    <div className="validation-panel">
      <h4>
        <span>⚠️</span>
        Validation Warnings ({errors.length} row{errors.length !== 1 ? 's' : ''} with issues)
      </h4>
      <ul>
        {displayErrors.map((err, idx) => (
          <li key={idx}>
            Row {err.row}: Missing {err.column}
          </li>
        ))}
        {hasMore && (
          <li style={{ fontStyle: 'italic' }}>
            ... and {flatErrors.length - 20} more issues
          </li>
        )}
      </ul>
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        You can still download the file, but these rows have missing required data.
      </p>
    </div>
  );
}

/**
 * Check if a specific cell has an error
 */
function isCellError(errors, row, column) {
  const rowError = errors.find(e => e.row === row);
  if (!rowError) return false;
  return rowError.errors.some(e => e.column === column);
}
