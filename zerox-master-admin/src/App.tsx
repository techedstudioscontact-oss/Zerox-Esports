import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setAdminEmail(user?.email ?? null);
            setChecking(false);
        });
        return unsub;
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!adminEmail) {
        return <Login onLogin={() => { }} />;
    }

    return <Dashboard adminEmail={adminEmail} />;
}
