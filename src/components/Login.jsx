import { useState } from 'react';

/**
 * Login component - simple password gate
 * Password is checked against environment variable
 */
export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Small delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check password against environment variable
    const correctPassword = import.meta.env.VITE_APP_PASSWORD;

    if (!correctPassword) {
      setError('App not configured. Please set VITE_APP_PASSWORD.');
      setLoading(false);
      return;
    }

    if (password === correctPassword) {
      // Store in session storage so it persists during the session
      sessionStorage.setItem('authenticated', 'true');
      onLogin();
    } else {
      setError('Incorrect password');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src="/robot.GIF" alt="Robot" style={{ width: '80px', height: '80px', marginBottom: '1rem' }} />
        <h1>Batch Formatter</h1>
        <p>Cycle to Work File Processor</p>

        {error && <div className="login-error">{error}</div>}

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoFocus
        />

        <button type="submit" className="btn btn-primary" disabled={loading || !password}>
          {loading ? 'Checking...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return sessionStorage.getItem('authenticated') === 'true';
}

/**
 * Clear authentication
 */
export function logout() {
  sessionStorage.removeItem('authenticated');
}
