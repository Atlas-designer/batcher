import { useState, useCallback } from 'react';
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
  const [entityColumns, setEntityColumns] = useState(['', '', '']); // Up to 3 entity columns
  const [availableColumns, setAvailableColumns] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Results
  const [foundEmployees, setFoundEmployees] = useState([]);
  const [missingEmployees, setMissingEmployees] = useState([]);
  const [searchComplete, setSearchComplete] = useState(false);

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
   * Looks for Description and Net Price columns
   */
  const extractEmployeesFromInvoice = (rawRows) => {
    const employees = [];

    // Find the row with Description and Net Price headers
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

    // Extract data rows after header
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;

      const description = String(row[descriptionColIndex] || '').trim();
      const netPrice = String(row[netPriceColIndex] || '').trim();

      // Skip empty rows or totals
      if (!description || !netPrice) continue;
      if (description.toLowerCase().includes('total') || description.toLowerCase().includes('subtotal')) continue;

      // Parse name from description (could be "FirstName LastName" or agreement number)
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
   * Could be "FirstName LastName", agreement number, or payroll number
   */
  const parseNameFromDescription = (description) => {
    // Try to extract name (words that look like names)
    const words = description.split(/[\s,\-\/]+/).filter(w => w.length > 1);

    // Check if first two words look like a name (alphabetic)
    const nameWords = words.filter(w => /^[A-Za-z]+$/.test(w));

    if (nameWords.length >= 2) {
      return {
        firstName: nameWords[0],
        lastName: nameWords[1]
      };
    } else if (nameWords.length === 1) {
      return {
        firstName: nameWords[0],
        lastName: ''
      };
    }

    return {
      firstName: '',
      lastName: '',
      rawIdentifier: description
    };
  };

  /**
   * Parse LOC amount from string
   */
  const parseLocAmount = (value) => {
    if (!value) return 0;
    // Remove currency symbols and commas
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

    // Clear inputs
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
    const allColumns = new Set(availableColumns);

    for (const file of files) {
      try {
        const result = await parseFile(file);
        // Get columns from first row (assuming it's headers)
        const columns = result.rawRows[0]?.map((h, idx) =>
          String(h || '').trim() || `Column ${idx + 1}`
        ) || [];

        columns.forEach(c => allColumns.add(c));

        newFiles.push({
          name: file.name,
          rawRows: result.rawRows,
          columns,
          searched: false
        });
      } catch (err) {
        console.error('Failed to parse batch file:', file.name, err);
      }
    }

    setBatchFiles(prev => [...prev, ...newFiles]);
    setAvailableColumns(Array.from(allColumns));
  }, [availableColumns]);

  /**
   * Remove a batch file
   */
  const removeBatchFile = (index) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
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

    // Get employees to search for (only selected ones that aren't already found)
    const foundIds = new Set(foundEmployees.map(f => f.originalIndex));
    const employeesToSearch = employees
      .map((emp, index) => ({ ...emp, originalIndex: index }))
      .filter(emp => selectedEmployees.has(emp.originalIndex) && !foundIds.has(emp.originalIndex));

    // Search each batch file
    for (const batchFile of batchFiles) {
      if (batchFile.searched) continue;

      const columns = batchFile.columns;

      // Find first name and last name column indices
      const firstNameColIdx = findColumnIndex(columns, ['firstname', 'first name', 'first_name', 'forename']);
      const lastNameColIdx = findColumnIndex(columns, ['lastname', 'last name', 'last_name', 'surname', 'family name']);
      const locColIdx = findColumnIndex(columns, ['loc amount', 'loc value', 'amount', 'value', 'net price', 'loc']);

      // Search data rows (skip header row)
      for (let rowIdx = 1; rowIdx < batchFile.rawRows.length; rowIdx++) {
        const row = batchFile.rawRows[rowIdx];
        if (!row) continue;

        const rowFirstName = String(row[firstNameColIdx] || '').toLowerCase().trim();
        const rowLastName = String(row[lastNameColIdx] || '').toLowerCase().trim();
        const rowLoc = parseLocAmount(row[locColIdx]);

        // Try to match against employees
        for (const emp of employeesToSearch) {
          if (foundIds.has(emp.originalIndex)) continue;

          const empFirstName = emp.firstName.toLowerCase().trim();
          const empLastName = emp.lastName.toLowerCase().trim();
          const empLoc = emp.locAmount;

          // Match criteria: names match (not case sensitive) AND LOC matches
          let nameMatch = false;
          let locMatch = Math.abs(rowLoc - empLoc) < 0.01; // Allow tiny float differences

          if (empFirstName && empLastName) {
            // Full name search
            nameMatch = rowFirstName === empFirstName && rowLastName === empLastName;
          } else if (empFirstName || empLastName) {
            // Partial name search
            nameMatch = rowFirstName === empFirstName || rowLastName === empLastName ||
              rowFirstName === empLastName || rowLastName === empFirstName;
          }

          if (nameMatch && locMatch) {
            // Found! Extract entity columns
            const entities = [];
            entityColumns.forEach((colName, idx) => {
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

      // Mark file as searched
      batchFile.searched = true;
    }

    // Update missing list
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
   * Find column index by common name variations
   */
  const findColumnIndex = (columns, variations) => {
    for (let i = 0; i < columns.length; i++) {
      const colName = columns[i].toLowerCase().trim();
      if (variations.some(v => colName === v || colName.includes(v))) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Download found employees as CSV file
   */
  const handleDownload = () => {
    if (foundEmployees.length === 0) return;

    // Build CSV with headers: First Name, Last Name, Entity (combined with /)
    const headers = ['First Name', 'Last Name', 'Entity'];
    const rows = foundEmployees.map(emp => {
      // Join entities with / (only include non-empty ones)
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
    a.download = 'Employee_Entities.csv';
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
    setFoundEmployees([]);
    setMissingEmployees([]);
    setSearchComplete(false);
    setEntityColumns(['', '', '']);
    setAvailableColumns([]);
    setInvoiceError('');
  };

  /**
   * Clear only batch files and search results (to add more files)
   */
  const handleClearBatchFiles = () => {
    setBatchFiles([]);
    setSearchComplete(false);
    // Keep found and missing for reference
  };

  return (
    <div className="entity-finder">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>&#128269;</span>
          Entity Finder
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Find employee entities by matching invoice data against batch files.
        </p>
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

            {/* Invoice Drop Zone */}
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
                  {batchFiles.length} file(s) loaded:
                </p>
                {batchFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.25rem 0.5rem',
                      background: 'var(--bg)',
                      borderRadius: '0.25rem',
                      marginBottom: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <span>
                      {file.name}
                      {file.searched && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>&#10003;</span>}
                    </span>
                    <button
                      onClick={() => removeBatchFile(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entity Column Selection */}
          {availableColumns.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                3. Select Entity Columns (up to 3)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                These columns will be extracted for matched employees (separated by /)
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[0, 1, 2].map(idx => (
                  <select
                    key={idx}
                    value={entityColumns[idx]}
                    onChange={(e) => {
                      const newCols = [...entityColumns];
                      newCols[idx] = e.target.value;
                      setEntityColumns(newCols);
                    }}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <option value="">Entity {idx + 1} (optional)</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                ))}
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
