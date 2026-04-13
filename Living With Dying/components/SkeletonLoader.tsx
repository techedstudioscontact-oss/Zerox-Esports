import React from 'react';

interface SkeletonProps {
    className?: string;
    count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`animate-pulse bg-white/10 rounded ${className}`}
                />
            ))}
        </>
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="bg-[#1a1a1e] rounded-lg overflow-hidden border border-white/5 mx-2 my-2 min-w-[150px] md:min-w-[200px] h-full flex flex-col">
            <div className="aspect-[2/3] w-full bg-white/10 animate-pulse" />
            <div className="p-3 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
            </div>
        </div>
    );
};
