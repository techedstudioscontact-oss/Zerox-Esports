import React, { useEffect, useState, useRef } from 'react';
import { SystemSettings } from '../services/systemService';
import { User } from '../types';

interface GlobalBackgroundProps {
    settings: SystemSettings | null;
    user: User | null;
}

export const GlobalBackground: React.FC<GlobalBackgroundProps> = ({ settings, user }) => {
    const showLiveBg = user?.showLiveBg !== false; // Default to true
    const videoUrl = settings?.bgVideoUrl;
    const imageUrl = settings?.bgImageUrl;

    // We'll use a simple CSS-based petal animation overlay
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black">
            {/* Background Layer */}
            {showLiveBg && videoUrl ? (
                <video
                    key={videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                    onCanPlayThrough={(e) => (e.currentTarget.style.opacity = '1')}
                    style={{ opacity: 0 }}
                >
                    <source src={videoUrl} type="video/mp4" />
                </video>
            ) : imageUrl ? (
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-black" />
            )}

            {/* Overlay Tint */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Sakura Petals Overlay */}
            <SakuraPetals />
        </div>
    );
};

const SakuraPetals: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none sakura-container">
            {[...Array(20)].map((_, i) => (
                <div 
                    key={i} 
                    className="sakura-petal"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${10 + Math.random() * 20}s`,
                        opacity: 0.4 + Math.random() * 0.5,
                        width: `${10 + Math.random() * 15}px`,
                        height: `${8 + Math.random() * 10}px`,
                    }}
                />
            ))}
        </div>
    );
};
