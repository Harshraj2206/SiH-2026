import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL REACT UNCAUGHT ERROR:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#030712',
          color: '#f8fafc',
          padding: '40px 20px',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '800px',
            width: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <h1 style={{ color: '#f87171', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              ⚠️ Application Component Error
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '16px' }}>
              {this.state.error?.toString()}
            </p>
            <pre style={{
              backgroundColor: '#020617',
              padding: '16px',
              borderRadius: '8px',
              overflowX: 'auto',
              color: '#94a3b8',
              fontSize: '12px',
              border: '1px solid #1e293b'
            }}>
              {this.state.errorInfo?.componentStack || this.state.error?.stack}
            </pre>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
