import { useState } from 'react';

/**
 * Info Guide Component - User documentation for the Batcher app
 */
export default function InfoGuide() {
  const [expandedSection, setExpandedSection] = useState('quickstart');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋 Batcher User Guide</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Your comprehensive guide to processing Cycle to Work batch files
        </p>
      </div>

      {/* Quick Start */}
      <Section
        title="🚀 Quick Start"
        emoji="🚀"
        expanded={expandedSection === 'quickstart'}
        onToggle={() => toggleSection('quickstart')}
      >
        <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>
          <strong>Batcher</strong> is a tool for processing Cycle to Work application files.
          It transforms raw employee data from various formats into standardized CSV files
          ready for upload to the Cycle to Work platform.
        </p>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <strong>Key capabilities:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            <li>Auto-detect company names and apply saved processes</li>
            <li>Map columns from any spreadsheet format</li>
            <li>Filter and validate employee data</li>
            <li>Generate multiple output formats (CSV, SFTP, Personal Group)</li>
            <li>Split large files automatically based on employee limits</li>
          </ul>
        </div>
      </Section>

      {/* Step by Step Guide */}
      <Section
        title="📝 Step-by-Step Guide"
        emoji="📝"
        expanded={expandedSection === 'steps'}
        onToggle={() => toggleSection('steps')}
      >
        <Step number="1" title="Upload & Configure">
          <p>Start by uploading your source file (Excel, CSV, or PDF):</p>
          <ul>
            <li><strong>Drag & drop</strong> or click to browse for your file</li>
            <li>The app will <strong>auto-detect</strong> the company name from the filename</li>
            <li>If a saved process exists, it will be automatically loaded</li>
          </ul>

          <div className="screenshot-placeholder" style={{
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            margin: '1rem 0',
            color: 'var(--text-muted)'
          }}>
            📤 Upload Screen Preview
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              (File upload area with drag-and-drop zone)
            </div>
          </div>

          <p><strong>Configure your data:</strong></p>
          <ul>
            <li><strong>Header Row:</strong> Specify which row contains column names (default: 1)</li>
            <li><strong>Start Row:</strong> First row of actual data (default: 2)</li>
            <li><strong>Date Format:</strong> Select how dates appear in your file (DD/MM/YYYY, MM/DD/YYYY, etc.)</li>
          </ul>
        </Step>

        <Step number="2" title="Column Mapping">
          <p>Map your source columns to the required output format:</p>
          <ul>
            <li><strong>Required fields:</strong> First Name, Surname, Email, LOC Amount</li>
            <li><strong>Optional fields:</strong> Additional Details, Employer, Entity</li>
            <li>Use the dropdowns to match each output column to your source data</li>
            <li>The system remembers mappings when you save the process</li>
          </ul>

          <div className="screenshot-placeholder" style={{
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            margin: '1rem 0',
            color: 'var(--text-muted)'
          }}>
            🗂️ Column Mapping Interface
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              (Dropdown selectors for mapping columns)
            </div>
          </div>
        </Step>

        <Step number="3" title="Preview & Filter">
          <p>Review your data before downloading:</p>
          <ul>
            <li><strong>Validation warnings:</strong> Missing required fields are highlighted</li>
            <li><strong>LOC Amount Filter:</strong> Set min/max to exclude employees outside the range</li>
            <li><strong>Duplicate Check:</strong> Automatically detects and offers to remove duplicate emails</li>
            <li><strong>Row count & LOC Sum:</strong> See total employees and total LOC value</li>
          </ul>

          <div className="screenshot-placeholder" style={{
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            margin: '1rem 0',
            color: 'var(--text-muted)'
          }}>
            👀 Output Preview Table
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              (Data table with validation indicators and filters)
            </div>
          </div>
        </Step>

        <Step number="4" title="Download Output Files">
          <p>Generate your formatted files:</p>
          <ul>
            <li><strong>Download CSV:</strong> Standard output file</li>
            <li><strong>Download SFTP:</strong> For Car Maintenance uploads (adds extra columns, clears Additional Details)</li>
            <li><strong>Download Personal Group:</strong> Adds LOC Upload Date column with today's date</li>
          </ul>

          <InfoBox type="tip">
            <strong>File Splitting:</strong> If your file has more employees than the "Max Employees"
            limit (default: 50), the output will automatically split into multiple numbered files
            (e.g., "Company 08.01.26 1.csv", "Company 08.01.26 2.csv").
          </InfoBox>
        </Step>
      </Section>

      {/* Special Modes */}
      <Section
        title="⚙️ Special Modes"
        emoji="⚙️"
        expanded={expandedSection === 'modes'}
        onToggle={() => toggleSection('modes')}
      >
        <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }}>🚗 Car Maintenance Mode</h3>
        <p>Enable this for SFTP uploads:</p>
        <ul>
          <li>Adds "AccountName" and "APT" columns to the output</li>
          <li>Clears "Additional Details" field</li>
          <li>Filename format: <code>[Company] SFTP [Date].csv</code></li>
        </ul>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>👥 Personal Group Mode</h3>
        <p>Enable this for Personal Group uploads:</p>
        <ul>
          <li>Adds "LOC Upload Date" column with today's date (DD.MM.YY format)</li>
          <li>Uses original source data (preserves all original columns)</li>
          <li>Filename format: <code>Uploaded [Company] [Date].csv</code></li>
        </ul>

        <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>✍️ Manual Batch Mode</h3>
        <p>Create batches from scratch without uploading a file:</p>
        <ul>
          <li>Add employees one at a time using the form</li>
          <li>Or paste tab-separated data (e.g., from Excel)</li>
          <li>Edit employees inline after adding them</li>
          <li><strong>Apply to All:</strong> Quickly set the same value for a field across all employees</li>
        </ul>

        <div className="screenshot-placeholder" style={{
          background: 'var(--bg-secondary)',
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          margin: '1rem 0',
          color: 'var(--text-muted)'
        }}>
          ✍️ Manual Batch Mode Interface
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            (Form with employee input fields and "Apply to All" feature)
          </div>
        </div>
      </Section>

      {/* Tips & Tricks */}
      <Section
        title="💡 Tips & Tricks"
        emoji="💡"
        expanded={expandedSection === 'tips'}
        onToggle={() => toggleSection('tips')}
      >
        <TipItem icon="🔍" title="Auto-detect Processes">
          Name your files with the company name (e.g., "Technip Report.xlsx") and Batcher
          will automatically load the saved process for that company.
        </TipItem>

        <TipItem icon="💰" title="LOC Amount Filtering">
          Use the Min/Max LOC Amount filters to exclude employees outside your target range.
          For example, set Min=500 and Max=2000 to only include employees with LOC between £500-£2000.
        </TipItem>

        <TipItem icon="📧" title="Email Priority & Fallback">
          The app prioritizes work emails over personal emails. If both are available,
          it will use the work email (keywords: "company", "work", "office", "corporate").
        </TipItem>

        <TipItem icon="✏️" title="Email Keyword Replacement">
          Clean up email addresses by replacing keywords. For example, replace "WORK EMAIL:"
          with "" (empty) to remove the prefix from email values.
        </TipItem>

        <TipItem icon="👥" title="Max Employees Setting">
          Adjust the "Max Employees" number (default: 50) based on upload requirements.
          Files larger than this limit will automatically split into multiple downloads.
        </TipItem>

        <TipItem icon="🔄" title="Duplicate Handling">
          The duplicate checker runs automatically before download. You can choose to:
          <ul>
            <li>Remove duplicates (keeps first occurrence)</li>
            <li>Proceed with duplicates</li>
            <li>Cancel and review manually</li>
          </ul>
        </TipItem>

        <TipItem icon="💾" title="Save Your Processes">
          After mapping columns, save the process with a name. Next time you upload a file
          from the same company, the mapping will be automatically applied.
        </TipItem>

        <TipItem icon="🔗" title="Link Companies to Processes">
          Use the Process Manager to link additional company names to existing processes.
          This is useful when the same company has multiple file naming variations.
        </TipItem>
      </Section>

      {/* Common Issues */}
      <Section
        title="⚠️ Common Issues & Solutions"
        emoji="⚠️"
        expanded={expandedSection === 'issues'}
        onToggle={() => toggleSection('issues')}
      >
        <IssueItem
          problem="File won't upload or shows parsing error"
          solution={
            <ul>
              <li>Ensure file format is Excel (.xlsx, .xls), CSV, or PDF</li>
              <li>Check that the file isn't password protected</li>
              <li>Verify the header row and start row settings are correct</li>
              <li>Try exporting the file as CSV and re-uploading</li>
            </ul>
          }
        />

        <IssueItem
          problem="Validation warnings showing missing data"
          solution={
            <ul>
              <li>Check your column mappings are correct</li>
              <li>Verify that required fields (First Name, Surname, Email, LOC Amount) are mapped</li>
              <li>You can still download the file - warnings indicate which rows have issues</li>
            </ul>
          }
        />

        <IssueItem
          problem="Wrong date format in output"
          solution={
            <ul>
              <li>Set the correct date format in the Configure step</li>
              <li>Personal Group dates always use DD.MM.YY format (e.g., 08.01.26)</li>
            </ul>
          }
        />

        <IssueItem
          problem="Process not auto-loading"
          solution={
            <ul>
              <li>Check that the company name in your filename matches a saved process</li>
              <li>Go to "Manage Processes" to link the company name to an existing process</li>
              <li>Company name matching is case-insensitive and flexible (e.g., "Technip" matches "Technip Energies")</li>
            </ul>
          }
        />

        <IssueItem
          problem="Download button not working"
          solution={
            <ul>
              <li>Ensure you've completed the column mapping step</li>
              <li>Check that at least one row of data exists in the output</li>
              <li>Try using a different browser if downloads aren't starting</li>
            </ul>
          }
        />
      </Section>

      {/* Footer */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Need additional help? Contact your system administrator or refer to the Cycle to Work platform documentation.
        </p>
      </div>
    </div>
  );
}

