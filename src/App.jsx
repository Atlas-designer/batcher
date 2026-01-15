import { useState, useEffect } from 'react';
import Login, { isAuthenticated, logout } from './components/Login';
import FileUploader from './components/FileUploader';
import DataConfigurator from './components/DataConfigurator';
import DataPreview from './components/DataPreview';
import ProcessEditor from './components/ProcessEditor';
import OutputPreview from './components/OutputPreview';
import ProcessManager from './components/ProcessManager';
import ImportDialog from './components/ImportDialog';
import AdminAdam from './components/AdminAdam';
import EntityFinder from './components/EntityFinder';
import DuplicateCheckerTab from './components/DuplicateCheckerTab';
import InfoGuide from './components/InfoGuide';
import { parseFile, parseAndCombinePDFs } from './utils/fileParser';
import { extractCompanyAndEntity, generateOutputFilename } from './utils/filenameParser';
import { applyMapping, downloadCSV, OUTPUT_COLUMNS } from './utils/outputFormatter';
import { getErrorRowNumbers } from './utils/validation';
import {
  getAllProcesses,
  saveProcess,
  updateProcess,
  deleteProcess,
  findProcessByCompany,
  linkCompanyToProcess
} from './services/processStore';

// App steps
const STEPS = {
  UPLOAD: 'upload',
  CONFIGURE: 'configure',  // New step for row/date config
  MAPPING: 'mapping',
  PREVIEW: 'preview'
};

