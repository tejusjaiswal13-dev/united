"use client";

import { useUserTracking } from "@/hooks/useUserTracking";

export default function TrackingWrapper() {
    useUserTracking();
    return null;
}
