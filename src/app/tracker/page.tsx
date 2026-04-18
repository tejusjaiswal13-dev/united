"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, limit } from "firebase/firestore";
import Link from "next/link";
import { hardcodedPils } from "@/lib/demoData";
import { useAuth } from "@/context/AuthContext";
import { generateEmbedding, cosineSimilarity } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    Search,
    Filter,
    TrendingUp,
    Clock,
    Flame,
    ChevronRight,
    ThumbsUp,
    Calendar,
    User as UserIcon,
    SearchX,
    Sparkles,
    Plus,
    MapPin,
    AlertCircle
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PIL {
    id: string;
    pilId?: string;
    title: string;
    description: string;
    supporters: number;
    createdAt: { seconds: number; nanoseconds: number } | null;
    createdBy: string;
    creatorName?: string;
    status?: string;
    category?: string;
    location?: { state: string; city: string };
    urgency?: string;
    embedding?: number[];
}

interface UnifiedThread {
    id: string;
    title: string;
    description: string;
    pils: PIL[];
}

export default function Tracker() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [pils, setPils] = useState<PIL[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("newest");
    const [searchQuery, setSearchQuery] = useState("");
    const [showMyPils, setShowMyPils] = useState(false);
    const [unifiedThreads, setUnifiedThreads] = useState<UnifiedThread[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(false);

    useEffect(() => {
        // Fetch all PILs and sort client-side to avoid complex index requirements for simple demo
        const q = query(collection(db, "pils"), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pilsData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    supporters: data.supporters || 0,
                    status: data.status || "filed",
                };
            }) as PIL[];
            if (pilsData.length === 0) {
                // Combine with demo data to always have something visible
                setPils([...hardcodedPils]);
                fetchUnifiedThreads([...hardcodedPils]);
            } else {
                setPils([...hardcodedPils, ...pilsData]);
                fetchUnifiedThreads([...hardcodedPils, ...pilsData]);
            }
            setLoading(false);
        }, (error) => {
            console.warn("Falling back to demo data due to Firebase Rules:", error.message);
            setPils([...hardcodedPils]);
            fetchUnifiedThreads([...hardcodedPils]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchUnifiedThreads = async (allPils: PIL[]) => {
        if (allPils.length < 2) return;
        setLoadingThreads(true);
        try {
            // Group semantically related PILs using embeddings
            const threads: UnifiedThread[] = [];
            const visited = new Set<string>();

            for (let i = 0; i < allPils.length; i++) {
                if (visited.has(allPils[i].id) || !allPils[i].embedding) continue;

                const currentGroup = [allPils[i]];
                visited.add(allPils[i].id);

                for (let j = i + 1; j < allPils.length; j++) {
                    if (visited.has(allPils[j].id) || !allPils[j].embedding) continue;

                    const similarity = cosineSimilarity(allPils[i].embedding!, allPils[j].embedding!);
                    if (similarity > 0.75) {
                        currentGroup.push(allPils[j]);
                        visited.add(allPils[j].id);
                    }
                }

                if (currentGroup.length > 1) {
                    // Use Gemini to generate a unified title/summary if we had more time/keys, 
                    // for now use a smart heuristic or simple prompt
                    threads.push({
                        id: `thread-${allPils[i].id}`,
                        title: `Unified Issue: ${currentGroup[0].title} & Others`,
                        description: `This thread combines ${currentGroup.length} related petitions concerning similar legal issues to help courts address them collectively.`,
                        pils: currentGroup
                    });
                }
            }
            setUnifiedThreads(threads);
        } catch (error) {
            console.error("Error generating unified threads:", error);
        } finally {
            setLoadingThreads(false);
        }
    };

    const filteredPils = pils
        .filter(pil => {
            const matchesSearch = pil.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pil.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesUser = showMyPils ? (user && pil.createdBy === user.uid) : true;
            return matchesSearch && matchesUser;
        })
        .sort((a, b) => {
            if (sortBy === "trending") {
                return b.supporters - a.supporters;
            } else if (sortBy === "hot") {
                // Hot = High support + Recent
                const scoreA = (a.supporters * 1.5) + (a.createdAt?.seconds || 0) / 100000;
                const scoreB = (b.supporters * 1.5) + (b.createdAt?.seconds || 0) / 100000;
                return scoreB - scoreA;
            } else {
                // Newest
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            }
        });

    const sortTabs = [
        { id: "trending", label: t("tracker.trending"), icon: TrendingUp },
        { id: "hot", label: t("tracker.hot"), icon: Flame },
        { id: "newest", label: t("tracker.newest"), icon: Clock },
    ];

    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase() || "awaiting consensus";
        switch (s) {
            case "hearing": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
            case "accepted": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "scrutiny": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            case "heard": return "bg-blue-600 text-white dark:bg-blue-800 dark:text-white";
            case "ready for review": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
            case "awaiting consensus": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header & Search */}
            <div className="bg-muted/30 border-b border-border py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("tracker.title")}</h1>
                            <p className="text-muted-foreground text-lg">
                                {t("tracker.description")}
                            </p>
                        </div>
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                            <input
                                type="text"
                                placeholder={t("tracker.search_placeholder")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Filters & Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex bg-muted p-1 rounded-xl">
                            {sortTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSortBy(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                                        sortBy === tab.id
                                            ? "bg-background text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {user && (
                            <button
                                onClick={() => setShowMyPils(!showMyPils)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                                    showMyPils
                                        ? "bg-primary text-white border-primary"
                                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                )}
                            >
                                {showMyPils ? "All PILs" : "My PILs"}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter size={16} />
                        <span>{t("tracker.showing_count")} {filteredPils.length}</span>
                    </div>
                </div>

                {/* Unified Threads Section */}
                {unifiedThreads.length > 0 && !showMyPils && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                    <Sparkles size={20} />
                                </div>
                                <h2 className="text-xl font-bold">Smart Unified Issue Threads</h2>
                                <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground font-medium">AI-Consolidated</span>
                            </div>
                            <Link href="/unified" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                                View All Threads →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {unifiedThreads.map((thread) => (
                                <div key={thread.id} className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-3xl p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex -space-x-2">
                                            {thread.pils.slice(0, 3).map((p, idx) => (
                                                <div key={idx} className="w-8 h-8 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                    {p.creatorName?.[0] || "A"}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-primary">{thread.pils.length} Related Petitions</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{thread.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                        {thread.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {thread.pils.map((p) => (
                                            <Link
                                                key={p.id}
                                                href={`/pil/${p.id}`}
                                                className="text-[10px] bg-background border border-border px-3 py-1.5 rounded-full hover:border-primary transition-colors flex items-center gap-1.5 font-medium"
                                            >
                                                {p.pilId || "PIL-..."}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl border" />
                        ))}
                    </div>
                ) : filteredPils.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredPils.map((pil) => (
                                <motion.div
                                    key={pil.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all"
                                >
                                    <div className="p-6 flex-grow">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md",
                                                getStatusStyles(pil.status || "Awaiting Consensus")
                                            )}>
                                                {pil.status || "Awaiting Consensus"}
                                            </span>
                                            <span className="text-xs font-black text-primary/40 uppercase tracking-tighter">
                                                {pil.pilId || `PIL-${pil.id.substring(0, 6).toUpperCase()}`}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                                <Calendar size={12} />
                                                {pil.createdAt ? new Date(pil.createdAt.seconds * 1000).toLocaleDateString() : "Pending"}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                            {pil.title}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                <Filter size={10} />
                                                {pil.category || "Social Welfare"}
                                            </span>
                                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full font-medium">
                                                <MapPin size={10} />
                                                {(pil.location?.city) ? `${pil.location.city}, ${pil.location.state}` : "New Delhi, Delhi"}
                                            </span>
                                            <span className={cn(
                                                "flex items-center gap-1 px-2 py-0.5 rounded-full font-bold",
                                                (pil.urgency === "Critical" || pil.urgency === "High") ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                            )}>
                                                <Flame size={10} />
                                                {pil.urgency || "Medium"}
                                            </span>
                                        </div>

                                        <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
                                            {pil.description}
                                        </p>

                                        <div className="flex items-center gap-3 mt-auto">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <UserIcon size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{pil.creatorName || "Anonymous Voter"}</span>
                                                <span className="text-[10px] text-muted-foreground">Citizen Petitioner</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <div className="bg-secondary/10 text-secondary p-1.5 rounded-lg">
                                                <ThumbsUp size={14} fill="currentColor" />
                                            </div>
                                            {pil.supporters || 0}
                                        </div>
                                        <Link
                                            href={`/pil/${pil.id}`}
                                            className="flex items-center gap-1 text-sm font-bold text-primary hover:underline group/link"
                                        >
                                            {t("tracker.view_details")}
                                            <ChevronRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                            <SearchX size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">{t("tracker.no_results")}</h3>
                            <p className="text-muted-foreground">Try adjusting your search or filters to find what you&apos;re looking for.</p>
                        </div>
                        <Link
                            href="/create-pil"
                            className="mt-4 flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl font-bold"
                        >
                            <Plus size={20} />
                            {t("tracker.start_petition")}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
