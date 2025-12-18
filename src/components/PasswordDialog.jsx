import { useState } from 'react';

/**
 * Dialog for entering password for protected files
 * Also handles password save options when existing password failed
 */
export default function PasswordDialog({
  isOpen,
  fileName,
  companyName,
  existingPasswords = [],
  onSubmit,
  onCancel
}) {
  const [password, setPassword] = useState('');
  const [saveOption, setSaveOption] = useState('save'); // 'save', 'no-save', 'overwrite', 'additional'
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const hasExistingPasswords = existingPasswords.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    onSubmit({
      password: password.trim(),
      saveOption: saveOption
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>Password Required</h3>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>
            The file <strong>{fileName}</strong> is password protected.
          </p>

          {hasExistingPasswords && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>
                The saved password(s) for <strong>{companyName}</strong> didn't work.
                Please enter the correct password below.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter file password..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '3rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Save options */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem' }}>
                Save password for {companyName}?
              </label>

              {!hasExistingPasswords ? (
                // No existing passwords - simple save/don't save choice
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="saveOption"
                      value="save"
                      checked={saveOption === 'save'}
                      onChange={(e) => setSaveOption(e.target.value)}
                    />
                    <span>Yes, save for future files</span>
                  </label>
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="saveOption"
                      value="no-save"
                      checked={saveOption === 'no-save'}
                      onChange={(e) => setSaveOption(e.target.value)}
                    />
                    <span>No, just process this file</span>
                  </label>
                </div>
              ) : (
                // Has existing passwords - more options
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="saveOption"
                      value="additional"
                      checked={saveOption === 'additional'}
                      onChange={(e) => setSaveOption(e.target.value)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div>
                      <span>Add as additional password</span>
                      <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                        Keep existing password(s) and add this one (for companies with multiple passwords)
                      </small>
                    </div>
                  </label>
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="saveOption"
                      value="overwrite"
                      checked={saveOption === 'overwrite'}
                      onChange={(e) => setSaveOption(e.target.value)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div>
                      <span>Replace existing password(s)</span>
                      <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                        Remove old password(s) and save only this one
                      </small>
                    </div>
                  </label>
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="saveOption"
                      value="no-save"
                      checked={saveOption === 'no-save'}
                      onChange={(e) => setSaveOption(e.target.value)}
                    />
                    <span>Don't save, just process this file</span>
                  </label>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!password.trim()}
              >
                Open File
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
