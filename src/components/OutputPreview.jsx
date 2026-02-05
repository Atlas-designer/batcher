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
  const [splitByColumn, setSplitByColumn] = useState('');

  // Date format toggle - persists for session, defaults to DD.MM.YY
  const [dateFormat, setDateFormat] = useState(() => {
    return sessionStorage.getItem('dateFormat') || 'short';
  });

  // Save date format preference to session storage
  const toggleDateFormat = () => {
    const newFormat = dateFormat === 'short' ? 'long' : 'short';
    setDateFormat(newFormat);
    sessionStorage.setItem('dateFormat', newFormat);
  };

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

  // Get date string for filenames based on selected format
  const getDateStr = () => {
    const now = new Date();

    if (dateFormat === 'long') {
      // Format: "5th Feb 2026"
      const day = now.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();

      // Add ordinal suffix (st, nd, rd, th)
      const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return `${getOrdinal(day)} ${month} ${year}`;
    } else {
      // Format: "05.02.26" (default)
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      return `${day}.${month}.${year}`;
    }
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

  // Group output data by a source column value (for split-by-column feature)
  const splitGroups = useMemo(() => {
    if (!splitByColumn || !sourceData || !data) return null;

    const groups = {};
    // Each output row has _sourceIndex pointing back to its source row
    data.forEach((outputRow) => {
      const srcIdx = outputRow._sourceIndex;
      const srcRow = srcIdx !== undefined ? sourceData[srcIdx] : null;
      const groupValue = srcRow
        ? String(srcRow[splitByColumn] || 'Unknown').trim()
        : 'Unknown';

      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(outputRow);
    });

    return groups;
  }, [splitByColumn, sourceData, data]);

  // Download all split-by-column files
  const handleSplitDownloadAll = () => {
    if (!splitGroups) return;
    const dateStr = getDateStr();

    Object.entries(splitGroups).forEach(([groupValue, rows]) => {
      const cleanGroup = groupValue.replace(/[^a-zA-Z0-9\s\-&]/g, '').trim();
      const downloadFilename = `${companyName} ${cleanGroup} ${dateStr}.csv`;
      downloadCSV(rows, downloadFilename);
    });
  };

  // Download a single split group
  const handleSplitGroupDownload = (groupValue, rows) => {
    const dateStr = getDateStr();
    const cleanGroup = groupValue.replace(/[^a-zA-Z0-9\s\-&]/g, '').trim();
    const downloadFilename = `${companyName} ${cleanGroup} ${dateStr}.csv`;
    downloadCSV(rows, downloadFilename);
  };

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
        {sourceColumns && sourceColumns.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 500 }}>Split by Column:</span>
            <select
              value={splitByColumn}
              onChange={(e) => setSplitByColumn(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                fontSize: '0.875rem',
                background: 'var(--bg-secondary)',
                color: 'inherit',
                maxWidth: '200px'
              }}
            >
              <option value="">-- None --</option>
              {sourceColumns.map((col, idx) => (
                <option key={idx} value={col}>{col}</option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={toggleDateFormat}
          style={{
            padding: '0.35rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            fontSize: '0.8rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}
          title="Click to toggle date format in filenames"
        >
          Date Format: {dateFormat === 'short' ? 'DD.MM.YY' : 'Day Month Year'}
        </button>
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

        {/* Split by Column Results */}
        {splitByColumn && splitGroups && Object.keys(splitGroups).length > 0 && (
          <div style={{
            margin: '1rem',
            padding: '1rem',
            background: 'rgba(33, 150, 243, 0.05)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>
                Split by "{splitByColumn}" — {Object.keys(splitGroups).length} group{Object.keys(splitGroups).length !== 1 ? 's' : ''}
              </h4>
              <button
                className="btn btn-success"
                onClick={handleSplitDownloadAll}
              >
                ⬇ Download All Split Files
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(splitGroups).map(([groupValue, rows]) => (
                <div
                  key={groupValue}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{groupValue}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.75rem' }}>
                      {rows.length} employee{rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    className="btn btn-success"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                    onClick={() => handleSplitGroupDownload(groupValue, rows)}
                  >
                    ⬇ Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  onClick={() => handleChunkDownload(0)}
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
