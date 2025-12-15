import { useState, useEffect } from 'react';
import Login, { isAuthenticated, logout } from './components/Login';
import FileUploader from './components/FileUploader';
import DataConfigurator from './components/DataConfigurator';
import DataPreview from './components/DataPreview';
import ProcessEditor from './components/ProcessEditor';
import OutputPreview from './components/OutputPreview';
import ProcessManager from './components/ProcessManager';
import ImportDialog from './components/ImportDialog';
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
      // Parse the file (returns raw rows)
      const result = await parseFile(file);
      setRawRows(result.rawRows);

      // Extract company name and entity from filename
      const { company, entity } = extractCompanyAndEntity(file.name);
      setDetectedCompany(company);
      setDetectedEntity(entity);

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
      // Include data config in the process
      const fullConfig = {
        ...processConfig,
        dataConfig: dataConfig
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
      applyProcessMapping(sourceData, saved);
      setCurrentStep(STEPS.PREVIEW);
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
        <h1>🚲 Batch Formatter</h1>
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
              <FileUploader onFileSelect={handleFileSelect} onCombineFiles={handleCombineFiles} disabled={loading} />
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
                </div>

                {/* Data Configurator */}
                <DataConfigurator
                  rawRows={rawRows}
                  onConfigured={handleDataConfigured}
                  existingConfig={dataConfig}
                  detectedCompany={detectedCompany}
                  detectedEntity={detectedEntity}
                />
              </>
            )}

            {currentStep === STEPS.MAPPING && sourceData && (
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

                {/* Process Editor */}
                <ProcessEditor
                  sourceColumns={sourceColumns}
                  sourceData={sourceData}
                  headerInfoRows={headerInfoRows}
                  companyName={detectedCompany}
                  entity={detectedEntity}
                  existingMapping={matchedProcess || editingProcess}
                  allProcesses={processes}
                  onSave={handleSaveProcess}
                  onCancel={handleReset}
                  onPreviewUpdate={handlePreviewUpdate}
                  onProceedWithoutSaving={handleProceedWithoutSaving}
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
        ) : (
          /* Manage Tab */
          <ProcessManager
            processes={processes}
            loading={processesLoading}
            onEdit={(process) => {
              setEditingProcess(process);
              setCurrentTab('process');
              setCurrentStep(STEPS.MAPPING);
              if (!sourceData) {
                setError('Please upload a file first to edit a process mapping');
                setCurrentTab('process');
                setCurrentStep(STEPS.UPLOAD);
              }
            }}
            onDelete={handleDeleteProcess}
            onImport={handleImport}
            onRefresh={loadProcesses}
          />
        )}

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
