import React from 'react';

const LoadingSpinner = ({ fullPage, size = 40 }) => {
  const spinner = (
    <div style={{
      width: size, height: size,
      border: `3px solid var(--border)`,
      borderTop: `3px solid var(--accent)`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', gap: 16, zIndex: 9999
      }}>
        {spinner}
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
