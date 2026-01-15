import { useState } from 'react';
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

  // Handle file upload for side A
  const handleFileUploadA = async (file) => {
    if (!file) return;
    setFileA(file);
    const data = await parseFile(file);
    setDataA(data);
    setDuplicates([]); // Clear previous results
  };

  // Handle file upload for side B
  const handleFileUploadB = async (file) => {
    if (!file) return;
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

  // Normalize a name by removing spaces, converting to lowercase
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

  // Extract full name from a row (handles multiple column combinations)
  const extractFullName = (row) => {
    const keys = Object.keys(row);

    // Try to find first name + surname combination (more flexible patterns)
    const firstNameKey = keys.find(k =>
      /^first|firstname|first.*name|forename|given.*name/i.test(k)
    );
    const surnameKey = keys.find(k =>
      /^surname|^last|lastname|last.*name|family.*name/i.test(k)
    );

    if (firstNameKey && surnameKey) {
      const firstName = String(row[firstNameKey] || '').trim();
      const surname = String(row[surnameKey] || '').trim();
      if (firstName || surname) {
        return `${firstName} ${surname}`.trim();
      }
    }

    // Try to find full name column
    const fullNameKey = keys.find(k =>
      /^name$|full.*name|employee.*name/i.test(k)
    );

    if (fullNameKey) {
      return String(row[fullNameKey] || '').trim();
    }

    return '';
  };

  // Extract LOC amount from a row
  const extractLOC = (row) => {
    const keys = Object.keys(row);

    const locKey = keys.find(k =>
      /loc|amount|value|cost|price/i.test(k)
    );

    return locKey ? String(row[locKey] || '').trim() : '';
  };

  // Find duplicates between the two datasets
  const findDuplicates = () => {
    if (!dataA || !dataB) return;

    setProcessing(true);
    const found = [];

    // Create a map of normalized identifiers from file B
    const mapB = new Map();
    dataB.forEach((rowB, idxB) => {
      const nameB = extractFullName(rowB);
      const locB = extractLOC(rowB);

      // Only require name to be present - LOC can be empty
      if (nameB) {
        const normalizedName = normalizeName(nameB);
        const normalizedLOC = locB ? normalizeLOC(locB) : 'NOLOC';
        const key = `${normalizedName}|${normalizedLOC}`;

        if (!mapB.has(key)) {
          mapB.set(key, []);
        }
        mapB.get(key).push({ row: rowB, index: idxB, name: nameB, loc: locB || 'N/A' });
      }
    });

    // Check each row in file A against the map
    dataA.forEach((rowA, idxA) => {
      const nameA = extractFullName(rowA);
      const locA = extractLOC(rowA);

      // Only require name to be present - LOC can be empty
      if (nameA) {
        const normalizedName = normalizeName(nameA);
        const normalizedLOC = locA ? normalizeLOC(locA) : 'NOLOC';
        const key = `${normalizedName}|${normalizedLOC}`;

        if (mapB.has(key)) {
          const matches = mapB.get(key);
          matches.forEach(matchB => {
            found.push({
              rowA,
              rowB: matchB.row,
              indexA: idxA,
              indexB: matchB.index,
              nameA,
              nameB: matchB.name,
              locA: locA || 'N/A',
              locB: matchB.loc,
              sourceRow: sourceSelection === 'A' ? rowA : matchB.row
            });
          });
        }
      }
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
          justifyContent: 'space-between',
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

          <button
            className="btn btn-primary"
            onClick={findDuplicates}
            disabled={processing || !dataA || !dataB}
            style={{ minWidth: '150px' }}
          >
            {processing ? 'Processing...' : '🔍 Find Duplicates'}
          </button>
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
                  <th>Name (File A)</th>
                  <th>LOC (File A)</th>
                  <th>Name (File B)</th>
                  <th>LOC (File B)</th>
                  <th>Row A</th>
                  <th>Row B</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((dup, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>{dup.nameA}</td>
                    <td>{dup.locA}</td>
                    <td>{dup.nameB}</td>
                    <td>{dup.locB}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Row {dup.indexA + 1}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Row {dup.indexB + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fileA && fileB && duplicates.length === 0 && !processing && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h3>No duplicates found</h3>
          <p>The two files don't share any matching employees (by name and LOC amount)</p>
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
