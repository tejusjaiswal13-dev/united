"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { hardcodedPils } from "@/lib/demoData";
import jsPDF from "jspdf";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    Share2,
    ThumbsUp,
    FileText,
    Download,
    ArrowLeft,
    Calendar,
    User as UserIcon,
    Scale,
    ExternalLink,
    ShieldAlert,
    Clock,
    CheckCircle2,
    Sparkles,
    Zap,
    Info,
    Image as ImageIcon,
    File,
    Paperclip,
    MapPin,
    Filter,
    Users,
    MessageSquare,
    Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface PIL {
    id: string;
    pilId: string;
    title: string;
    description: string;
    evidence: string; // Deprecated
    evidenceDescription?: string;
    supporters: number;
    createdAt: { seconds: number; nanoseconds: number } | null;
    createdBy: string;
    creatorName?: string;
    status?: string;
    upvotedBy?: string[];
    hearingResult?: string;
    hearingDate?: string;
    evidenceFiles?: { name: string; url: string; type: string }[];
    category?: string;
    location?: { state: string; city: string };
    urgency?: string;
    sinceWhen?: string;
    affectedGroup?: string;
    publicHealth?: string;
    complaintFiled?: string;
}

export default function PILDetail() {
    const { id } = useParams();
    // ... (rest of imports)

    // Helper to get safe values
    const getSafePIL = (data: PIL): PIL => ({
        ...data,
        category: data.category || "General Social Welfare",
        location: data.location || { city: "New Delhi", state: "Delhi" },
        urgency: data.urgency || "Medium",
        sinceWhen: data.sinceWhen || "Not specified",
        affectedGroup: data.affectedGroup || "General Public",
        publicHealth: data.publicHealth || "No",
        complaintFiled: data.complaintFiled || "No",
        evidenceDescription: data.evidenceDescription || data.evidence || "No specific evidence description provided."
    });
    const router = useRouter();
    const { user, login } = useAuth();
    const [pil, setPil] = useState<PIL | null>(null);
    const [loading, setLoading] = useState(true);
    const [upvoted, setUpvoted] = useState(false);
    const [upvoting, setUpvoting] = useState(false);
    const [summary, setSummary] = useState("");
    const [summarizing, setSummarizing] = useState(false);

    useEffect(() => {
        const fetchPIL = async () => {
            if (!id) return;
            const demoPil = hardcodedPils.find(p => p.id === id);
            if (demoPil) {
                setPil(getSafePIL({ ...demoPil, evidence: "" } as unknown as PIL));
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "pils", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as PIL;
                    const safeData = getSafePIL({ ...data, id: docSnap.id });
                    setPil(safeData);
                    if (user && data.upvotedBy?.includes(user.uid)) {
                        setUpvoted(true);
                    }
                }
            } catch (error: unknown) {
                console.error("Error fetching PIL", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPIL();
    }, [id, user]);

    const generateSummary = async () => {
        if (!pil) return;
        setSummarizing(true);
        setSummary("");

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API key is missing");
            setSummary("AI features are currently unavailable. Please check configuration.");
            setSummarizing(false);
            return;
        }

        try {
            console.log("Requesting summary from gemini-2.0-flash...");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `Specifically for this legal case titled "${pil.title}", 
            provide a 3-bullet point "Citizen's Brief" summary.
            Focus on:
            1. Why this case matters to a regular citizen.
            2. The specific change being requested from the court.
            3. The current status and what to expect next.
            
            Case Content: ${pil.description.substring(0, 5000)}
            
            Response format: Plain markdown bullet points. No conversational filler. Keep it sharp and professional.`;

            let result;
            try {
                result = await model.generateContent(prompt);
            } catch (innerError: unknown) {
                // If 2.0-flash failed for some reason, we could try gemini-pro if available, 
                // but for this key we stay with what works.
                console.error("Gemini request failed:", innerError);
                throw innerError;
            }

            const response = await result.response;
            const text = response.text();

            if (text) {
                setSummary(text);
            } else {
                throw new Error("Empty response from AI");
            }
        } catch (error: unknown) {
            console.error("AI Summarization failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setSummary(`Could not generate summary (Error: ${errorMessage.substring(0, 50)}). Please read the full statement below.`);
        } finally {
            setSummarizing(false);
        }
    };

    const handleUpvote = async () => {
        if (!user) {
            login();
            return;
        }
        if (upvoted || upvoting || !pil) return;

        setUpvoting(true);
        try {
            const docRef = doc(db, "pils", id as string);
            const CONSENSUS_THRESHOLD = 200; // Updated threshold
            const newSupporters = pil.supporters + 1;

            // Check for consensus threshold
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates: any = {
                supporters: increment(1),
                upvotedBy: arrayUnion(user.uid)
            };

            if (newSupporters >= CONSENSUS_THRESHOLD && pil.status === "Awaiting Consensus") {
                updates.status = "Ready for Review";
            }

            await updateDoc(docRef, updates);
            setPil(prev => prev ? {
                ...prev,
                supporters: newSupporters,
                status: (newSupporters >= CONSENSUS_THRESHOLD && prev.status === "Awaiting Consensus") ? "Ready for Review" : prev.status
            } : null);
            setUpvoted(true);
        } catch (error) {
            console.error("Error upvoting", error);
        } finally {
            setUpvoting(false);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: pil?.title,
                text: `Support this PIL on JanVichar: ${pil?.title}`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const exportPDF = () => {
        if (!pil) return;
        const pdf = new jsPDF();

        pdf.setFillColor(30, 58, 138);
        pdf.rect(0, 0, 210, 45, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.text("JanVichar", 20, 25);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text("OFFICIAL PUBLIC INTEREST LITIGATION DRAFT", 20, 35);

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text(pdf.splitTextToSize(pil.title, 170), 20, 65);

        pdf.setFontSize(11);
        const date = pil.createdAt ? new Date(pil.createdAt.seconds * 1000).toLocaleDateString() : "Draft";
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Filing Status: ${(pil.status || "Filed").toUpperCase()} | Generated on: ${date}`, 20, 85);
        pdf.text(`Supporters: ${pil.supporters} Citizens`, 20, 92);

        pdf.setDrawColor(220, 220, 220);
        pdf.line(20, 100, 190, 100);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(30, 58, 138);
        pdf.text("STATEMENT OF CASE:", 20, 115);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        const splitDesc = pdf.splitTextToSize(pil.description, 170);
        pdf.text(splitDesc, 20, 125);

        let currentY = 125 + (splitDesc.length * 6);

        if (pil.evidence) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(30, 58, 138);
            pdf.text("SUPPORTING EVIDENCE:", 20, currentY + 15);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            const splitEvidence = pdf.splitTextToSize(pil.evidence, 170);
            pdf.text(splitEvidence, 20, currentY + 25);
            currentY += 25 + (splitEvidence.length * 6);
        }

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        const disclaimer = "This document is a community-generated draft. It is not a legal filing in any court of law. For actual litigation, please consult a registered Advocate.";
        pdf.text(pdf.splitTextToSize(disclaimer, 170), 20, 280);

        pdf.save(`JanVichar_PIL_${pil.id.substring(0, 8)}.pdf`);
    };

    const getStatusInfo = (status: string) => {
        const s = status?.toLowerCase() || "awaiting consensus";
        switch (s) {
            case "hearing": return { label: "In Hearing", color: "bg-purple-500", light: "bg-purple-100 text-purple-700" };
            case "accepted": return { label: "Accepted", color: "bg-green-500", light: "bg-green-100 text-green-700" };
            case "scrutiny": return { label: "Under Scrutiny", color: "bg-amber-500", light: "bg-amber-100 text-amber-700" };
            case "heard": return { label: "Heard", color: "bg-blue-600", light: "bg-blue-600 text-white" };
            case "ready for review": return { label: "Ready for Review", color: "bg-green-600", light: "bg-green-100 text-green-700" };
            case "awaiting consensus": return { label: "Awaiting Consensus", color: "bg-amber-500", light: "bg-amber-100 text-amber-700" };
            default: return { label: status || "Awaiting Consensus", color: "bg-blue-500", light: "bg-blue-100 text-blue-700" };
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
                <p className="text-muted-foreground animate-pulse font-medium">Retrieving PIL record...</p>
            </div>
        );
    }

    if (!pil) {
        return (
            <div className="container mx-auto px-4 py-32 text-center">
                <h1 className="text-3xl font-bold mb-4">Record Not Found</h1>
                <p className="text-muted-foreground mb-8">This PIL might have been removed or the link is incorrect.</p>
                <Link href="/tracker" className="text-primary font-bold hover:underline">Return to Tracker</Link>
            </div>
        );
    }

    const status = getStatusInfo(pil.status || "filed");

    return (
        <div className="min-h-screen bg-background">
            {/* Context Header */}
            <div className="bg-muted/30 border-b border-border py-4 px-4 sticky top-[65px] z-30 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.push("/tracker")}
                        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back Tracking
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                            title="Share Petition"
                        >
                            <Share2 size={20} />
                        </button>
                        <button
                            onClick={exportPDF}
                            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-all"
                        >
                            <Download size={16} />
                            Download Draft
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 max-w-5xl">
                <article className="space-y-12">
                    {/* Hero Metadata */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest", status.light)}>
                                {status.label}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-border" />
                            <span className="text-xs font-black text-primary/60 uppercase tracking-tighter bg-primary/5 px-2 py-0.5 rounded">
                                {pil.pilId || `PIL-${pil.id.substring(0, 6).toUpperCase()}`}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-border" />
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Clock size={14} />
                                {pil.createdAt ? new Date(pil.createdAt.seconds * 1000).toLocaleDateString() : "Recently Filed"}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-primary">
                            {pil.title}
                        </h1>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            {pil.category && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    <Filter size={14} />
                                    {pil.category}
                                </span>
                            )}
                            {pil.location && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                                    <MapPin size={14} />
                                    {pil.location.city}, {pil.location.state}
                                </span>
                            )}
                            {pil.urgency && (
                                <span className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold",
                                    pil.urgency === "Critical" || pil.urgency === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                )}>
                                    <Flame size={14} />
                                    {pil.urgency} Urgency
                                </span>
                            )}
                        </div>

                        {/* Detailed Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                            {pil.affectedGroup && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                        <Users size={12} /> Affected Group
                                    </p>
                                    <p className="font-medium text-sm">{pil.affectedGroup}</p>
                                </div>
                            )}
                            {pil.sinceWhen && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                        <Clock size={12} /> Since When
                                    </p>
                                    <p className="font-medium text-sm">{pil.sinceWhen}</p>
                                </div>
                            )}
                            {pil.publicHealth && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                        <ShieldAlert size={12} /> Public Health Impact
                                    </p>
                                    <p className={cn("font-medium text-sm", pil.publicHealth === "Yes" ? "text-red-600 font-bold" : "")}>
                                        {pil.publicHealth}
                                    </p>
                                </div>
                            )}
                            {pil.complaintFiled && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                        <MessageSquare size={12} /> Complaint Filed
                                    </p>
                                    <p className="font-medium text-sm">{pil.complaintFiled}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                    <UserIcon size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-black">{pil.creatorName || "Anonymous Petitioner"}</div>
                                    <div className="text-xs text-muted-foreground font-medium">Verified Citizen Petitioner</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-2xl border border-border">
                                    <div className="px-6 py-2">
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Supporters</div>
                                        <div className="text-2xl font-black text-primary">{pil.supporters}</div>
                                    </div>
                                    <button
                                        onClick={handleUpvote}
                                        disabled={upvoted || upvoting}
                                        className={cn(
                                            "px-8 py-3 rounded-xl font-black transition-all flex items-center gap-2 shadow-lg",
                                            upvoted
                                                ? "bg-green-100 text-green-700 shadow-green-200/50"
                                                : "bg-secondary text-white shadow-secondary/30 hover:-translate-y-1 active:scale-95"
                                        )}
                                    >
                                        {upvoting ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                        ) : (
                                            <ThumbsUp size={20} className={cn(upvoted && "fill-current")} />
                                        )}
                                        {upvoted ? "Signed" : "Sign Petition"}
                                    </button>
                                </div>

                                {/* Consensus Progress */}
                                {(() => {
                                    const THRESHOLD = 200;
                                    const progress = Math.min((pil.supporters / THRESHOLD) * 100, 100);
                                    const consensusMet = pil.supporters >= THRESHOLD;
                                    return (
                                        <div className={cn(
                                            "p-5 rounded-2xl border transition-all duration-300",
                                            consensusMet
                                                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                                                : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                                        )}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black uppercase tracking-widest opacity-70 flex items-center gap-2">
                                                    {consensusMet ? <CheckCircle2 size={14} /> : <Users size={14} />}
                                                    Consensus Check
                                                </span>
                                                <span className={cn(
                                                    "text-xs font-bold px-3 py-1 rounded-full border",
                                                    consensusMet
                                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700"
                                                        : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700"
                                                )}>
                                                    {consensusMet ? "Target Met" : "In Progress"}
                                                </span>
                                            </div>

                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm font-bold mb-2">
                                                    <span className="text-2xl">{pil.supporters}</span>
                                                    <span className="text-muted-foreground self-end">/ {THRESHOLD}</span>
                                                </div>
                                                <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-1000 ease-out relative",
                                                            consensusMet ? "bg-emerald-500" : "bg-amber-500"
                                                        )}
                                                        style={{ width: `${progress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={cn(
                                                "rounded-xl p-3 text-sm font-medium flex items-center gap-3 border",
                                                consensusMet
                                                    ? "bg-emerald-100/50 border-emerald-200/50 text-emerald-900 dark:text-emerald-100"
                                                    : "bg-amber-100/50 border-amber-200/50 text-amber-900 dark:text-amber-100"
                                            )}>
                                                {consensusMet ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                                                            <Scale size={16} className="text-emerald-800" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs uppercase opacity-70">Status</div>
                                                            <div>Ready for Legal Review</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                                                            <Users size={16} className="text-amber-800" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs uppercase opacity-70">Next Step</div>
                                                            <div>Need <strong>{THRESHOLD - pil.supporters}</strong> more signatures</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Official Hearing Result Section */}
                    {pil.hearingResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-blue-600 text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden ring-4 ring-blue-500/20"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Scale size={160} />
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">Official Hearing Result</h3>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Formal Court Pronouncement</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                                    <p className="text-xl font-medium leading-relaxed italic">
                                        &quot;{pil.hearingResult}&quot;
                                    </p>
                                    {pil.hearingDate && (
                                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-100">
                                            <Calendar size={16} />
                                            Decision Date: {pil.hearingDate}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* AI Summary Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group "
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-xl">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-primary tracking-tight">AI Briefing</h3>
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Powered by Google Gemini</p>
                                    </div>
                                </div>
                                <button
                                    onClick={generateSummary}
                                    disabled={summarizing}
                                    className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                                >
                                    {summarizing ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <Zap size={18} />
                                    )}
                                    {summary ? "Regenerate Summary" : "Generate Instant Summary"}
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {summarizing ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="py-12 flex flex-col items-center gap-4 border-2 border-dashed border-muted rounded-3xl"
                                    >
                                        <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
                                        <p className="text-sm font-black text-muted-foreground animate-pulse">Analyzing legal documents...</p>
                                    </motion.div>
                                ) : summary ? (
                                    <motion.div
                                        key="summary"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="bg-muted/30 p-8 rounded-3xl border border-border"
                                    >
                                        <div className="prose prose-slate dark:prose-invert max-w-none">
                                            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                                {summary}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="placeholder"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-muted/10 p-10 rounded-3xl border border-dashed border-border flex flex-col items-center text-center gap-4"
                                    >
                                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                                            <Info size={24} />
                                        </div>
                                        <div className="max-w-md">
                                            <p className="text-sm text-muted-foreground font-medium">
                                                Complex legal text can be hard to digest. Use our AI assistant to get a high-level briefing of this PIL.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-12">
                            <section className="space-y-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <FileText className="text-primary" size={24} />
                                    Statement of Case
                                </h2>
                                <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                                    <div className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                        {pil.description}
                                    </div>
                                </div>
                            </section>

                            {(pil.evidence || pil.evidenceDescription || (pil.evidenceFiles && pil.evidenceFiles.length > 0)) && (
                                <section className="space-y-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <Scale className="text-primary" size={24} />
                                        Evidence & Resources
                                    </h2>

                                    {(pil.evidence || pil.evidenceDescription) && (
                                        <div className="bg-muted/30 border border-border border-dashed rounded-3xl p-8 italic text-muted-foreground relative overflow-hidden">
                                            <div className="relative z-10 flex gap-4">
                                                <ExternalLink className="flex-shrink-0 text-primary/30" size={24} />
                                                <div className="whitespace-pre-wrap">{pil.evidenceDescription || pil.evidence}</div>
                                            </div>
                                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                                <ShieldAlert size={120} />
                                            </div>
                                        </div>
                                    )}

                                    {pil.evidenceFiles && pil.evidenceFiles.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                                <Paperclip size={16} />
                                                Digital Attachments
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {pil.evidenceFiles.map((file, i) => (
                                                    <a
                                                        key={i}
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                                                            {file.type.startsWith("image/") ? <ImageIcon size={24} /> : <File size={24} />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sm font-bold truncate">{file.name}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                                                {file.type.split('/')[1]?.toUpperCase() || "FILE"} DOCUMENT
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="space-y-8">
                            <div className="bg-secondary/5 border border-secondary/20 rounded-3xl p-8 space-y-6">
                                <h3 className="font-bold text-secondary flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    Case Milestones
                                </h3>
                                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-secondary/10">
                                    {[
                                        { date: pil.createdAt, label: "Petition Drafted", done: true },
                                        { date: null, label: "Community Validation", done: pil.supporters > 10 },
                                        { date: null, label: "Legal Expert Review", done: false },
                                        { date: null, label: "Court Submission", done: false }
                                    ].map((step, i) => (
                                        <div key={i} className="relative pl-8 group">
                                            <div className={cn(
                                                "absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-background transition-colors",
                                                step.done ? "bg-secondary" : "bg-muted"
                                            )} />
                                            <div className="text-sm font-bold truncate">{step.label}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {step.date ? new Date(step.date.seconds * 1000).toLocaleDateString() : (step.done ? "Milestone Reached" : "Pending Action")}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-indigo-950 p-8 rounded-3xl text-white space-y-4">
                                <ShieldAlert className="text-blue-400" size={28} />
                                <h3 className="font-bold text-lg">Legal Disclaimer</h3>
                                <p className="text-xs text-indigo-100/60 leading-relaxed font-medium">
                                    Every submission on JanVichar is community-verified.
                                    This draft does not automatically constitute a legal proceeding.
                                    Citizens are advised to seek professional legal counsel before
                                    physical submission to any High Court or the Supreme Court of India.
                                </p>
                                <div className="pt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Transparency First
                                </div>
                            </div>
                        </aside>
                    </div>
                </article>
            </div>
        </div>
    );
}
