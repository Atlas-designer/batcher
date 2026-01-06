import { useState, useCallback, useEffect } from 'react';
import { parseFile } from '../utils/fileParser';

/**
 * Entity Finder - Find employee entities from invoice PDFs by searching batch files
 */
export default function EntityFinder() {
  // Employees to search for
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());

  // Manual input mode
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualLocAmount, setManualLocAmount] = useState('');

  // Invoice PDF parsing state
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  // Batch file search
  const [batchFiles, setBatchFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);

  // Output filename
  const [outputFilename, setOutputFilename] = useState('Employee_Entities');

  // Results
  const [foundEmployees, setFoundEmployees] = useState([]);
  const [missingEmployees, setMissingEmployees] = useState([]);
  const [searchComplete, setSearchComplete] = useState(false);

  // Auto-detect column mappings for a file
  const autoDetectColumns = (columns) => {
    const findCol = (variations) => {
      for (const col of columns) {
        const colLower = col.toLowerCase().trim();
        if (variations.some(v => colLower === v || colLower.includes(v))) {
          return col;
        }
      }
      return '';
    };

    return {
      firstNameCol: findCol(['firstname', 'first name', 'first_name', 'forename']),
      lastNameCol: findCol(['lastname', 'last name', 'last_name', 'surname', 'family name']),
      locCol: findCol(['loc amount', 'loc value', 'amount', 'value', 'net price', 'loc']),
      entityCols: [
        findCol(['additional details', 'additional_details', 'entity', 'company', 'employer']),
        '',
        ''
      ]
    };
  };

  /**
   * Parse invoice PDF to extract employee descriptions and LOC amounts
   */
  const handleInvoiceDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files || e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setInvoiceError('Please upload a PDF file');
      return;
    }

    setInvoiceLoading(true);
    setInvoiceError('');

    try {
      const result = await parseFile(file);
      const extractedEmployees = extractEmployeesFromInvoice(result.rawRows);

      if (extractedEmployees.length === 0) {
        setInvoiceError('No employee data found in invoice. Make sure it contains "Description" and "Net Price" columns.');
      } else {
        setEmployees(extractedEmployees);
        setSelectedEmployees(new Set(extractedEmployees.map((_, i) => i)));
      }
    } catch (err) {
      setInvoiceError('Failed to parse invoice: ' + err.message);
    }

    setInvoiceLoading(false);
  }, []);

  /**
   * Extract employees from invoice PDF data
   */
  const extractEmployeesFromInvoice = (rawRows) => {
    const employees = [];

    let descriptionColIndex = -1;
    let netPriceColIndex = -1;
    let headerRowIndex = -1;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase().trim();
        if (cell === 'description' || cell.includes('description')) {
          descriptionColIndex = j;
          headerRowIndex = i;
        }
        if (cell === 'net price' || cell === 'net' || cell === 'netprice' || cell.includes('net price')) {
          netPriceColIndex = j;
        }
      }

      if (descriptionColIndex !== -1 && netPriceColIndex !== -1) break;
    }

    if (descriptionColIndex === -1 || netPriceColIndex === -1) {
      return [];
    }

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;

      const description = String(row[descriptionColIndex] || '').trim();
      const netPrice = String(row[netPriceColIndex] || '').trim();

      if (!description || !netPrice) continue;
      if (description.toLowerCase().includes('total') || description.toLowerCase().includes('subtotal')) continue;

      const nameParts = parseNameFromDescription(description);
      const locAmount = parseLocAmount(netPrice);

      if (locAmount > 0) {
        employees.push({
          description,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          locAmount,
          raw: description
        });
      }
    }

    return employees;
  };

  /**
   * Parse name from description field
   */
  const parseNameFromDescription = (description) => {
    const words = description.split(/[\s,\-\/]+/).filter(w => w.length > 1);
    const nameWords = words.filter(w => /^[A-Za-z]+$/.test(w));

    if (nameWords.length >= 2) {
      return { firstName: nameWords[0], lastName: nameWords[1] };
    } else if (nameWords.length === 1) {
      return { firstName: nameWords[0], lastName: '' };
    }

    return { firstName: '', lastName: '', rawIdentifier: description };
  };

  /**
   * Parse LOC amount from string
   */
  const parseLocAmount = (value) => {
    if (!value) return 0;
    const cleaned = String(value).replace(/[£$€,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  };

  /**
   * Add manual employee entry
   */
  const handleAddManual = () => {
    if (!manualFirstName.trim() && !manualLastName.trim()) return;
    if (!manualLocAmount.trim()) return;

    const newEmployee = {
      description: `${manualFirstName} ${manualLastName}`.trim(),
      firstName: manualFirstName.trim(),
      lastName: manualLastName.trim(),
      locAmount: parseLocAmount(manualLocAmount),
      isManual: true
    };

    const newIndex = employees.length;
    setEmployees(prev => [...prev, newEmployee]);
    setSelectedEmployees(prev => new Set([...prev, newIndex]));

    setManualFirstName('');
    setManualLastName('');
    setManualLocAmount('');
  };

  /**
   * Toggle employee selection
   */
  const toggleEmployeeSelection = (index) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  /**
   * Select/deselect all employees
   */
  const toggleSelectAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((_, i) => i)));
    }
  };

  /**
   * Handle batch file drop
   */
  const handleBatchDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files || e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = [];

    for (const file of files) {
      try {
        const result = await parseFile(file);
        const columns = result.rawRows[0]?.map((h, idx) =>
          String(h || '').trim() || `Column ${idx + 1}`
        ) || [];

        // Auto-detect column mappings
        const detected = autoDetectColumns(columns);

        newFiles.push({
          name: file.name,
          rawRows: result.rawRows,
          columns,
          searched: false,
          // Per-file column configuration
          firstNameCol: detected.firstNameCol,
          lastNameCol: detected.lastNameCol,
          locCol: detected.locCol,
          entityCols: detected.entityCols
        });
      } catch (err) {
        console.error('Failed to parse batch file:', file.name, err);
      }
    }

    setBatchFiles(prev => {
      const updated = [...prev, ...newFiles];
      // Auto-select first file if none selected
      if (selectedFileIndex === -1 && updated.length > 0) {
        setSelectedFileIndex(prev.length); // Select first new file
      }
      return updated;
    });
  }, [selectedFileIndex]);

  /**
   * Remove a batch file
   */
  const removeBatchFile = (index) => {
    setBatchFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Adjust selected index
      if (selectedFileIndex === index) {
        setSelectedFileIndex(updated.length > 0 ? 0 : -1);
      } else if (selectedFileIndex > index) {
        setSelectedFileIndex(selectedFileIndex - 1);
      }
      return updated;
    });
  };

  /**
   * Update column config for selected file
   */
  const updateFileConfig = (field, value) => {
    if (selectedFileIndex === -1) return;
    setBatchFiles(prev => {
      const updated = [...prev];
      updated[selectedFileIndex] = { ...updated[selectedFileIndex], [field]: value };
      return updated;
    });
  };

  /**
   * Update entity column for selected file
   */
  const updateEntityCol = (entityIndex, value) => {
    if (selectedFileIndex === -1) return;
    setBatchFiles(prev => {
      const updated = [...prev];
      const entityCols = [...updated[selectedFileIndex].entityCols];
      entityCols[entityIndex] = value;
      updated[selectedFileIndex] = { ...updated[selectedFileIndex], entityCols };
      return updated;
    });
  };

  /**
   * Search batch files for employees
   */
  const handleSearch = async () => {
    if (selectedEmployees.size === 0) return;
    if (batchFiles.length === 0) return;

    setSearchLoading(true);
    const newFound = [...foundEmployees];
    const stillMissing = [];

    const foundIds = new Set(foundEmployees.map(f => f.originalIndex));
    const employeesToSearch = employees
      .map((emp, index) => ({ ...emp, originalIndex: index }))
      .filter(emp => selectedEmployees.has(emp.originalIndex) && !foundIds.has(emp.originalIndex));

    for (const batchFile of batchFiles) {
      if (batchFile.searched) continue;

      const columns = batchFile.columns;
      const firstNameColIdx = columns.indexOf(batchFile.firstNameCol);
      const lastNameColIdx = columns.indexOf(batchFile.lastNameCol);
      const locColIdx = columns.indexOf(batchFile.locCol);

      for (let rowIdx = 1; rowIdx < batchFile.rawRows.length; rowIdx++) {
        const row = batchFile.rawRows[rowIdx];
        if (!row) continue;

        const rowFirstName = firstNameColIdx !== -1 ? String(row[firstNameColIdx] || '').toLowerCase().trim() : '';
        const rowLastName = lastNameColIdx !== -1 ? String(row[lastNameColIdx] || '').toLowerCase().trim() : '';
        const rowLoc = locColIdx !== -1 ? parseLocAmount(row[locColIdx]) : 0;

        for (const emp of employeesToSearch) {
          if (foundIds.has(emp.originalIndex)) continue;

          const empFirstName = emp.firstName.toLowerCase().trim();
          const empLastName = emp.lastName.toLowerCase().trim();
          const empLoc = emp.locAmount;

          let nameMatch = false;
          let locMatch = Math.abs(rowLoc - empLoc) < 0.01;

          if (empFirstName && empLastName) {
            nameMatch = rowFirstName === empFirstName && rowLastName === empLastName;
          } else if (empFirstName || empLastName) {
            nameMatch = rowFirstName === empFirstName || rowLastName === empLastName ||
              rowFirstName === empLastName || rowLastName === empFirstName;
          }

          if (nameMatch && locMatch) {
            const entities = [];
            batchFile.entityCols.forEach((colName) => {
              if (colName) {
                const colIdx = columns.indexOf(colName);
                if (colIdx !== -1) {
                  const value = String(row[colIdx] || '').trim();
                  if (value) entities.push(value);
                }
              }
            });

            newFound.push({
              ...emp,
              entities,
              foundInFile: batchFile.name,
              rowData: row.map(c => String(c || '').trim())
            });
            foundIds.add(emp.originalIndex);
          }
        }
      }

      batchFile.searched = true;
    }

    employeesToSearch.forEach(emp => {
      if (!foundIds.has(emp.originalIndex)) {
        stillMissing.push(emp);
      }
    });

    setFoundEmployees(newFound);
    setMissingEmployees(stillMissing);
    setSearchComplete(true);
    setSearchLoading(false);
  };

  /**
   * Download found employees as CSV file
   */
  const handleDownload = () => {
    if (foundEmployees.length === 0) return;

    const headers = ['First Name', 'Last Name', 'Entity'];
    const rows = foundEmployees.map(emp => {
      const entityCombined = emp.entities.filter(e => e).join('/');
      return [
        emp.firstName || '',
        emp.lastName || '',
        entityCombined
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputFilename || 'Employee_Entities'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Reset everything
   */
  const handleReset = () => {
    setEmployees([]);
    setSelectedEmployees(new Set());
    setBatchFiles([]);
    setSelectedFileIndex(-1);
    setFoundEmployees([]);
    setMissingEmployees([]);
    setSearchComplete(false);
    setInvoiceError('');
    setOutputFilename('Employee_Entities');
  };

  /**
   * Clear only batch files and search results
   */
  const handleClearBatchFiles = () => {
    setBatchFiles(prev => prev.map(f => ({ ...f, searched: false })));
    setSearchComplete(false);
  };

  const selectedFile = selectedFileIndex >= 0 ? batchFiles[selectedFileIndex] : null;

  return (
    <div className="entity-finder">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>&#128269;</span>
              Entity Finder
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Find employee entities by matching invoice data against batch files.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Output filename:</label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="Employee_Entities"
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                width: '200px'
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>.csv</span>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Left Column: Employee Input */}
        <div>
          {/* Invoice PDF Upload */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
              1. Input Employees to Find
            </h3>

            <div
              onDrop={handleInvoiceDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('invoice-input').click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '1rem',
                background: 'var(--bg)',
                transition: 'border-color 0.2s'
              }}
            >
              <input
                id="invoice-input"
                type="file"
                accept=".pdf"
                onChange={handleInvoiceDrop}
                style={{ display: 'none' }}
              />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {invoiceLoading ? 'Processing invoice...' : 'Drop invoice PDF here or click to browse'}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Will extract from "Description" and "Net Price" columns
              </p>
            </div>

            {invoiceError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: 'var(--danger)',
                fontSize: '0.875rem'
              }}>
                {invoiceError}
              </div>
            )}

            {/* Manual Input */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                Or add employees manually:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={manualFirstName}
                  onChange={(e) => setManualFirstName(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={manualLastName}
                  onChange={(e) => setManualLastName(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="LOC Amount (e.g. 1200.00)"
                  value={manualLocAmount}
                  onChange={(e) => setManualLocAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddManual}
                  disabled={(!manualFirstName.trim() && !manualLastName.trim()) || !manualLocAmount.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Employee List */}
          {employees.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>
                  Employees to Find ({selectedEmployees.size}/{employees.length} selected)
                </h3>
                <button
                  className="btn btn-secondary"
                  onClick={toggleSelectAll}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {selectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {employees.map((emp, idx) => {
                  const isFound = foundEmployees.some(f => f.originalIndex === idx);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--border)',
                        background: isFound ? 'rgba(22, 163, 74, 0.1)' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(idx)}
                        onChange={() => toggleEmployeeSelection(idx)}
                        disabled={isFound}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>
                          {emp.firstName} {emp.lastName}
                          {emp.isManual && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(manual)</span>}
                          {isFound && <span style={{ color: 'var(--success)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Found!</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          LOC: {emp.locAmount.toFixed(2)}
                          {emp.raw && emp.raw !== `${emp.firstName} ${emp.lastName}` && ` | ${emp.raw}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Batch Files & Search */}
        <div>
          {/* Batch File Upload */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
              2. Add Batch Files to Search
            </h3>

            <div
              onDrop={handleBatchDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('batch-input').click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg)',
                transition: 'border-color 0.2s'
              }}
            >
              <input
                id="batch-input"
                type="file"
                accept=".csv,.xls,.xlsx"
                multiple
                onChange={handleBatchDrop}
                style={{ display: 'none' }}
              />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Drop batch files here or click to browse
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports CSV, XLS, XLSX (multiple files allowed)
              </p>
            </div>

            {/* Batch file list */}
            {batchFiles.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {batchFiles.length} file(s) loaded - click to configure:
                </p>
                {batchFiles.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFileIndex(idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      background: selectedFileIndex === idx ? 'var(--primary)' : 'var(--bg)',
                      color: selectedFileIndex === idx ? 'white' : 'inherit',
                      borderRadius: '0.25rem',
                      marginBottom: '0.25rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span>
                      {file.name}
                      {file.searched && <span style={{ color: selectedFileIndex === idx ? 'white' : 'var(--success)', marginLeft: '0.5rem' }}>&#10003;</span>}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBatchFile(idx); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: selectedFileIndex === idx ? 'white' : 'var(--danger)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        fontSize: '1rem'
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column Configuration for Selected File */}
          {selectedFile && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                3. Configure: {selectedFile.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Set which columns to use for matching and entity extraction
              </p>

              {/* Name and LOC columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    First Name Column
                  </label>
                  <select
                    value={selectedFile.firstNameCol}
                    onChange={(e) => updateFileConfig('firstNameCol', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- Select --</option>
                    {selectedFile.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Last Name Column
                  </label>
                  <select
                    value={selectedFile.lastNameCol}
                    onChange={(e) => updateFileConfig('lastNameCol', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- Select --</option>
                    {selectedFile.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    LOC Amount Column
                  </label>
                  <select
                    value={selectedFile.locCol}
                    onChange={(e) => updateFileConfig('locCol', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- Select --</option>
                    {selectedFile.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Entity columns */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Entity Columns (up to 3, separated by / in output)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[0, 1, 2].map(idx => (
                    <select
                      key={idx}
                      value={selectedFile.entityCols[idx]}
                      onChange={(e) => updateEntityCol(idx, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Entity {idx + 1}</option>
                      {selectedFile.columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={selectedEmployees.size === 0 || batchFiles.length === 0 || searchLoading}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {searchLoading ? 'Searching...' : `Search for ${selectedEmployees.size} Employee(s)`}
            </button>
          </div>

          {/* Results */}
          {searchComplete && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                Search Results
              </h3>

              {foundEmployees.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Found ({foundEmployees.length}):
                  </h4>
                  {foundEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(22, 163, 74, 0.1)',
                        borderRadius: '0.25rem',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>
                        {emp.firstName} {emp.lastName} {emp.entities.length > 0 ? emp.entities.join('/') : '(no entity data)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Found in: {emp.foundInFile}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {missingEmployees.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Not Found ({missingEmployees.length}):
                  </h4>
                  {missingEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '0.25rem',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {emp.firstName} {emp.lastName} (LOC: {emp.locAmount.toFixed(2)})
                    </div>
                  ))}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Add more batch files and search again to find remaining employees.
                  </p>
                </div>
              )}

              {foundEmployees.length === 0 && missingEmployees.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>
                  Cannot locate requested employees
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {foundEmployees.length > 0 && (
                  <button className="btn btn-primary" onClick={handleDownload}>
                    Download Employee Entities
                  </button>
                )}
                <button className="btn btn-secondary" onClick={handleClearBatchFiles}>
                  Add More Files
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
