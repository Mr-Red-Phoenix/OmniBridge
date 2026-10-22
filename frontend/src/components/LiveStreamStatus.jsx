import React from 'react';
import { Signal01 } from '@untitledui/icons';

export default function LiveStreamStatus({ status = 'connected', label = 'Live Feed' }) {
  const getColor = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          text: '#10b981',
          dot: '#10b981',
        };
      case 'connecting':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          text: '#fbbf24',
          dot: '#fbbf24',
        };
      default:
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          text: '#f87171',
          dot: '#f87171',
        };
    }
  };

  const style = getColor();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.65rem',
        borderRadius: '99px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
      title={`Event stream is ${status}`}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: style.dot,
          boxShadow: `0 0 6px ${style.dot}`,
          display: 'inline-block',
          animation: status === 'connected' ? 'pulse 2s infinite' : 'none',
        }}
      />
      <Signal01 size={12} />
      <span>{label}</span>
    </div>
  );
}
