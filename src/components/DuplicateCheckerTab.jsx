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
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [removedPotentials, setRemovedPotentials] = useState(new Set());
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

  // Check if a column key looks like a LOC/amount field
  const isLOCColumn = (key) => {
    if (!key) return false;
    const lowerKey = key.toLowerCase();
    return /loc|voucher.*amount|bike.*price|bicycle.*price|bike.*value|voucher.*value|amount|price|cost|value/i.test(lowerKey);
  };

  // Common words to exclude from matching (non-identifying data)
  const COMMON_WORDS = [
    // Frequencies
    'monthly', 'weekly', 'daily', 'quarterly', 'annually', 'fortnightly',
    // Countries
    'uk', 'gb', 'usa', 'us', 'ireland', 'roi', 'england', 'scotland', 'wales',
    // Status/Approval
    'approved', 'pending', 'active', 'inactive', 'yes', 'no', 'true', 'false',
    // Cycle to Work related
    'c2w', 'ctw', 'cycletowork', 'cycle', 'work', 'bike', 'bikes',
    'halfords', 'evans', 'cyclescheme',
    // Generic terms
    'employee', 'staff', 'member', 'person',
    // Common placeholders
    'n/a', 'na', 'none', 'null', 'undefined', '-', 'tbc', 'tbd',
    // Payment/Salary terms
    'salary', 'gross', 'net', 'deduction', 'payment'
  ];

  // Extract meaningful values from a row (skip empty values and common non-identifying fields)
  const extractRowValues = (row) => {
    const values = [];
    const skipColumns = /^(id|index|row|date|timestamp|created|updated|status|approval)/i;

    Object.entries(row).forEach(([key, value]) => {
      // Skip columns that are typically not identifying
      if (skipColumns.test(key)) return;

      const normalized = normalizeValue(value);
      if (normalized && normalized.length > 0) {
        // Skip common non-identifying words
        if (COMMON_WORDS.includes(normalized)) return;

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

    if (valuesA.length === 0 || valuesB.length === 0) return { isDuplicate: false, isPotential: false, matches: [] };

    const matches = [];
    let firstNameMatch = false;
    let surnameMatch = false;
    let locMatchA = null; // Store LOC value from A
    let locMatchB = null; // Store LOC value from B
    let emailMatch = false;

    // Compare each value from A against all values from B
    valuesA.forEach(valA => {
      valuesB.forEach(valB => {
        let isMatch = false;
        let matchValue = valA.original;

        // Check for exact normalized match
        if (valA.normalized === valB.normalized) {
          isMatch = true;
        }
        // Check for partial word matches (for split names)
        else {
          // Split both values into words and normalize
          const wordsA = String(valA.original).toLowerCase().split(/\s+/).filter(w => w.length > 1);
          const wordsB = String(valB.original).toLowerCase().split(/\s+/).filter(w => w.length > 1);

          // Filter out common words before comparing
          const meaningfulWordsA = wordsA.filter(w => !COMMON_WORDS.includes(w));
          const meaningfulWordsB = wordsB.filter(w => !COMMON_WORDS.includes(w));

          // Check if there are matching words between the two values
          const commonWords = meaningfulWordsA.filter(wordA =>
            meaningfulWordsB.some(wordB => wordA === wordB || wordA.includes(wordB) || wordB.includes(wordA))
          );

          // If we have at least 2 common words, consider it a match
          if (commonWords.length >= 2) {
            isMatch = true;
            matchValue = commonWords.join(' ');
          }
          // For names, if we have at least 1 matching word and it looks like a name field
          else if (commonWords.length >= 1 &&
                   (/name|first|last|surname|forename/i.test(valA.key) ||
                    /name|first|last|surname|forename/i.test(valB.key))) {
            isMatch = true;
            matchValue = commonWords.join(' ');
          }
        }

        if (isMatch) {
          matches.push({
            keyA: valA.key,
            keyB: valB.key,
            value: matchValue
          });

          // Check if this is a first name field
          if (/^first|firstname|first.*name|forename/i.test(valA.key) ||
              /^first|firstname|first.*name|forename/i.test(valB.key)) {
            firstNameMatch = true;
          }

          // Check if this is a surname/last name field
          if (/^surname|^last|lastname|last.*name/i.test(valA.key) ||
              /^surname|^last|lastname|last.*name/i.test(valB.key)) {
            surnameMatch = true;
          }

          // Check if this is an email field
          if (/email|e-mail/i.test(valA.key) || /email|e-mail/i.test(valB.key)) {
            emailMatch = true;
          }

          // Check if this looks like a LOC/amount field - expanded detection
          if (isLOCColumn(valA.key) || isLOCColumn(valB.key)) {
            // Verify it's actually a number and store the values
            const numA = parseFloat(String(valA.original).replace(/[£$€,\s]/g, ''));
            const numB = parseFloat(String(valB.original).replace(/[£$€,\s]/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) {
              locMatchA = numA;
              locMatchB = numB;
            }
          }
        }
      });
    });

    // Name match requires both first name AND surname to be matched
    const nameMatch = firstNameMatch && surnameMatch;

    // LOC match requires both values to be found AND equal
    const locMatch = locMatchA !== null && locMatchB !== null && locMatchA === locMatchB;

    // To be a confirmed duplicate, we need:
    // 1. First name + surname match (nameMatch = true)
    // 2. At least one more field: either email OR matching LOC amount
    const isDuplicate = nameMatch && (emailMatch || locMatch);

    // Potential duplicate: name matches but LOC amounts differ (if we found LOC fields)
    const isPotential = nameMatch && locMatchA !== null && locMatchB !== null && locMatchA !== locMatchB;

    return { isDuplicate, isPotential, matches, nameMatch, locMatch, locMatchA, locMatchB };
  };

  // Find duplicates between the two datasets
  const findDuplicates = () => {
    if (!dataA || !dataB) return;

    setProcessing(true);
    const found = [];
    const potentials = [];
    const seenPairs = new Set(); // Track unique pairs to avoid duplicates

    // Compare each row in A against each row in B
    dataA.forEach((rowA, idxA) => {
      dataB.forEach((rowB, idxB) => {
        // Create unique key for this pair
        const pairKey = `${idxA}-${idxB}`;

        // Skip if we've already processed this pair
        if (seenPairs.has(pairKey)) return;

        const comparison = areRowsDuplicates(rowA, rowB);

        if (comparison.isDuplicate) {
          seenPairs.add(pairKey);

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
            sourceRow: sourceSelection === 'A' ? rowA : rowB,
            pairKey
          });
        } else if (comparison.isPotential) {
          seenPairs.add(pairKey);

          const displayMatches = comparison.matches.slice(0, 3);
          const matchSummary = displayMatches.map(m => `${m.value}`).join(', ');

          potentials.push({
            rowA,
            rowB,
            indexA: idxA,
            indexB: idxB,
            matches: comparison.matches,
            matchSummary,
            nameMatch: comparison.nameMatch,
            locMatchA: comparison.locMatchA,
            locMatchB: comparison.locMatchB,
            sourceRow: sourceSelection === 'A' ? rowA : rowB,
            pairKey
          });
        }
      });
    });

    setDuplicates(found);
    setPotentialDuplicates(potentials);
    setRemovedPotentials(new Set()); // Reset removed potentials
    setProcessing(false);
  };

  // Download duplicates as CSV
  const downloadDuplicates = () => {
    if (duplicates.length === 0 && potentialDuplicates.length === 0) return;

    // Get the raw data based on source selection
    // Combine confirmed duplicates and non-removed potential duplicates
    const confirmedDuplicates = duplicates.map(dup => dup.sourceRow);
    const includedPotentials = potentialDuplicates
      .filter(pot => !removedPotentials.has(pot.pairKey))
      .map(pot => pot.sourceRow);

    const allDuplicates = [...confirmedDuplicates, ...includedPotentials];

    if (allDuplicates.length === 0) return;

    // Deduplicate the source rows using a unique identifier
    const uniqueRows = [];
    const seenRowIdentifiers = new Set();

    allDuplicates.forEach(row => {
      // Create a unique identifier for each row based on all its values
      const rowId = Object.keys(row).sort().map(k => `${k}:${row[k]}`).join('|');
      if (!seenRowIdentifiers.has(rowId)) {
        seenRowIdentifiers.add(rowId);
        uniqueRows.push(row);
      }
    });

    // Convert to CSV
    const headers = Object.keys(uniqueRows[0]);
    const csvContent = [
      headers.join(','),
      ...uniqueRows.map(row =>
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

  // Handle removal of potential duplicate
  const handleRemovePotential = (pairKey) => {
    setRemovedPotentials(prev => new Set([...prev, pairKey]));
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
      {(duplicates.length > 0 || potentialDuplicates.length > 0) && (
        <>
          {/* Confirmed Duplicates */}
          {duplicates.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--danger)' }}>
                  ✓ Confirmed Duplicates ({duplicates.length})
                </h3>
              </div>

              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                                  background: 'rgba(220, 53, 69, 0.1)',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  border: '1px solid rgba(220, 53, 69, 0.3)',
                                  color: 'var(--danger)'
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
                            background: 'var(--danger)',
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

          {/* Potential Duplicates */}
          {potentialDuplicates.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--warning)' }}>
                  ⚠ Potential Duplicates ({potentialDuplicates.filter(p => !removedPotentials.has(p.pairKey)).length})
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                  Name matches but LOC amounts differ - click to exclude from download
                </p>
              </div>

              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Matching Fields</th>
                      <th style={{ width: '150px' }}>LOC A / LOC B</th>
                      <th style={{ width: '80px' }}>Row A</th>
                      <th style={{ width: '80px' }}>Row B</th>
                      <th style={{ width: '100px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potentialDuplicates.map((dup, idx) => {
                      const isRemoved = removedPotentials.has(dup.pairKey);
                      return (
                        <tr key={idx} style={{ opacity: isRemoved ? 0.4 : 1 }}>
                          <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {dup.matches.slice(0, 3).map((match, mIdx) => (
                                <span
                                  key={mIdx}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(255, 193, 7, 0.1)',
                                    borderRadius: '4px',
                                    fontSize: '0.875rem',
                                    border: '1px solid rgba(255, 193, 7, 0.3)',
                                    color: 'var(--warning)'
                                  }}
                                >
                                  {String(match.value).substring(0, 20)}
                                  {String(match.value).length > 20 && '...'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                            <div>£{dup.locMatchA?.toFixed(2) || 'N/A'}</div>
                            <div style={{ color: 'var(--text-muted)' }}>vs</div>
                            <div>£{dup.locMatchB?.toFixed(2) || 'N/A'}</div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                            {dup.indexA + 1}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                            {dup.indexB + 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!isRemoved ? (
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleRemovePotential(dup.pairKey)}
                              >
                                Exclude
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Excluded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Download Button */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-success"
              onClick={downloadDuplicates}
              disabled={duplicates.length === 0 && potentialDuplicates.filter(p => !removedPotentials.has(p.pairKey)).length === 0}
            >
              ⬇ Download All Duplicates (from File {sourceSelection})
            </button>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Includes {duplicates.length} confirmed + {potentialDuplicates.filter(p => !removedPotentials.has(p.pairKey)).length} potential duplicates
            </p>
          </div>
        </>
      )}

      {fileA && fileB && duplicates.length === 0 && potentialDuplicates.length === 0 && !processing && (dataA && dataB) && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h3>No duplicates found</h3>
          <p>The two files don't share any matching rows with first name + surname + (email or LOC)</p>
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
