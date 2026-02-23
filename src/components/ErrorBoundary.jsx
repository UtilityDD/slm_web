import React from 'react';
import { DotLottiePlayer } from '@dotlottie/react-player';
import noInternetLottie from '../assets/no_internet.lottie';

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
            const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') ||
                this.state.error?.message?.toLowerCase().includes('fetch') ||
                !navigator.onLine;

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center border border-slate-100 dark:border-slate-700 animate-fadeIn">
                        <div className="mb-6 inline-flex p-4 rounded-3xl bg-orange-50 dark:bg-orange-950/20">
                            <DotLottiePlayer
                                src={noInternetLottie}
                                autoplay
                                loop
                                className="w-32 h-32"
                            />
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            {isNetworkError ? 'Connection Lost' : 'Something went wrong'}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium px-4">
                            {isNetworkError
                                ? 'Please check your internet connection and try again.'
                                : 'We apologize for the inconvenience. The application encountered an unexpected error.'}
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-4 px-6 bg-[#ea580c] hover:bg-[#d64a0a] text-white rounded-2xl font-bold transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Try Again
                            </button>

                            {!isNetworkError && (
                                <details className="text-left text-[10px] bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl overflow-auto max-h-40 text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <summary className="cursor-pointer mb-2 font-bold uppercase tracking-widest opacity-60">Error Details</summary>
                                    <pre className="whitespace-pre-wrap font-mono">
                                        {this.state.error && this.state.error.toString()}
                                        <br />
                                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
