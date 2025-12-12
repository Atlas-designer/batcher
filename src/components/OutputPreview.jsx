import { OUTPUT_COLUMNS } from '../utils/outputFormatter';
import { getErrorRowNumbers } from '../utils/validation';

/**
 * Output preview component with validation warnings
 */
export default function OutputPreview({
  data,
  validationErrors,
  onDownload,
  filename
}) {
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

        {/* Download Button */}
        <div className="action-bar">
          <div className="action-bar-left">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Output: {filename}
            </span>
          </div>
          <div className="action-bar-right">
            <button
              className="btn btn-success"
              onClick={onDownload}
            >
              ⬇ Download CSV
            </button>
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
