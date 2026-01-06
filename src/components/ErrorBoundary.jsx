import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-slate-100 dark:border-slate-700">
                        <div className="mb-6 inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Something went wrong</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            We apologize for the inconvenience. The application encountered an unexpected error.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Reload Application
                            </button>

                            {/* Optional: Show error details in dev/debug mode */}
                            <details className="text-left text-xs bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-40 mt-4 text-slate-500">
                                <summary className="cursor-pointer mb-2 font-medium">Error Details</summary>
                                <pre className="whitespace-pre-wrap">
                                    {this.state.error && this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
