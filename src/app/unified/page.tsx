"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { generateEmbedding, cosineSimilarity } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { hardcodedPils } from "@/lib/demoData";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Sparkles, RefreshCw, ExternalLink, ArrowLeft, Hash, Users, ChevronRight } from "lucide-react";

interface PIL {
    id: string;
    title: string;
    description: string;
    embedding?: number[];
    supporters: number;
    status: string;
    pilId?: string;
}

interface Thread {
    id: string;
    pilIds: string[];
    pils: PIL[];
    summary: string;
    issueTitle: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt?: any;
}

export default function UnifiedPage() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const [consolidating, setConsolidating] = useState(false);
    const [pils, setPils] = useState<PIL[]>([]);

    // Fetch existing threads and PILs
    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch threads
            const threadsSnap = await getDocs(collection(db, "threads"));
            const fetchedThreads: Thread[] = [];

            // Fetch all PILs for reference
            const pilsSnap = await getDocs(query(collection(db, "pils"), limit(50)));
            const allPils: PIL[] = pilsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PIL));
            setPils(allPils);

            for (const tDoc of threadsSnap.docs) {
                const data = tDoc.data();
                const threadPils = allPils.filter(p => data.pilIds?.includes(p.id));
                fetchedThreads.push({
                    id: tDoc.id,
                    pilIds: data.pilIds || [],
                    pils: threadPils,
                    summary: data.summary || "",
                    issueTitle: data.issueTitle || "Untitled Thread",
                    createdAt: data.createdAt
                });
            }

            setThreads(fetchedThreads);
        } catch (error) {
            console.warn("Falling back to demo data for unified threads.");
            setPils([...hardcodedPils]);
            setThreads([{
                id: "demo-thread-1",
                pilIds: hardcodedPils.map(p => p.id),
                pils: hardcodedPils,
                summary: "This is an AI generated summary demonstrating how related civic action petitions are consolidated into single active threads. Due to security rules, live data is hidden.",
                issueTitle: "Demo: Civic Action Consolidation",
                createdAt: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    }

    async function runConsolidation() {
        setConsolidating(true);
        try {
            // Fetch all PILs
            const pilsSnap = await getDocs(query(collection(db, "pils"), limit(50)));
            const allPils: PIL[] = pilsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PIL));

            // Generate embeddings for PILs that don't have them
            const pilsWithEmbeddings: (PIL & { embedding: number[] })[] = [];

            for (const pil of allPils) {
                let emb = pil.embedding;
                if (!emb && pil.description) {
                    try {
                        emb = await generateEmbedding(pil.description);
                    } catch { continue; }
                }
                if (emb) {
                    pilsWithEmbeddings.push({ ...pil, embedding: emb });
                }
            }

            // Pairwise cosine similarity clustering
            const THRESHOLD = 0.75;
            const used = new Set<string>();
            const groups: PIL[][] = [];

            for (let i = 0; i < pilsWithEmbeddings.length; i++) {
                if (used.has(pilsWithEmbeddings[i].id)) continue;

                const group: PIL[] = [pilsWithEmbeddings[i]];
                used.add(pilsWithEmbeddings[i].id);

                for (let j = i + 1; j < pilsWithEmbeddings.length; j++) {
                    if (used.has(pilsWithEmbeddings[j].id)) continue;

                    const sim = cosineSimilarity(pilsWithEmbeddings[i].embedding, pilsWithEmbeddings[j].embedding);
                    if (sim > THRESHOLD) {
                        group.push(pilsWithEmbeddings[j]);
                        used.add(pilsWithEmbeddings[j].id);
                    }
                }

                if (group.length >= 2) {
                    groups.push(group);
                }
            }

            // Generate summaries and save to Firestore
            const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const newThreads: Thread[] = [];

            for (const group of groups) {
                const textsJoined = group.map((p, i) => `PIL ${i + 1}: "${p.title}" - ${p.description?.substring(0, 200)}`).join("\n\n");

                let summary = "";
                let issueTitle = "";

                try {
                    const result = await model.generateContent(
                        `You are consolidating related Public Interest Litigations for court filing in India.
                        
Given these related PIL petitions:
${textsJoined}

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "issueTitle": "A short unified title for this group of issues (max 10 words)",
  "summary": "A 2-3 sentence cohesive issue statement summarizing all related PILs for a unified court filing"
}`
                    );
                    const text = result.response.text().replace(/```json|```/g, "").trim();
                    const parsed = JSON.parse(text);
                    summary = parsed.summary;
                    issueTitle = parsed.issueTitle;
                } catch {
                    issueTitle = `Related Issues: ${group[0].title}`;
                    summary = `${group.length} related petitions addressing similar concerns.`;
                }

                const threadData = {
                    pilIds: group.map(p => p.id),
                    summary,
                    issueTitle,
                    createdAt: serverTimestamp(),
                    pilCount: group.length,
                    totalSupporters: group.reduce((sum, p) => sum + (p.supporters || 0), 0)
                };

                const threadRef = await addDoc(collection(db, "threads"), threadData);

                newThreads.push({
                    id: threadRef.id,
                    ...threadData,
                    pils: group
                });
            }

            setThreads(newThreads);
            setPils(allPils);
        } catch (error) {
            console.warn("Error consolidating (Using Demo Data):", error);
            setPils([...hardcodedPils]);
            setThreads([{
                id: "demo-thread-1",
                pilIds: hardcodedPils.map(p => p.id),
                pils: hardcodedPils,
                summary: "This is an AI generated summary demonstrating how related civic action petitions are consolidated into single active threads. Due to security rules, live data is hidden.",
                issueTitle: "Demo: Civic Action Consolidation",
                createdAt: new Date()
            }]);
        } finally {
            setConsolidating(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-background border-b border-border py-4 sticky top-[65px] z-30">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/tracker" className="p-2 hover:bg-muted rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                <Layers size={22} className="text-primary" />
                                Unified Issue Threads
                            </h1>
                            <p className="text-xs text-muted-foreground">AI-consolidated petitions for court filing</p>
                        </div>
                    </div>
                    <button
                        onClick={runConsolidation}
                        disabled={consolidating}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        {consolidating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                Consolidating...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                Run Consolidation
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-10 max-w-5xl">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total PILs</p>
                                <p className="text-3xl font-black text-primary">{pils.length}</p>
                            </div>
                            <Hash size={28} className="text-primary/20" />
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unified Threads</p>
                                <p className="text-3xl font-black text-secondary">{threads.length}</p>
                            </div>
                            <Layers size={28} className="text-secondary/20" />
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PILs Grouped</p>
                                <p className="text-3xl font-black text-green-600">
                                    {threads.reduce((sum, t) => sum + t.pilIds.length, 0)}
                                </p>
                            </div>
                            <Users size={28} className="text-green-600/20" />
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent animate-spin rounded-full mb-4" />
                        <p className="text-muted-foreground font-medium">Loading threads...</p>
                    </div>
                ) : threads.length === 0 ? (
                    <div className="text-center py-20 space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                            <Sparkles size={40} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">No Threads Yet</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Click &quot;Run Consolidation&quot; to use AI to group similar petitions into unified issue threads for court filing.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {threads.map((thread, idx) => (
                                <motion.div
                                    key={thread.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    {/* Thread Header */}
                                    <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-6 border-b border-border">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                        Thread #{idx + 1}
                                                    </span>
                                                    <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                        {thread.pilIds.length} PILs Consolidated
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold tracking-tight">{thread.issueTitle}</h3>
                                            </div>
                                            <div className="bg-primary/10 p-2.5 rounded-xl">
                                                <Layers size={22} className="text-primary" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Summary */}
                                    <div className="p-6 border-b border-border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles size={14} className="text-primary" />
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI-Generated Unified Summary</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-muted-foreground">{thread.summary}</p>
                                    </div>

                                    {/* Linked PILs */}
                                    <div className="p-6">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Linked Petitions</p>
                                        <div className="space-y-2">
                                            {thread.pils.map((pil) => (
                                                <Link
                                                    key={pil.id}
                                                    href={`/pil/${pil.id}`}
                                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded uppercase">
                                                            {pil.pilId || `PIL-${pil.id.slice(0, 6).toUpperCase()}`}
                                                        </span>
                                                        <span className="text-sm font-medium">{pil.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">{pil.supporters || 0} supporters</span>
                                                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
