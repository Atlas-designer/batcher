import { useState, useEffect } from 'react';
import { processRawData, filterByDateRange, detectDateColumns, detectFirstDataRow } from '../utils/fileParser';
import { cleanCompanyName } from '../utils/filenameParser';

/**
 * Data Configurator - allows user to specify row settings and date filtering
 * All rows before the first applicant row are available for mapping (header info rows)
 */
export default function DataConfigurator({
  rawRows,
  onConfigured,
  existingConfig,
  detectedCompany,
  detectedEntity,
  suggestedStartRow,  // From matched process's saved dataConfig
  onSkip,  // Callback to skip this file (for empty files or to move to next in queue)
  hasMoreFiles = false  // Whether there are more files in the queue
}) {
  // Determine initial start row: 1) existing config, 2) suggested from process, 3) auto-detect, 4) default to 2
  const getInitialStartRow = () => {
    if (existingConfig?.startRow) return existingConfig.startRow;
    if (suggestedStartRow) return suggestedStartRow;
    if (rawRows && rawRows.length > 0) return detectFirstDataRow(rawRows);
    return 2;
  };

  // Row configuration - only need to specify where applicant data starts
  const [startRow, setStartRow] = useState(getInitialStartRow());
  const [startRowSource, setStartRowSource] = useState(
    existingConfig?.startRow ? 'existing' : (suggestedStartRow ? 'saved' : 'auto')
  );
  const [endRow, setEndRow] = useState(existingConfig?.endRow || '');
  const [useEndRow, setUseEndRow] = useState(!!existingConfig?.endRow);

  // Company name source
  const [companySource, setCompanySource] = useState(existingConfig?.companySource || 'filename');
  const [companyRow, setCompanyRow] = useState(existingConfig?.companyRow || 1);
  const [companyCol, setCompanyCol] = useState(existingConfig?.companyCol || 1);
  const [extractedCompanyName, setExtractedCompanyName] = useState(detectedCompany || '');

  // Update company name when source or cell changes
  useEffect(() => {
    if (companySource === 'filename') {
      setExtractedCompanyName(detectedCompany || '');
    } else if (companySource === 'cell' && rawRows) {
      const rowData = rawRows[companyRow - 1];
      if (rowData && rowData[companyCol - 1]) {
        const rawValue = String(rowData[companyCol - 1]);
        setExtractedCompanyName(cleanCompanyName(rawValue));
      } else {
        setExtractedCompanyName('');
      }
    }
  }, [companySource, companyRow, companyCol, rawRows, detectedCompany]);

  // Date filtering
  const [dateColumn, setDateColumn] = useState(existingConfig?.dateColumn || '');
  const [dateFrom, setDateFrom] = useState(existingConfig?.dateFrom || '');
  const [dateTo, setDateTo] = useState(existingConfig?.dateTo || '');

  // Processed data preview
  const [previewData, setPreviewData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [detectedDateCols, setDetectedDateCols] = useState([]);

  // Process data whenever settings change
  // Header row is always startRow - 1 (the row immediately before applicant data)
  useEffect(() => {
    if (!rawRows || rawRows.length === 0) return;

    const headerRow = startRow - 1; // Always use the row just before data starts as headers

    const processed = processRawData(rawRows, {
      headerRow,
      startRow,
      endRow: useEndRow && endRow ? parseInt(endRow) : null
    });

    // Detect date columns
    const dateCols = detectDateColumns(processed.data, processed.columns);
    setDetectedDateCols(dateCols);

    // Apply date filter if configured
    let filteredData = processed.data;
    if (dateColumn && (dateFrom || dateTo)) {
      filteredData = filterByDateRange(processed.data, dateColumn, dateFrom, dateTo);
    }

    setColumns(processed.columns);
    setPreviewData({
      data: filteredData,
      columns: processed.columns,
      rowCount: filteredData.length,
      totalRawRows: rawRows.length
    });
  }, [rawRows, startRow, endRow, useEndRow, dateColumn, dateFrom, dateTo]);

  // Build header info rows (all rows from 1 to startRow-1) for mapping
  const getHeaderInfoRows = () => {
    if (!rawRows || startRow < 2) return [];

    const headerInfo = [];
    for (let i = 0; i < startRow - 1; i++) {
      const row = rawRows[i];
      if (row) {
        headerInfo.push({
          rowNumber: i + 1,
          cells: row.map((cell, colIdx) => ({
            column: colIdx + 1,
            value: cell ? String(cell).trim() : ''
          }))
        });
      }
    }
    return headerInfo;
  };

  // Handle apply configuration
  const handleApply = () => {
    if (previewData) {
      const headerRow = startRow - 1;
      onConfigured({
        data: previewData.data,
        columns: previewData.columns,
        companyName: extractedCompanyName,
        headerInfoRows: getHeaderInfoRows(), // Include all pre-applicant rows for mapping
        config: {
          headerRow,
          startRow,
          endRow: useEndRow && endRow ? parseInt(endRow) : null,
          companySource,
          companyRow,
          companyCol,
          dateColumn,
          dateFrom,
          dateTo
        }
      });
    }
  };

  if (!rawRows || rawRows.length === 0) {
    return <div className="card">No data to configure</div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Data Configuration</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {rawRows.length} total rows in file
        </span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Specify which row contains the first applicant. All rows above will be available for mapping.
      </p>

      {/* Row Configuration */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            First Applicant Row
            {startRowSource === 'saved' && (
              <span style={{ fontWeight: 'normal', color: 'var(--success)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                (remembered from process)
              </span>
            )}
            {startRowSource === 'auto' && (
              <span style={{ fontWeight: 'normal', color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                (auto-detected)
              </span>
            )}
          </label>
          <input
            type="number"
            min="2"
            max={rawRows.length}
            value={startRow}
            onChange={(e) => {
              setStartRow(Math.max(2, parseInt(e.target.value) || 2));
              setStartRowSource('manual');
            }}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
          />
          <small style={{ color: 'var(--text-muted)' }}>
            Rows 1-{startRow - 1} will be available for mapping (headers/info)
          </small>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={useEndRow}
              onChange={(e) => setUseEndRow(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            Last Applicant Row (optional)
          </label>
          <input
            type="number"
            min={startRow}
            max={rawRows.length}
            value={endRow}
            onChange={(e) => setEndRow(e.target.value)}
            disabled={!useEndRow}
            placeholder="All rows"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              opacity: useEndRow ? 1 : 0.5
            }}
          />
          <small style={{ color: 'var(--text-muted)' }}>Leave unchecked to include all remaining rows</small>
        </div>
      </div>

      {/* Company Name Source */}
      <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Company Name
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Source
            </label>
            <select
              value={companySource}
              onChange={(e) => setCompanySource(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
            >
              <option value="filename">From filename</option>
              <option value="cell">From cell in file</option>
            </select>
          </div>

          {companySource === 'cell' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Row
                </label>
                <input
                  type="number"
                  min="1"
                  max={startRow - 1}
                  value={companyRow}
                  onChange={(e) => setCompanyRow(Math.max(1, Math.min(startRow - 1, parseInt(e.target.value) || 1)))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Column
                </label>
                <input
                  type="number"
                  min="1"
                  max={rawRows[0]?.length || 1}
                  value={companyCol}
                  onChange={(e) => setCompanyCol(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
                />
              </div>
            </>
          )}

          <div style={{ gridColumn: companySource === 'cell' ? 'span 3' : 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Company Name (editable)
            </label>
            <input
              type="text"
              value={extractedCompanyName}
              onChange={(e) => setExtractedCompanyName(e.target.value)}
              placeholder="Enter company name..."
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontWeight: '500'
              }}
            />
            {companySource === 'cell' && rawRows[companyRow - 1]?.[companyCol - 1] && (
              <small style={{ color: 'var(--text-muted)' }}>
                Raw value: "{rawRows[companyRow - 1][companyCol - 1]}"
              </small>
            )}
            {companySource === 'filename' && detectedCompany && extractedCompanyName !== detectedCompany && (
              <small style={{ color: 'var(--text-muted)' }}>
                Auto-detected: "{detectedCompany}" •{' '}
                <button
                  type="button"
                  onClick={() => setExtractedCompanyName(detectedCompany)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Reset
                </button>
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Date Filtering */}
      {detectedDateCols.length > 0 && (
        <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Date Filtering (Optional)
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>
            Filter applicants by date range. Detected date columns: {detectedDateCols.join(', ')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Date Column
              </label>
              <select
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              >
                <option value="">-- No date filter --</option>
                {columns.map(col => (
                  <option key={col} value={col}>
                    {col} {detectedDateCols.includes(col) ? '(date detected)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={!dateColumn}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  opacity: dateColumn ? 1 : 0.5
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={!dateColumn}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  opacity: dateColumn ? 1 : 0.5
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Raw Data Preview */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Raw File Preview (first 10 rows)
        </h4>
        <div className="data-table-container" style={{ maxHeight: '250px', overflow: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', background: 'var(--bg)' }}>Row</th>
                {rawRows[0]?.map((_, idx) => (
                  <th key={idx} style={{ background: 'var(--bg)' }}>Col {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawRows.slice(0, 10).map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    background: rowIdx + 1 < startRow
                      ? 'rgba(37, 99, 235, 0.1)'  // Header/info rows (blue)
                      : 'rgba(22, 163, 74, 0.05)' // Data rows (green)
                  }}
                >
                  <td style={{ fontWeight: '500' }}>
                    {rowIdx + 1}
                    {rowIdx + 1 < startRow && <span style={{ color: 'var(--primary)', marginLeft: '0.25rem' }}>H</span>}
                    {rowIdx + 1 === startRow && <span style={{ color: 'var(--success)', marginLeft: '0.25rem' }}>→</span>}
                  </td>
                  {row?.map((cell, cellIdx) => (
                    <td key={cellIdx}>
                      {cell ? String(cell).substring(0, 30) : ''}
                      {cell && String(cell).length > 30 && '...'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
          <span><span style={{ color: 'var(--primary)' }}>■</span> Header/Info rows (available for mapping)</span>
          <span><span style={{ color: 'var(--success)' }}>■</span> Applicant data rows</span>
        </div>
      </div>

      {/* Processed Preview */}
      {previewData && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Processed Data Preview
            <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>
              ({previewData.rowCount} applicants will be processed)
            </span>
          </h4>
          <div className="data-table-container" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>#</th>
                  {previewData.columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.data.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    {previewData.columns.map(col => (
                      <td key={col}>
                        {row[col] ? String(row[col]).substring(0, 25) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.rowCount > 5 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              ... and {previewData.rowCount - 5} more rows
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-bar" style={{ borderTop: 'none', paddingTop: 0 }}>
        <div>
          {onSkip && (
            <button
              className="btn btn-secondary"
              onClick={onSkip}
              title={hasMoreFiles ? "Skip this file and continue with the next one" : "Disregard this file and return to upload"}
            >
              {hasMoreFiles ? 'Skip File →' : 'Disregard File'}
            </button>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={!previewData || previewData.rowCount === 0}
        >
          Continue with {previewData?.rowCount || 0} applicants →
        </button>
      </div>

      {/* Empty file warning */}
      {previewData && previewData.rowCount === 0 && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid #f59e0b',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginTop: '1rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#b45309', marginBottom: '0.5rem' }}>
            <strong>No applicants found in this file.</strong>
          </p>
          <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
            The file appears to be empty or the row settings may need adjusting.
            {onSkip && (hasMoreFiles
              ? ' Click "Skip File" to continue with the next file in the queue.'
              : ' Click "Disregard File" to return to the upload screen.')}
          </p>
        </div>
      )}
    </div>
  );
}