/**
 * Collapsible Section Component
 */
function Section({ title, emoji, children, expanded, onToggle }) {
  return (
    <div style={{
      marginBottom: '1rem',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          background: expanded ? 'var(--bg-secondary)' : 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '1.2rem',
          fontWeight: 600,
          transition: 'background 0.2s'
        }}
      >
        <span>
          <span style={{ marginRight: '0.75rem' }}>{emoji}</span>
          {title}
        </span>
        <span style={{
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          fontSize: '1rem'
        }}>
          ▼
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Step Component
 */
function Step({ number, title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 'bold',
          marginRight: '0.75rem'
        }}>
          {number}
        </span>
        {title}
      </h3>
      <div style={{ marginLeft: '2.5rem' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Info Box Component
 */
function InfoBox({ type = 'info', children }) {
  const styles = {
    info: { background: '#e3f2fd', borderLeft: '4px solid #2196f3' },
    tip: { background: '#f3e5f5', borderLeft: '4px solid #9c27b0' },
    warning: { background: '#fff3e0', borderLeft: '4px solid #ff9800' }
  };

  return (
    <div style={{
      ...styles[type],
      padding: '1rem',
      borderRadius: '4px',
      margin: '1rem 0'
    }}>
      {children}
    </div>
  );
}

/**
 * Tip Item Component
 */
function TipItem({ icon, title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{
        fontSize: '1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>{icon}</span>
        {title}
      </h4>
      <div style={{ marginLeft: '2rem', color: 'var(--text-muted)' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Issue Item Component
 */
function IssueItem({ problem, solution }) {
  return (
    <div style={{
      marginBottom: '1.5rem',
      padding: '1rem',
      background: 'var(--bg-secondary)',
      borderRadius: '8px'
    }}>
      <h4 style={{
        fontSize: '1rem',
        marginBottom: '0.5rem',
        color: 'var(--danger)'
      }}>
        ❌ {problem}
      </h4>
      <div style={{ marginLeft: '1.75rem', color: 'var(--text-muted)' }}>
        <strong>Solution:</strong>
        {solution}
      </div>
    </div>
  );
}
