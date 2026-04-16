// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<any, any> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-4 bg-red-500/10 rounded-full mb-6 animate-pulse">
                        <AlertTriangle size={64} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 font-display">System Malfunction</h1>
                    <p className="text-gray-400 max-w-md mb-8">
                        An unexpected error occurred in the cognitive stream.
                    </p>

                    <div className="bg-surfaceHighlight p-4 rounded-lg border border-white/10 max-w-lg w-full overflow-auto mb-8 text-left">
                        <p className="text-red-400 font-mono text-xs mb-2">{this.state.error?.toString()}</p>
                        <pre className="text-gray-500 font-mono text-[10px] whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw size={16} /> Reboot System
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
