import React from 'react';

/**
 * SceneErrorBoundary: Catches any WebGL / Three.js initialization or runtime
 * rendering exceptions to ensure the surrounding application page never crashes to a white screen.
 */
export class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SceneErrorBoundary caught 3D rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="sim3d-error-fallback"
          style={{
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#091520',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '32px',
            textAlign: 'center',
            fontFamily: 'monospace',
            color: '#f87171',
            gap: '16px',
            margin: '16px 0',
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>
            ⚠️ 3D VIEW INITIALIZATION ERROR
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '560px',
              background: 'rgba(0,0,0,0.3)',
              padding: '12px 18px',
              borderRadius: '6px',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || 'An unexpected WebGL error occurred while initializing the 3D scene.'}
          </div>
          <button
            type="button"
            className="sim3d-btn primary"
            onClick={this.handleRetry}
            style={{ padding: '8px 24px', fontSize: '12px' }}
          >
            ↺ RETRY INITIALIZATION
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
