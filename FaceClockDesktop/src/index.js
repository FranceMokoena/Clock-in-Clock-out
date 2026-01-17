import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found!');
}

const root = ReactDOM.createRoot(rootElement);

// Add error boundary
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: Arial;">
      <h1 style="color: #ef4444;">Error Loading Application</h1>
      <p style="color: #64748b; margin-top: 20px;">${error.message}</p>
      <p style="color: #64748b; margin-top: 10px;">Please check the console for more details.</p>
    </div>
  `;
}

