import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches unexpected render/runtime errors so one broken screen doesn't blank the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ScanMark crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" role="alert">
          <h2>Something went wrong</h2>
          <p className="muted">{this.state.error.message}</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
