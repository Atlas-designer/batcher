import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

/**
 * Duplicate Checker Tab - Compare two files for duplicate employees
 */
export default function DuplicateCheckerTab() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [sourceSelection, setSourceSelection] = useState('A');
  const [processing, setProcessing] = useState(false);

  // Auto-search when both files are loaded
  useEffect(() => {
    if (dataA && dataB && !processing) {
      findDuplicates();
    }
  }, [dataA, dataB]);

  // Handle file upload for side A
  const handleFileUploadA = async (file) => {
    if (!file) {
      setFileA(null);
      setDataA(null);
      setDuplicates([]);
      return;
    }
    setFileA(file);
    const data = await parseFile(file);
    setDataA(data);
    setDuplicates([]); // Clear previous results
  };

  // Handle file upload for side B
  const handleFileUploadB = async (file) => {
    if (!file) {
      setFileB(null);
      setDataB(null);
      setDuplicates([]);
      return;
    }
    setFileB(file);
    const data = await parseFile(file);
    setDataB(data);
    setDuplicates([]); // Clear previous results
  };

  // Parse Excel or CSV file
  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Normalize a value for comparison
  const normalizeValue = (value) => {
    if (!value || value === '') return '';
    const str = String(value).toLowerCase().trim();
    // Remove common punctuation and extra spaces
    return str.replace(/[,\s]+/g, '');
  };

  // Normalize a name (remove spaces, lowercase)
  const normalizeName = (name) => {
    if (!name) return '';
    return String(name).toLowerCase().replace(/\s+/g, '').trim();
  };

  // Normalize LOC amount
  const normalizeLOC = (loc) => {
    if (!loc) return '';
    const cleaned = String(loc).replace(/[£$€,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? '' : parsed.toFixed(2);
  };

  // Extract meaningful values from a row (skip empty values and common non-identifying fields)
  const extractRowValues = (row) => {
    const values = [];
    const skipColumns = /^(id|index|row|date|timestamp|created|updated|status)/i;

    Object.entries(row).forEach(([key, value]) => {
      // Skip columns that are typically not identifying
      if (skipColumns.test(key)) return;

      const normalized = normalizeValue(value);
      if (normalized && normalized.length > 0) {
        values.push({
          key,
          original: value,
          normalized
        });
      }
    });

    return values;
  };

  // Check if two rows are duplicates by comparing values field by field
  const areRowsDuplicates = (rowA, rowB) => {
    const valuesA = extractRowValues(rowA);
    const valuesB = extractRowValues(rowB);

    if (valuesA.length === 0 || valuesB.length === 0) return { isDuplicate: false, matches: [] };

    const matches = [];
    let nameMatch = false;
    let locMatch = false;

    // Compare each value from A against all values from B
    valuesA.forEach(valA => {
      valuesB.forEach(valB => {
        // Check for exact normalized match
        if (valA.normalized === valB.normalized) {
          matches.push({
            keyA: valA.key,
            keyB: valB.key,
            value: valA.original
          });

          // Check if this looks like a name field
          if (/name|first|last|surname|forename/i.test(valA.key) ||
              /name|first|last|surname|forename/i.test(valB.key)) {
            nameMatch = true;
          }

          // Check if this looks like a LOC/amount field
          if (/loc|amount|value|cost|price/i.test(valA.key) ||
              /loc|amount|value|cost|price/i.test(valB.key)) {
            // Verify it's actually a number
            const num = parseFloat(String(valA.original).replace(/[£$€,\s]/g, ''));
            if (!isNaN(num)) {
              locMatch = true;
            }
          }
        }
      });
    });

    // Consider it a duplicate if we have at least 2-3 matches including name
    const isDuplicate = matches.length >= 2 && nameMatch;

    return { isDuplicate, matches, nameMatch, locMatch };
  };

  // Find duplicates between the two datasets
  const findDuplicates = () => {
    if (!dataA || !dataB) return;

    setProcessing(true);
    const found = [];

    // Compare each row in A against each row in B
    dataA.forEach((rowA, idxA) => {
      dataB.forEach((rowB, idxB) => {
        const comparison = areRowsDuplicates(rowA, rowB);

        if (comparison.isDuplicate) {
          // Extract display values for the matched fields
          const displayMatches = comparison.matches.slice(0, 3); // Show first 3 matches
          const matchSummary = displayMatches.map(m => `${m.value}`).join(', ');

          found.push({
            rowA,
            rowB,
            indexA: idxA,
            indexB: idxB,
            matches: comparison.matches,
            matchSummary,
            nameMatch: comparison.nameMatch,
            locMatch: comparison.locMatch,
            sourceRow: sourceSelection === 'A' ? rowA : rowB
          });
        }
      });
    });

    setDuplicates(found);
    setProcessing(false);
  };

  // Download duplicates as CSV
  const downloadDuplicates = () => {
    if (duplicates.length === 0) return;

    // Get the raw data based on source selection
    const sourceData = duplicates.map(dup => dup.sourceRow);

    // Convert to CSV
    const headers = Object.keys(sourceData[0]);
    const csvContent = [
      headers.join(','),
      ...sourceData.map(row =>
        headers.map(h => {
          const val = row[h] || '';
          const str = String(val);
          // Escape CSV values
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\r\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Duplicates_from_${sourceSelection}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍 Duplicate Checker</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Compare two files to find matching employees by name and LOC amount
        </p>
      </div>

      {/* File Upload Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Side A */}
        <FileDropZone
          label="File A"
          file={fileA}
          data={dataA}
          onFileUpload={handleFileUploadA}
        />

        {/* Side B */}
        <FileDropZone
          label="File B"
          file={fileB}
          data={dataB}
          onFileUpload={handleFileUploadB}
        />
      </div>

      {/* Source Selection */}
      {fileA && fileB && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <label style={{ fontWeight: 600, marginRight: '1rem' }}>
              Extract raw data from:
            </label>
            <label style={{ marginRight: '2rem', cursor: 'pointer' }}>
              <input
                type="radio"
                value="A"
                checked={sourceSelection === 'A'}
                onChange={(e) => setSourceSelection(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              File A
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                value="B"
                checked={sourceSelection === 'B'}
                onChange={(e) => setSourceSelection(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              File B
            </label>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <p>Comparing rows...</p>
        </div>
      )}

      {/* Results */}
      {duplicates.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Found {duplicates.length} Duplicate{duplicates.length !== 1 ? 's' : ''}
            </h3>
            <button
              className="btn btn-success"
              onClick={downloadDuplicates}
            >
              ⬇ Download Duplicates (from File {sourceSelection})
            </button>
          </div>

          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Matching Fields</th>
                  <th style={{ width: '100px' }}>Matches</th>
                  <th style={{ width: '80px' }}>Row A</th>
                  <th style={{ width: '80px' }}>Row B</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((dup, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {dup.matches.slice(0, 4).map((match, mIdx) => (
                          <span
                            key={mIdx}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(33, 150, 243, 0.1)',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              border: '1px solid rgba(33, 150, 243, 0.3)'
                            }}
                          >
                            {String(match.value).substring(0, 20)}
                            {String(match.value).length > 20 && '...'}
                          </span>
                        ))}
                        {dup.matches.length > 4 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            +{dup.matches.length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--success)',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'white'
                      }}>
                        {dup.matches.length}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                      {dup.indexA + 1}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                      {dup.indexB + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fileA && fileB && duplicates.length === 0 && !processing && (dataA && dataB) && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h3>No duplicates found</h3>
          <p>The two files don't share any matching rows with at least 2 common fields including a name</p>
        </div>
      )}
    </div>
  );
}

/**
 * File Drop Zone Component
 */
function FileDropZone({ label, file, data, onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileUpload(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1.2rem' }}>
        {label}
      </h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: isDragging ? 'rgba(33, 150, 243, 0.05)' : 'var(--bg-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => document.getElementById(`file-input-${label}`).click()}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!file ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
              Drop file here or click to browse
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Supports Excel (.xlsx, .xls) and CSV files
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: 'var(--success)' }}>
              {file.name}
            </p>
            {data && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {data.length} row{data.length !== 1 ? 's' : ''} loaded
              </p>
            )}
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={(e) => {
                e.stopPropagation();
                onFileUpload(null);
              }}
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