// Manual Batch Mode Component
function ManualBatchMode() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [outputFilename, setOutputFilename] = useState('Manual_Batch');
  const [applyToAllField, setApplyToAllField] = useState('email');
  const [applyToAllValue, setApplyToAllValue] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    locAmount: '',
    email: '',
    additionalDetails: ''
  });
  const [pasteError, setPasteError] = useState('');

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEmployee = () => {
    if (!form.firstName.trim() || !form.surname.trim() || !form.locAmount.trim()) {
      return; // Required fields
    }
    setEmployees(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({
      firstName: '',
      surname: '',
      locAmount: '',
      email: '',
      additionalDetails: ''
    });
  };

  const handleRemoveEmployee = (id) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  const handleUpdateEmployee = (id, field, value) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const handleApplyToAll = () => {
    if (!applyToAllValue.trim()) return;
    setEmployees(prev => prev.map(emp => ({
      ...emp,
      [applyToAllField]: applyToAllValue
    })));
    setApplyToAllValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmployee();
    }
  };

  // Check if a value looks like an email
  const isEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  // Check if a value looks like a LOC amount (number, possibly with currency symbols)
  const isLOCAmount = (val) => {
    const cleaned = String(val).replace(/[£$€,\s]/g, '');
    const num = parseFloat(cleaned);
    return !isNaN(num) && num > 0 && num < 100000; // Reasonable LOC range
  };

  // Check if a value looks like a name (letters, possibly hyphens/apostrophes)
  const isName = (val) => {
    return /^[A-Za-z][A-Za-z'-]*$/.test(val) && val.length >= 2;
  };

  // Parse pasted data from Excel/CSV - smart detection
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText.trim()) return;

    setPasteError('');
    const lines = pastedText.split(/\r?\n/).filter(line => line.trim());
    const newEmployees = [];
    const errors = [];

    // Check if first line looks like headers
    let startIdx = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('firstname') || firstLine.includes('first name') ||
        firstLine.includes('surname') || firstLine.includes('email') ||
        firstLine.includes('loc') || firstLine.includes('amount')) {
      startIdx = 1; // Skip header row
    }

    for (let idx = startIdx; idx < lines.length; idx++) {
      const line = lines[idx];
      // Try tab-separated first (Excel), then comma-separated (CSV)
      let parts = line.split('\t').map(p => p.trim());
      if (parts.length < 2) {
        parts = line.split(',').map(p => p.trim());
      }

      // Smart detection: find firstName, surname, email, LOC amount from any column order
      let firstName = '';
      let surname = '';
      let email = '';
      let locAmount = '';
      const foundNames = [];

      for (const part of parts) {
        if (!part) continue;

        if (!email && isEmail(part)) {
          email = part;
        } else if (!locAmount && isLOCAmount(part)) {
          locAmount = String(part).replace(/[£$€,]/g, '');
        } else if (isName(part) && foundNames.length < 2) {
          foundNames.push(part);
        }
      }

      // Assign names
      if (foundNames.length >= 2) {
        firstName = foundNames[0];
        surname = foundNames[1];
      } else if (foundNames.length === 1) {
        // Only one name found - might be in "First Last" format in one cell
        // Check if any part contains a space and has multiple words
        for (const part of parts) {
          if (part && part.includes(' ')) {
            const words = part.split(/\s+/).filter(w => isName(w));
            if (words.length >= 2) {
              firstName = words[0];
              surname = words.slice(1).join(' ');
              break;
            }
          }
        }
        // If still not found, use the single name as first name
        if (!firstName) {
          firstName = foundNames[0];
        }
      }

      if (firstName && locAmount) {
        newEmployees.push({
          id: Date.now() + idx,
          firstName,
          surname: surname || '',
          locAmount,
          email: email || '',
          additionalDetails: ''
        });
      } else {
        // Only show error if we found some data but not enough
        if (parts.length > 1) {
          const missing = [];
          if (!firstName) missing.push('name');
          if (!locAmount) missing.push('LOC amount');
          errors.push(`Row ${idx + 1 - startIdx}: Could not find ${missing.join(' or ')}`);
        }
      }
    }

    if (newEmployees.length > 0) {
      setEmployees(prev => [...prev, ...newEmployees]);
    }

    if (errors.length > 0 && newEmployees.length === 0) {
      setPasteError(`Could not import data:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
    } else if (errors.length > 0) {
      setPasteError(`Imported ${newEmployees.length} rows. Some rows skipped:\n${errors.slice(0, 2).join('\n')}${errors.length > 2 ? `\n...and ${errors.length - 2} more` : ''}`);
    }
  };

  // Clean LOC Amount for output
  const cleanLOCAmount = (value) => {
    const cleaned = String(value).replace(/[£$€,]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num.toFixed(2);
  };

  // Sanitize string
  const sanitizeString = (value) => {
    if (!value) return '';
    return String(value).replace(/[,'"'`]/g, '').replace(/\s+/g, ' ').trim();
  };

  // Generate and download batch file
  const handleDownload = () => {
    if (employees.length === 0) return;

    // Build output data matching OUTPUT_COLUMNS format
    const outputData = employees.map(emp => ({
      'Firstname': sanitizeString(emp.firstName),
      'Surname': sanitizeString(emp.surname),
      'Street1': '',
      'Street2': '',
      'City': '',
      'County': '',
      'Postcode': '',
      'Country': 'UK',
      'LOC Amount': cleanLOCAmount(emp.locAmount),
      'Email': sanitizeString(emp.email),
      'Pay Frequency': 'Monthly',
      'Additional Details': sanitizeString(emp.additionalDetails),
      'Date of Approval': ''
    }));

    // Generate CSV
    const headers = ['Firstname', 'Surname', 'Street1', 'Street2', 'City', 'County', 'Postcode', 'Country', 'LOC Amount', 'Email', 'Pay Frequency', 'Additional Details', 'Date of Approval'];
    const escapeCSV = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.join(','),
      ...outputData.map(row => headers.map(h => escapeCSV(row[h])).join(','))
    ];
    const csvContent = csvLines.join('\r\n') + '\r\n';

    // Download with custom filename
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const baseName = outputFilename.trim() || 'Manual_Batch';
    const filename = `${baseName} ${day}.${month}.${year}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    setEmployees([]);
    setPasteError('');
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '0.5rem 0',
          fontSize: '1rem',
          fontWeight: '500',
          color: 'var(--text)'
        }}
      >
        <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        Manual Batch Mode
        {employees.length > 0 && (
          <span style={{
            background: 'var(--primary)',
            color: 'white',
            borderRadius: '50%',
            width: '1.5rem',
            height: '1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem'
          }}>
            {employees.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          {/* Input Form */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                First Name *
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="John"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Surname *
              </label>
              <input
                type="text"
                value={form.surname}
                onChange={(e) => handleInputChange('surname', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Smith"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                LOC Amount *
              </label>
              <input
                type="text"
                value={form.locAmount}
                onChange={(e) => handleInputChange('locAmount', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="1000.00"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Additional Details
              </label>
              <input
                type="text"
                value={form.additionalDetails}
                onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Optional notes"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleAddEmployee}
                disabled={!form.firstName.trim() || !form.surname.trim() || !form.locAmount.trim()}
                style={{ width: '100%' }}
              >
                Add Employee
              </button>
            </div>
          </div>

          {/* Paste Area */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Paste from Excel/CSV (First Name, Surname, LOC Amount, Email, Additional Details)
            </label>
            <textarea
              onPaste={handlePaste}
              placeholder="Paste data here... (Tab or comma separated)&#10;John	Smith	1000.00	john@example.com&#10;Jane	Doe	1500.00	jane@example.com"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
            />
            {pasteError && (
              <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
                {pasteError}
              </p>
            )}
          </div>

          {/* Employee List */}
          {employees.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>Employees ({employees.length})</h4>
                <button
                  className="btn btn-secondary"
                  onClick={handleClearAll}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  Clear All
                </button>
              </div>
              <div style={{
                maxHeight: '400px',
                overflow: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem'
              }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>First Name</th>
                      <th>Surname</th>
                      <th>LOC Amount</th>
                      <th>Email</th>
                      <th>Additional Details</th>
                      <th style={{ width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <input
                            type="text"
                            value={emp.firstName}
                            onChange={(e) => handleUpdateEmployee(emp.id, 'firstName', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid transparent',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem',
                              background: 'transparent'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={emp.surname}
                            onChange={(e) => handleUpdateEmployee(emp.id, 'surname', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid transparent',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem',
                              background: 'transparent'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={emp.locAmount}
                            onChange={(e) => handleUpdateEmployee(emp.id, 'locAmount', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid transparent',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem',
                              background: 'transparent'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={emp.email}
                            onChange={(e) => handleUpdateEmployee(emp.id, 'email', e.target.value)}
                            placeholder="-"
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid transparent',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem',
                              background: 'transparent'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={emp.additionalDetails}
                            onChange={(e) => handleUpdateEmployee(emp.id, 'additionalDetails', e.target.value)}
                            placeholder="-"
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid transparent',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem',
                              background: 'transparent'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveEmployee(emp.id)}
                            style={{
                              background: 'var(--error)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Apply to All Section */}
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg)',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)'
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Apply value to all employees:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={applyToAllField}
                    onChange={(e) => setApplyToAllField(e.target.value)}
                    style={{
                      padding: '0.375rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="firstName">First Name</option>
                    <option value="surname">Surname</option>
                    <option value="email">Email</option>
                    <option value="additionalDetails">Additional Details</option>
                  </select>
                  <input
                    type="text"
                    value={applyToAllValue}
                    onChange={(e) => setApplyToAllValue(e.target.value)}
                    placeholder="Enter value..."
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      padding: '0.375rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem'
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleApplyToAll}
                    disabled={!applyToAllValue.trim()}
                    style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  >
                    Apply to All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Output Filename & Download */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}>
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Output Filename
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="Manual_Batch"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  .csv
                </span>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={employees.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>Download Batch File</span>
              {employees.length > 0 && <span>({employees.length} employees)</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Auth state
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  // Navigation
  const [currentTab, setCurrentTab] = useState('process');
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);

  // File data
  const [sourceFile, setSourceFile] = useState(null);
  const [rawRows, setRawRows] = useState(null);  // Raw data from file
  const [sourceData, setSourceData] = useState(null);  // Processed data
  const [sourceColumns, setSourceColumns] = useState([]);
  const [headerInfoRows, setHeaderInfoRows] = useState([]);  // Pre-applicant rows for mapping
  const [dataConfig, setDataConfig] = useState(null);  // Row/date configuration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Process selection in mapping step
  const [selectedProcessId, setSelectedProcessId] = useState('');

  // Company detection
  const [detectedCompany, setDetectedCompany] = useState('');
  const [detectedEntity, setDetectedEntity] = useState('');
  const [matchedProcess, setMatchedProcess] = useState(null);

  // Mapping
  const [currentMapping, setCurrentMapping] = useState(null);

  // Output
  const [outputData, setOutputData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [outputFilename, setOutputFilename] = useState('');

  // Live preview during mapping
  const [livePreviewData, setLivePreviewData] = useState(null);

  // Saved processes
  const [processes, setProcesses] = useState([]);
  const [processesLoading, setProcessesLoading] = useState(true);

  // Editing process
  const [editingProcess, setEditingProcess] = useState(null);

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState(null);

  // File queue for multiple file uploads
  const [fileQueue, setFileQueue] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Load saved processes on mount
  useEffect(() => {
    if (authenticated) {
      loadProcesses();
    }
  }, [authenticated]);

  const loadProcesses = async () => {
    setProcessesLoading(true);
    try {
      const loaded = await getAllProcesses();
      setProcesses(loaded);
    } catch (err) {
      console.error('Failed to load processes:', err);
    }
    setProcessesLoading(false);
  };

  // Handle file selection (supports multiple files)
  const handleFileSelect = async (files) => {
    // Convert to array if single file
    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length > 1) {
      // Multiple files - set up queue
      setFileQueue(fileArray);
      setCurrentFileIndex(0);
      await processFile(fileArray[0]);
    } else {
      // Single file
      setFileQueue([]);
      setCurrentFileIndex(0);
      await processFile(fileArray[0]);
    }
  };

  // Process a single file
  const processFile = async (file) => {
    setLoading(true);
    setError('');
    setSourceFile(file);
    setMatchedProcess(null);
    setCurrentMapping(null);
    setOutputData(null);
    setLivePreviewData(null);
    setDataConfig(null);

    try {
      // Extract company name and entity from filename first
      const { company, entity } = extractCompanyAndEntity(file.name);
      setDetectedCompany(company);
      setDetectedEntity(entity);

      // Try to parse the file
      const result = await parseFile(file);
      setRawRows(result.rawRows);

      // Try to find a matching process early to get saved startRow
      const earlyMatch = await findProcessByCompany(company);
      if (earlyMatch) {
        setMatchedProcess(earlyMatch);
        setSelectedProcessId(earlyMatch.id);
      }

      // Go to configure step
      setCurrentStep(STEPS.CONFIGURE);
    } catch (err) {
      setError(err.message || 'Failed to parse file');
      console.error('File parsing error:', err);
    }

    setLoading(false);
  };

  // Handle combining multiple files (combination mode)
  const handleCombineFiles = async (files) => {
    setLoading(true);
    setError('');
    setSourceFile({ name: `Combined (${files.length} files)`, isCombined: true });
    setMatchedProcess(null);
    setCurrentMapping(null);
    setOutputData(null);
    setLivePreviewData(null);
    setDataConfig(null);
    setFileQueue([]);
    setCurrentFileIndex(0);

    try {
      // Parse and combine all files
      const result = await parseAndCombinePDFs(files);

      if (result.errors && result.errors.length > 0) {
        const errorList = result.errors.map(e => `${e.file}: ${e.error}`).join('\n');
        console.warn('Some files had errors:', errorList);
      }

      setRawRows(result.rawRows);

      // For combined files, use generic company name or let user specify
      setDetectedCompany('Combined Batch');
      setDetectedEntity('');

      // Go to configure step
      setCurrentStep(STEPS.CONFIGURE);
    } catch (err) {
      setError(err.message || 'Failed to combine files');
      console.error('File combining error:', err);
    }

    setLoading(false);
  };

  // Handle data configuration complete
  const handleDataConfigured = async (configResult) => {
    setSourceData(configResult.data);
    setSourceColumns(configResult.columns);
    setHeaderInfoRows(configResult.headerInfoRows || []);
    setDataConfig(configResult.config);

    // Use company name from configurator (may be from cell or filename)
    const companyName = configResult.companyName || detectedCompany;
    setDetectedCompany(companyName);

    // Try to find a matching process
    const matched = await findProcessByCompany(companyName);
    if (matched) {
      setMatchedProcess(matched);
      setSelectedProcessId(matched.id);
      // Check if we should auto-apply (if config matches)
      applyProcessMapping(configResult.data, matched);
      setCurrentStep(STEPS.PREVIEW);
    } else {
      setSelectedProcessId('');
      // No match - go to mapping editor
      setCurrentStep(STEPS.MAPPING);
    }
  };

  // Apply a process mapping to the data
  const applyProcessMapping = (data, process) => {
    const result = applyMapping(data, process, {
      companyName: process.companyName,
      entity: process.entity || detectedEntity
    });
    setOutputData(result.data);
    setValidationErrors(result.validation);
    setOutputFilename(generateOutputFilename(process.companyName));
    setCurrentMapping(process);
  };

  // Handle live preview updates from ProcessEditor
  const handlePreviewUpdate = (previewConfig) => {
    if (sourceData && previewConfig.fields && Object.keys(previewConfig.fields).length > 0) {
      const result = applyMapping(sourceData, previewConfig, {
        companyName: previewConfig.companyName,
        entity: previewConfig.entity
      });
      setLivePreviewData(result.data);
    }
  };

  // Handle saving a new/updated process
  const handleSaveProcess = async (processConfig) => {
    try {
      // Include data config in the process (use existing dataConfig from the process if editing without file)
      const fullConfig = {
        ...processConfig,
        dataConfig: dataConfig || processConfig.dataConfig || editingProcess?.dataConfig
      };

      let saved;
      // Check if we're updating an existing process or saving as new
      if (processConfig.originalProcessId && !processConfig.saveAsNew) {
        // Update existing process
        saved = await updateProcess(processConfig.originalProcessId, fullConfig);
      } else {
        // Save as new process
        saved = await saveProcess(fullConfig);
      }

      // If the detected company is different from the saved company name,
      // link it to this process (for benefit provider grouping)
      if (detectedCompany && detectedCompany.toLowerCase() !== saved.companyName.toLowerCase()) {
        await linkCompanyToProcess(saved.id, detectedCompany);
      }

      await loadProcesses();

      // If we have source data, apply mapping and go to preview
      // If editing without file, just go back to manage tab
      if (sourceData) {
        applyProcessMapping(sourceData, saved);
        setCurrentStep(STEPS.PREVIEW);
      } else {
        // Edited without file - go back to manage tab
        setCurrentTab('manage');
        setCurrentStep(STEPS.UPLOAD);
      }

      setEditingProcess(null);
      setLivePreviewData(null);
    } catch (err) {
      setError('Failed to save process: ' + err.message);
    }
  };

  // Handle proceed without saving (one-off processing)
  const handleProceedWithoutSaving = (processConfig) => {
    // Apply mapping without saving to database
    const result = applyMapping(sourceData, processConfig, {
      companyName: processConfig.companyName,
      entity: processConfig.entity || detectedEntity
    });
    setOutputData(result.data);
    setValidationErrors(result.validation);
    setOutputFilename(generateOutputFilename(processConfig.companyName));
    setCurrentMapping(processConfig);
    setCurrentStep(STEPS.PREVIEW);
    setLivePreviewData(null);
  };

  // Handle deleting a process
  const handleDeleteProcess = async (processId) => {
    try {
      await deleteProcess(processId);
      await loadProcesses();
    } catch (err) {
      setError('Failed to delete process: ' + err.message);
    }
  };

  // Handle import - open dialog
  const handleImport = (jsonContent) => {
    setImportData(jsonContent);
    setShowImportDialog(true);
  };

  // Handle import action from dialog
  const handleImportAction = async ({ action, data, existingId }) => {
    try {
      if (action === 'overwrite' && existingId) {
        await updateProcess(existingId, data);
      } else if (action === 'import') {
        await saveProcess(data);
      }
    } catch (err) {
      console.error('Import action failed:', err);
    }
  };

  // Handle import complete
  const handleImportComplete = () => {
    setShowImportDialog(false);
    setImportData(null);
    loadProcesses();
  };

  // Handle download
  const handleDownload = () => {
    if (outputData && outputFilename) {
      downloadCSV(outputData, outputFilename);
    }
  };

  // Handle removing duplicates from output data
  const handleRemoveDuplicates = (duplicates) => {
    if (!outputData || !duplicates || duplicates.length === 0) return;

    // Create a set of duplicate keys (email + LOC) for fast lookup
    const duplicateKeys = new Set(
      duplicates.map(d => {
        const email = (d.email || '').toLowerCase().trim();
        const loc = parseFloat(String(d.locAmount || '').replace(/[£$€,]/g, '')).toFixed(2);
        return `${email}|${loc}`;
      })
    );

    // Filter out duplicates from output data
    const filteredData = outputData.filter(row => {
      const email = (row['Email'] || '').toLowerCase().trim();
      const loc = parseFloat(String(row['LOC Amount'] || '').replace(/[£$€,]/g, '')).toFixed(2);
      const key = `${email}|${loc}`;
      return !duplicateKeys.has(key);
    });

    setOutputData(filteredData);
  };

  // Reset to start or process next file in queue
  const handleReset = () => {
    // Check if there are more files in the queue
    if (fileQueue.length > 0 && currentFileIndex < fileQueue.length - 1) {
      // Process next file
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      processFile(fileQueue[nextIndex]);
    } else {
      // Full reset
      setSourceFile(null);
      setRawRows(null);
      setSourceData(null);
      setSourceColumns([]);
      setHeaderInfoRows([]);
      setDataConfig(null);
      setDetectedCompany('');
      setDetectedEntity('');
      setMatchedProcess(null);
      setSelectedProcessId('');
      setCurrentMapping(null);
      setOutputData(null);
      setValidationErrors([]);
      setOutputFilename('');
      setLivePreviewData(null);
      setCurrentStep(STEPS.UPLOAD);
      setError('');
      setFileQueue([]);
      setCurrentFileIndex(0);
    }
  };

  // Skip current file and go to next (or reset if no more)
  const handleSkipFile = () => {
    if (fileQueue.length > 0 && currentFileIndex < fileQueue.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      processFile(fileQueue[nextIndex]);
    } else {
      // No more files, reset
      handleFullReset();
    }
  };

  // Force full reset (clear queue too)
  const handleFullReset = () => {
    setSourceFile(null);
    setRawRows(null);
    setSourceData(null);
    setSourceColumns([]);
    setHeaderInfoRows([]);
    setDataConfig(null);
    setDetectedCompany('');
    setDetectedEntity('');
    setMatchedProcess(null);
    setSelectedProcessId('');
    setCurrentMapping(null);
    setOutputData(null);
    setValidationErrors([]);
    setOutputFilename('');
    setLivePreviewData(null);
    setCurrentStep(STEPS.UPLOAD);
    setError('');
    setFileQueue([]);
    setCurrentFileIndex(0);
  };

  // Handle process selection change
  const handleProcessSelect = (processId) => {
    setSelectedProcessId(processId);
    if (processId === '') {
      // Create new - clear any existing mapping
      setMatchedProcess(null);
      setEditingProcess(null);
    } else {
      const selected = processes.find(p => p.id === processId);
      if (selected) {
        setMatchedProcess(selected);
        setEditingProcess(selected);
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setAuthenticated(false);
  };

  // If not authenticated, show login
  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1><img src="/robot.GIF" alt="" style={{ width: '32px', height: '32px', verticalAlign: 'middle', marginRight: '0.5rem' }} />Batch Formatter</h1>
        <div className="header-nav">
          <div className="tabs" style={{ border: 'none', marginBottom: 0 }}>
            <button
              className={`tab ${currentTab === 'process' ? 'active' : ''}`}
              onClick={() => setCurrentTab('process')}
            >
              Process File
            </button>
            <button
              className={`tab ${currentTab === 'manage' ? 'active' : ''}`}
              onClick={() => setCurrentTab('manage')}
            >
              Manage Processes
            </button>
            <button
              className={`tab ${currentTab === 'adam' ? 'active' : ''}`}
              onClick={() => setCurrentTab('adam')}
            >
              Admin Adam
            </button>
            <button
              className={`tab ${currentTab === 'entity' ? 'active' : ''}`}
              onClick={() => setCurrentTab('entity')}
            >
              Entity Finder
            </button>
            <button
              className={`tab ${currentTab === 'duplicates' ? 'active' : ''}`}
              onClick={() => setCurrentTab('duplicates')}
            >
              Duplicate Checker
            </button>
            <button
              className={`tab ${currentTab === 'info' ? 'active' : ''}`}
              onClick={() => setCurrentTab('info')}
            >
              Info
            </button>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {error && (
          <div className="validation-panel" style={{ marginBottom: '1rem' }}>
            <h4>Error</h4>
            <p>{error}</p>
            <button
              className="btn btn-secondary"
              onClick={() => setError('')}
              style={{ marginTop: '0.5rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {currentTab === 'process' ? (
          <>
            {/* Step Indicator */}
            <div className="steps">
              <div className={`step ${currentStep === STEPS.UPLOAD ? 'active' : rawRows ? 'completed' : ''}`}>
                <span className="step-number">1</span>
                Upload
              </div>
              <div className={`step ${currentStep === STEPS.CONFIGURE ? 'active' : sourceData ? 'completed' : ''}`}>
                <span className="step-number">2</span>
                Configure
              </div>
              <div className={`step ${currentStep === STEPS.MAPPING ? 'active' : currentMapping ? 'completed' : ''}`}>
                <span className="step-number">3</span>
                Map Fields
              </div>
              <div className={`step ${currentStep === STEPS.PREVIEW ? 'active' : ''}`}>
                <span className="step-number">4</span>
                Preview & Download
              </div>
            </div>

            {/* Step Content */}
            {currentStep === STEPS.UPLOAD && (
              <>
                <FileUploader onFileSelect={handleFileSelect} onCombineFiles={handleCombineFiles} disabled={loading} />
                <ManualBatchMode />
              </>
            )}

            {currentStep === STEPS.CONFIGURE && rawRows && (
              <>
                {/* Show detected company and entity */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <p>
                    <strong>File:</strong> {sourceFile?.name}
                  </p>
                  <p>
                    <strong>Detected Company:</strong> {detectedCompany}
                    {detectedEntity && (
                      <span style={{ marginLeft: '1rem' }}>
                        <strong>Entity:</strong> {detectedEntity}
                      </span>
                    )}
                  </p>
                  {matchedProcess && (
                    <p style={{ color: 'var(--success)', marginTop: '0.5rem' }}>
                      Matched to saved process: <strong>{matchedProcess.displayName || matchedProcess.companyName}</strong>
                      {matchedProcess.dataConfig?.startRow && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                          (Row {matchedProcess.dataConfig.startRow} saved)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Data Configurator */}
                <DataConfigurator
                  rawRows={rawRows}
                  onConfigured={handleDataConfigured}
                  existingConfig={dataConfig}
                  detectedCompany={detectedCompany}
                  detectedEntity={detectedEntity}
                  suggestedStartRow={matchedProcess?.dataConfig?.startRow}
                  onSkip={handleSkipFile}
                  hasMoreFiles={fileQueue.length > 0 && currentFileIndex < fileQueue.length - 1}
                />
              </>
            )}

            {currentStep === STEPS.MAPPING && (sourceData || editingProcess) && (
              <>
                {/* Show full UI when file is loaded, simplified UI when editing without file */}
                {sourceData ? (
                  <>
                    {/* Process Selection and Info */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p style={{ marginBottom: '0.5rem' }}>
                            <strong>Detected Company:</strong> {detectedCompany}
                            {detectedEntity && (
                              <span style={{ marginLeft: '1rem' }}>
                                <strong>Entity:</strong> {detectedEntity}
                              </span>
                            )}
                          </p>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setCurrentStep(STEPS.CONFIGURE)}
                            style={{ marginTop: '0.5rem' }}
                          >
                            ← Back to Data Config
                          </button>
                        </div>

                        {/* Process Selection Dropdown */}
                        <div style={{ minWidth: '250px' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Select Mapping Process
                          </label>
                          <select
                            value={selectedProcessId}
                            onChange={(e) => handleProcessSelect(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="">-- Create New Process --</option>
                            {processes.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.displayName || p.companyName}
                                {p.displayName && p.displayName !== p.companyName && ` (${p.companyName})`}
                              </option>
                            ))}
                          </select>
                          <small style={{ color: 'var(--text-muted)' }}>
                            {selectedProcessId ? 'Edit existing or select "Create New"' : 'Configure a new mapping process'}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Source Data Preview */}
                    <DataPreview
                      data={sourceData}
                      columns={sourceColumns}
                      title={`Source Data (${sourceData.length} rows)`}
                      maxRows={5}
                    />
                  </>
                ) : (
                  /* Editing without file - show simplified header */
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>
                          Editing: {editingProcess?.displayName || editingProcess?.companyName}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                          No file loaded - you can edit process settings, but not column mappings
                        </p>
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingProcess(null);
                          setCurrentStep(STEPS.UPLOAD);
                        }}
                      >
                        ← Back to Upload
                      </button>
                    </div>
                  </div>
                )}

                {/* Process Editor */}
                <ProcessEditor
                  sourceColumns={sourceColumns}
                  sourceData={sourceData}
                  headerInfoRows={headerInfoRows}
                  companyName={detectedCompany || editingProcess?.companyName}
                  entity={detectedEntity || editingProcess?.entity}
                  existingMapping={matchedProcess || editingProcess}
                  allProcesses={processes}
                  onSave={handleSaveProcess}
                  onCancel={() => {
                    // If editing without file, go back to upload/manage
                    if (!sourceData && editingProcess) {
                      setEditingProcess(null);
                      setCurrentStep(STEPS.UPLOAD);
                    } else {
                      handleReset();
                    }
                  }}
                  onPreviewUpdate={handlePreviewUpdate}
                  onProceedWithoutSaving={sourceData ? handleProceedWithoutSaving : null}
                />

                {/* Live Output Preview */}
                {livePreviewData && livePreviewData.length > 0 && (
                  <div className="card" style={{ marginTop: '1rem' }}>
                    <h3 className="card-title" style={{ marginBottom: '1rem' }}>Live Output Preview</h3>
                    <div className="data-table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            {OUTPUT_COLUMNS.map(col => (
                              <th key={col.key}>{col.key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {livePreviewData.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              {OUTPUT_COLUMNS.map(col => (
                                <td key={col.key}>
                                  {row[col.key] ? String(row[col.key]).substring(0, 30) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Showing first 5 rows of output preview
                    </p>
                  </div>
                )}
              </>
            )}

            {currentStep === STEPS.PREVIEW && outputData && (
              <>
                {/* File Queue Indicator */}
                {fileQueue.length > 1 && (
                  <div className="card" style={{ marginBottom: '1rem', background: 'var(--primary)', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        Processing file {currentFileIndex + 1} of {fileQueue.length}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn"
                          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                          onClick={handleSkipFile}
                        >
                          Skip to Next
                        </button>
                        <button
                          className="btn"
                          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                          onClick={handleFullReset}
                        >
                          Cancel Queue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Company info */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <p><strong>Company:</strong> {currentMapping?.companyName}</p>
                      {currentMapping?.entity && (
                        <p><strong>Entity:</strong> {currentMapping.entity}</p>
                      )}
                      <p><strong>Source File:</strong> {sourceFile?.name}</p>
                      <p><strong>Output File:</strong> {outputFilename}</p>
                      <p><strong>Rows:</strong> {outputData.length}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentStep(STEPS.CONFIGURE)}
                      >
                        Reconfigure Data
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingProcess(currentMapping);
                          setCurrentStep(STEPS.MAPPING);
                        }}
                      >
                        Edit Mapping
                      </button>
                      <button className="btn btn-secondary" onClick={handleReset}>
                        {fileQueue.length > 1 && currentFileIndex < fileQueue.length - 1
                          ? `Next File (${fileQueue.length - currentFileIndex - 1} remaining)`
                          : 'Process Another File'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output Preview */}
                <OutputPreview
                  data={outputData}
                  validationErrors={validationErrors}
                  onDownload={handleDownload}
                  filename={outputFilename}
                  onRemoveDuplicates={handleRemoveDuplicates}
                  companyName={currentMapping?.companyName}
                  sourceFilename={sourceFile?.name}
                  sourceData={sourceData}
                  sourceColumns={sourceColumns}
                />
              </>
            )}

            {loading && (
              <div className="card">
                <div className="loading">
                  <div className="spinner"></div>
                </div>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Processing file...
                </p>
              </div>
            )}
          </>
        ) : currentTab === 'manage' ? (
          /* Manage Tab */
          <ProcessManager
            processes={processes}
            loading={processesLoading}
            onEdit={(process) => {
              setEditingProcess(process);
              setCurrentTab('process');
              setCurrentStep(STEPS.MAPPING);
              // Clear any previous error - we can now edit without a file loaded
              setError('');
            }}
            onDelete={handleDeleteProcess}
            onImport={handleImport}
            onRefresh={loadProcesses}
          />
        ) : currentTab === 'adam' ? (
          /* Admin Adam Tab */
          <AdminAdam />
        ) : currentTab === 'entity' ? (
          /* Entity Finder Tab */
          <EntityFinder />
        ) : currentTab === 'duplicates' ? (
          /* Duplicate Checker Tab */
          <DuplicateCheckerTab />
        ) : currentTab === 'info' ? (
          /* Info Guide Tab */
          <InfoGuide />
        ) : null}

        {/* Import Dialog */}
        <ImportDialog
          isOpen={showImportDialog}
          importData={importData}
          existingProcesses={processes}
          onComplete={handleImportAction}
          onCancel={handleImportComplete}
        />
      </main>
    </div>
  );
}
