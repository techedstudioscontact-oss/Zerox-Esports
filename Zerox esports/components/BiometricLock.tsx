import React, { useEffect, useState } from 'react';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from './Button';

export const BiometricLock: React.FC<{ onAuthenticated: () => void }> = ({ onAuthenticated }) => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLocked, setIsLocked] = useState(true);

    // Check availability and preference on mount
    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        // Platform check for web
        if (Capacitor.getPlatform() === 'web') {
            console.log("Biometrics not supported on web platform.");
            setIsLocked(false);
            onAuthenticated();
            return;
        }

        try {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                setIsAvailable(true);
                const enabled = localStorage.getItem('biometric_enabled') === 'true';
                setIsEnabled(enabled);

                if (!enabled) {
                    setIsLocked(false);
                    onAuthenticated();
                } else {
                    performBiometricScan();
                }
            } else {
                setIsLocked(false);
                onAuthenticated();
            }
        } catch (e: any) {
            // Handle "Method not implemented" specifically for Capacitor plugins on web
            if (e.message?.includes('not implemented')) {
                console.log("Biometrics not implemented on this platform.");
            } else {
                console.warn("Biometrics check failed", e);
            }
            setIsLocked(false);
            onAuthenticated();
        }
    };

    const performBiometricScan = async () => {
        try {
            await NativeBiometric.verifyIdentity({
                reason: "Access Zerox eSports",
                title: "Biometric Login",
                subtitle: "Confirm your identity",
                description: "Use Touch ID or Face ID to unlock",
            });

            // If we get here, it succeeded
            setIsLocked(false);
            onAuthenticated();
        } catch (e) {
            console.error("Authentication failed", e);
            // Don't auto-unlock on failure
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="p-6 bg-primary/20 rounded-full mb-6 border border-primary/30 shadow-[0_0_50px_rgba(217,70,239,0.3)]">
                <Lock size={64} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 font-display tracking-wider">LOCKED</h1>
            <p className="text-gray-400 mb-8 max-w-sm">
                Biometric security is enabled. Please verify your identity to continue.
            </p>

            <Button variant="primary" size="lg" onClick={performBiometricScan} className="min-w-[200px]">
                <ShieldCheck size={20} className="mr-2" />
                Scan Face/Fingerprint
            </Button>
        </div>
    );
};
