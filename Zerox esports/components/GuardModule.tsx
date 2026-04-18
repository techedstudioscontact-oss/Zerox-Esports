import React, { useEffect, useState } from 'react';

// Highly Obfuscated Security Guard
// It checks if the environment is either our Production domains OR has our Secret Local Key
const GuardModule: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const verifyIntegrity = () => {
            const host = window.location.hostname;
            
            // Allow production domains (Add yours here)
            const allowedHosts = [
                'localhost', 
                '127.0.0.1', 
                'zeroxesports.com',
                '.github.io' // Allows all github pages
            ];

            const isAuthorizedHost = allowedHosts.some(allowed => host.includes(allowed));
            
            if (!isAuthorizedHost) {
                 // Hacker trying to host on vercel, netlify, custom domain etc.
                console.error("FATAL: Unauthorized deployment domain.");
                const element = document.getElementById('root');
                if (element) {
                     element.innerHTML = '<div style="background:black;color:red;height:100vh;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:24px;text-align:center;">FATAL_ERROR:<br/>SECURITY_VIOLATION_0x99<br/>CODEBASE_TERMINATED</div>';
                }
                throw new Error("SECURITY_VIOLATION_0x99: Unauthorized Domain Execution");
            }

            // Localhost Trap - If they try to run it on their PC without the secret `.env.local`
            if ((host === 'localhost' || host === '127.0.0.1') && import.meta.env.VITE_MASTER_KEY !== 'ZRX_AUTHORISED_DEV_1A2B3C4D_LOCK') {
                console.error("FATAL: Unauthorized local execution. Master key missing or invalid.");
                
                 // Nuke the UI
                 const element = document.getElementById('root');
                 if (element) {
                      element.innerHTML = '<div style="background:black;color:red;height:100vh;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:24px;text-align:center;">FATAL_ERROR:<br/>LOCAL_EXECUTION_DENIED<br/>PIRACY_DETECTED</div>';
                 }

                // Crash the React Tree
                throw new Error("PIRACY_DETECTED: Unauthorized local execution. Self-destructing.");
            }

            setIsVerified(true);
        };

        verifyIntegrity();
    }, []);

    // Don't render ANYTHING until verified. If verification fails, it throws an error before reaching here.
    if (!isVerified) return <div className="h-screen w-screen bg-black"></div>;

    return <>{children}</>;
};

export default GuardModule;
