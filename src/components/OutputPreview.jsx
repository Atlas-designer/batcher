import { useState, useEffect } from 'react';
import { OUTPUT_COLUMNS, downloadSFTPCSV, downloadPersonalGroupCSV } from '../utils/outputFormatter';
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

  // Handle SFTP download
  const handleSFTPDownload = () => {
    if (data && companyName) {
      downloadSFTPCSV(data, companyName);
    }
  };

  // Handle Personal Group download
  const handlePersonalGroupDownload = () => {
    if (data && companyName && sourceData && sourceColumns) {
      // Get list of processed emails from output data
      const processedEmails = data.map(row => row['Email']).filter(e => e);
      downloadPersonalGroupCSV(sourceData, processedEmails, sourceColumns, companyName);
    }
  };

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
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
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
      </div>

      {/* Output Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Output Preview</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {data.length} row{data.length !== 1 ? 's' : ''}
            {hasErrors && ` (${validationErrors.length} with issues)`}
          </span>
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
            </span>
          </div>
          <div className="action-bar-right" style={{ display: 'flex', gap: '0.5rem' }}>
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
