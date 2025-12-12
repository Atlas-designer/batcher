/**
 * Data preview component - displays parsed data in a table
 */
export default function DataPreview({ data, columns, errorRows = [], title = 'Data Preview', maxRows = 100 }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Data</h3>
          <p>Upload a file to see the data preview</p>
        </div>
      </div>
    );
  }

  const displayData = data.slice(0, maxRows);
  const hasMore = data.length > maxRows;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {data.length} row{data.length !== 1 ? 's' : ''}
          {hasMore && ` (showing first ${maxRows})`}
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
            {displayData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={errorRows.includes(rowIdx + 1) ? 'row-error' : ''}
              >
                <td style={{ color: 'var(--text-muted)' }}>{rowIdx + 1}</td>
                {columns.map((col, colIdx) => (
                  <td key={colIdx}>
                    {row[col] !== undefined && row[col] !== null
                      ? String(row[col]).substring(0, 100)
                      : ''}
                    {row[col] && String(row[col]).length > 100 && '...'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
          ... and {data.length - maxRows} more rows
        </div>
      )}
    </div>
  );
}
