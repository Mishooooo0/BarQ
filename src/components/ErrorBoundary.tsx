import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Keeps one broken screen from blanking the whole app. Resets when `resetKey` (the route) changes. */
export class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() { return { failed: true }; }
  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Screen failed to render', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="detail-content error-state" role="alert"><h1 className="detail-title">This screen hit a problem</h1><p className="muted center">The rest of the app still works. Try again, or go back Home.</p><button type="button" className="primary-button" onClick={() => this.setState({ failed: false })}>Try again</button><a className="secondary-button" href="/">Back to Home</a></div>;
  }
}
