"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface UserTrackingData {
    ip: string;
    userAgent: string;
    screenResolution: string;
    platform: string;
    language: string;
    lastActive: any; // ServerTimestamp
    email?: string;
    displayName?: string;
    photoURL?: string;
}

export const useUserTracking = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const trackUser = async () => {
            try {
                // Fetch IP
                const ipResponse = await fetch("https://api.ipify.org?format=json");
                const ipData = await ipResponse.json();

                const trackingData: UserTrackingData = {
                    ip: ipData.ip,
                    userAgent: navigator.userAgent,
                    screenResolution: `${window.screen.width}x${window.screen.height}`,
                    platform: navigator.platform,
                    language: navigator.language,
                    lastActive: serverTimestamp(),
                    email: user.email || undefined,
                    displayName: user.displayName || undefined,
                    photoURL: user.photoURL || undefined,
                };

                // Update / users / {uid}
                // setDoc with merge: true to avoid overwriting existing non-tracking fields if any
                await setDoc(doc(db, "users", user.uid), trackingData, { merge: true });

                console.log("User tracked successfully:", user.email);

            } catch (error) {
                console.error("Error tracking user:", error);
            }
        };

        trackUser();
    }, [user]);
};
