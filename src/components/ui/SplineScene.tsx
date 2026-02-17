"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Spline to avoid SSR issues
const Spline = dynamic(() => import('@splinetool/react-spline'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="w-8 h-8 border-4 border-cosmic-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
    ),
}) as any;

interface SplineSceneProps {
    scene: string;
    className?: string;
}

export default function SplineScene({ scene, className }: SplineSceneProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className={`relative w-full h-full ${className}`}>
            {/* Placeholder/Fallback while loading or if fails */}
            <Spline
                scene={scene}
                onLoad={() => setIsLoaded(true)}
                className="w-full h-full"
            />

            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    {/* Optional Loading Overlay can be removed if dynamic loading handles it well */}
                </div>
            )}
        </div>
    );
}
