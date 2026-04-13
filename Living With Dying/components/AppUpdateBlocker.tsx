import React, { useEffect, useState } from 'react';
import { subscribeToSystemSettings, SystemSettings } from '../services/systemService';
import { AlertTriangle, Download } from 'lucide-react';

const CURRENT_APP_VERSION = "1.0.0"; // Increment this hardcoded value when releasing a new APK

export const AppUpdateBlocker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isOutdated, setIsOutdated] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToSystemSettings((data) => {
            if (data) {
                setSettings(data);

                // Simple string comparison for versions (e.g. "1.0.1" > "1.0.0")
                // A robust implementation might use a semver library, but for basic use this is sufficient if versions are kept simple.
                if (data.mainAppVersion && isVersionGreater(data.mainAppVersion, CURRENT_APP_VERSION)) {
                    setIsOutdated(true);
                } else {
                    setIsOutdated(false);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Simple version comparison function
    const isVersionGreater = (requiredVersion: string, currentVersion: string) => {
        const v1parts = requiredVersion.split('.').map(Number);
        const v2parts = currentVersion.split('.').map(Number);

        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1 = v1parts[i] || 0;
            const v2 = v2parts[i] || 0;
            if (v1 > v2) return true;
            if (v1 < v2) return false;
        }
        return false;
    };

    if (isOutdated && settings) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-surfaceHighlight p-8 rounded-2xl max-w-md w-full border border-red-500/20 flex flex-col items-center shadow-2xl shadow-red-500/10">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="text-red-500 h-10 w-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 font-display">Update Required</h1>

                    <p className="text-gray-400 mb-8 text-sm">
                        You are using an outdated version of Zerox eSports. To continue playing tournaments and accessing your features, please download and install the latest version.
                    </p>

                    <div className="w-full bg-black/40 p-4 rounded-lg border border-white/5 mb-8 flex justify-between items-center text-sm">
                        <span className="text-gray-500 uppercase tracking-widest font-mono text-[10px]">Your Version</span>
                        <span className="text-red-400 font-bold font-mono">v{CURRENT_APP_VERSION}</span>
                    </div>

                    <div className="w-full bg-black/40 p-4 rounded-lg border border-white/5 mb-8 flex justify-between items-center text-sm">
                        <span className="text-gray-500 uppercase tracking-widest font-mono text-[10px]">Required Version</span>
                        <span className="text-green-400 font-bold font-mono">v{settings.mainAppVersion}</span>
                    </div>

                    {settings.mainAppUrl ? (
                        <a
                            href={settings.mainAppUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl w-full flex items-center justify-center transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40"
                        >
                            <Download className="mr-2 h-5 w-5" />
                            Download Latest Update
                        </a>
                    ) : (
                        <div className="text-yellow-500 text-sm p-4 bg-yellow-500/10 rounded-lg w-full">
                            Update URL is currently unavailable. Please contact support.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
