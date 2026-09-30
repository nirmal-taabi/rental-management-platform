import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Application error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-3 text-slate-600">
              The application could not load correctly. Please refresh the page and try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
