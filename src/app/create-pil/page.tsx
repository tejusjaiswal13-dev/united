"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding, cosineSimilarity } from "@/lib/gemini";
import {
    Zap, Send, AlertCircle, ChevronLeft, Sparkles, Info, CheckCircle2,
    FileText, Link as LinkIcon, HelpCircle, ArrowRight, ChevronRight,
    Search, Upload, X, File, Image as ImageIcon, MapPin, Filter, Clock,
    Users, Paperclip, UploadCloud, ShieldAlert, Flame, MessageSquare, Scale
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface PIL {
    id: string;
    pilId: string;
    title: string;
    description: string;
    supporters: number;
    createdAt: { seconds: number; nanoseconds: number } | null;
    creatorName?: string;
    status?: string;
    evidenceFiles?: { name: string; url: string; type: string }[];
    embedding?: number[];
}

export default function CreatePIL() {
    const { user, login } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Public Safety");
    const [stateLocation, setStateLocation] = useState("");
    const [city, setCity] = useState("");
    const [sinceWhen, setSinceWhen] = useState("");
    const [affectedGroup, setAffectedGroup] = useState("");
    const [publicHealth, setPublicHealth] = useState("No");
    const [urgency, setUrgency] = useState("Low");
    const [complaintFiled, setComplaintFiled] = useState("No");

    // Existing detailed state
    const [description, setDescription] = useState(""); // "What is the problem?"
    const [evidenceDescription, setEvidenceDescription] = useState(""); // "What proof do you have?" (renamed from evidence to clarify)

    const [loading, setLoading] = useState(false);
    const [validation, setValidation] = useState("");
    const [validating, setValidating] = useState(false);
    const [duplicates, setDuplicates] = useState<PIL[]>([]);
    const [searchingDuplicates, setSearchingDuplicates] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState(1);
    const [duplicateScore, setDuplicateScore] = useState(0);
    const [draftRestored, setDraftRestored] = useState(false);

    useEffect(() => {
        if (title.length < 5 && description.length < 10) {
            setDuplicates([]);
            setDuplicateScore(0);
            return;
        }

        const timeoutId = setTimeout(async () => {
            console.log("Checking for duplicates...", { title, description });
            setSearchingDuplicates(true);
            try {
                // Fetch PILs and generate current embedding in parallel
                // Increase limit to scan more PILs for duplicates
                const q = query(collection(db, "pils"), limit(100));

                // Construct the full text for embedding to match storage logic
                const currentText = `${title} ${description} ${category} ${stateLocation} ${city}`;
                console.log("Generating embedding for:", currentText);

                const [currentEmbedding, snapshot] = await Promise.all([
                    generateEmbedding(currentText),
                    getDocs(q)
                ]);

                console.log("Fetch complete. PILs found:", snapshot.size);

                // Split PILs into those with/without embeddings
                const withEmbedding: { id: string; data: any; embedding: number[] }[] = [];
                const needsEmbedding: { id: string; data: any }[] = [];

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.embedding) {
                        withEmbedding.push({ id: docSnap.id, data, embedding: data.embedding });
                    } else if (data.description) {
                        needsEmbedding.push({ id: docSnap.id, data });
                    }
                });

                console.log("PILs with embedding:", withEmbedding.length, "Needs embedding:", needsEmbedding.length);

                // Generate missing embeddings in parallel (fast!) + cache them to Firestore
                const embeddingResults = await Promise.allSettled(
                    needsEmbedding.map(async (pil) => {
                        // Use full text for consistent embedding
                        const pilText = `${pil.data.title || ""} ${pil.data.description} ${pil.data.category || ""} ${pil.data.location?.state || ""} ${pil.data.location?.city || ""}`;
                        // Cache back to Firestore so future checks are instant
                        try {
                            const emb = await generateEmbedding(pilText);
                            updateDoc(doc(db, "pils", pil.id), { embedding: emb }).catch(e => console.warn("Failed to cache embedding", e));
                            return { ...pil, embedding: emb };
                        } catch (e) {
                            console.warn("Skipping embedding generation for", pil.id, e);
                            return null;
                        }
                    })
                );

                // Combine all PILs with embeddings
                const allPils = [
                    ...withEmbedding,
                    ...embeddingResults
                        .filter((r): r is PromiseFulfilledResult<{ id: string; data: any; embedding: number[] } | null> => r.status === "fulfilled")
                        .map(r => r.value)
                        .filter((r): r is { id: string; data: any; embedding: number[] } => r !== null)
                ];

                // Find the most similar
                let maxScore = 0;
                let mostSimilar: PIL | null = null;

                for (const pil of allPils) {
                    const score = cosineSimilarity(currentEmbedding, pil.embedding);
                    if (score > maxScore) {
                        maxScore = score;
                        mostSimilar = { id: pil.id, ...pil.data } as PIL;
                    }
                }

                console.log("Max Similarity Score:", maxScore, "Most Similar PIL:", mostSimilar?.title);

                if (maxScore > 0.6) {
                    setDuplicates(mostSimilar ? [mostSimilar] : []);
                    setDuplicateScore(maxScore);
                } else {
                    setDuplicates([]);
                    setDuplicateScore(0);
                }
            } catch (error) {
                console.error("Error searching duplicates:", error);
            } finally {
                setSearchingDuplicates(false);
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [title, category, stateLocation, city, description, sinceWhen, affectedGroup, evidenceDescription]);

    const validatePIL = async () => {
        if (!title || !description) return;
        setValidating(true);
        setValidation("");
        try {
            console.log("Starting AI validation with gemini-1.5-flash...");
            const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
            // Use gemini-2.5-flash (free tier available)
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `You are a legal expert helping a citizen refine a Public Interest Litigation (PIL). 
            Validate this PIL for clarity and impact.
            
            Output strictly in this format:
            1. **Strength**: One sentence on what is good.
            2. **Weakness**: One critical gap (if any).
            3. **Improvement**: One specific actionable suggestion.
            
            Keep it extremely concise (under 50 words total).
            
            Title: ${title}
            Category: ${category}
            Location: ${stateLocation}, ${city}
            Description: ${description}
            Since When: ${sinceWhen}
            Affected Group: ${affectedGroup}
            Evidence Description: ${evidenceDescription}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            setValidation(response.text());
        } catch (error: unknown) {
            console.error("Validation failed", error);
            if (error instanceof Error && error.message?.includes("404")) {
                setValidation("System review is currently undergoing maintenance. Please proceed with your draft.");
            } else {
                setValidation("Could not complete review at this time. The system is currently busy. Please proceed manually.");
            }
        } finally {
            setValidating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setUploading(true);

        try {
            const fileUrls = [];

            // 1. Upload Files to Firebase Storage
            for (const file of files) {
                const storageRef = ref(storage, `evidence/${user.uid}/${Date.now()}_${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                const url = await new Promise<string>((resolve, reject) => {
                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
                        },
                        (error: Error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
                fileUrls.push({
                    name: file.name,
                    url: url,
                    type: file.type
                });
            }

            // 2. Generate Embedding and Unique ID
            const descriptiveText = `${title} ${description} ${category} ${stateLocation} ${city}`;
            const embedding = await generateEmbedding(descriptiveText);
            const pilId = `PIL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            // 3. Save PIL with File URLs
            const docRef = await addDoc(collection(db, "pils"), {
                pilId,
                title: title.trim(),
                category: category || "Public Safety",
                location: {
                    state: stateLocation.trim(),
                    city: city.trim()
                },
                description: description.trim(),
                sinceWhen: sinceWhen.trim(),
                affectedGroup: affectedGroup.trim(),
                evidenceDescription: evidenceDescription.trim(),
                publicHealth: publicHealth,
                urgency: urgency,
                complaintFiled: complaintFiled,
                evidenceFiles: fileUrls,
                createdBy: user.uid,
                creatorName: user.displayName || "Anonymous",
                createdAt: serverTimestamp(),
                supporters: 0,
                status: "Awaiting Consensus",
                upvotedBy: [],
                embedding: embedding
            });
            localStorage.removeItem("pil_draft");
            router.push(`/pil/${docRef.id}`);
        } catch (error) {
            console.error("Error creating PIL:", error);
            alert("Failed to create petition. Please check your connection and try again.");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground">
                    <Info size={40} />
                </div>
                <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
                <p className="text-muted-foreground mb-8 max-w-md">
                    You must be signed in to draft and file a Public Interest Litigation on our platform.
                </p>
                <button
                    onClick={() => login()}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all"
                >
                    {t("nav.login")}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-background border-b border-border py-4 sticky top-[65px] z-30">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/tracker" className="p-2 hover:bg-muted rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight hidden sm:block">{t("create_pil.title")}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={validatePIL}
                            disabled={validating || !title || !description}
                            className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary/20 disabled:opacity-50 transition-all"
                        >
                            {validating ? <Scale size={16} className="animate-spin" /> : <Scale size={16} />}
                            <span className="hidden sm:inline">Check Legal Feasibility</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto">
                    {/* Form Left Side */}
                    <div className="lg:col-span-8 space-y-8">
                        <section className="bg-background p-8 rounded-3xl border border-border shadow-sm">
                            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-sm font-bold flex items-center gap-2">
                                                            <FileText size={16} className="text-primary" />
                                                            {t("create_pil.form_title")}
                                                        </label>
                                                        <span className={cn("text-xs font-medium", title.length > 90 ? "text-red-500" : "text-muted-foreground")}>
                                                            {title.length}/100
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                                                        placeholder={t("create_pil.placeholder_title")}
                                                        className="w-full text-lg font-semibold bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                            <Filter size={16} className="text-primary" />
                                                            Category
                                                        </label>
                                                        <select
                                                            value={category}
                                                            onChange={(e) => setCategory(e.target.value)}
                                                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                        >
                                                            <option>Environment</option>
                                                            <option>Public Safety</option>
                                                            <option>Corruption</option>
                                                            <option>Civic Infrastructure</option>
                                                            <option>Human Rights</option>
                                                            <option>Education</option>
                                                            <option>Healthcare</option>
                                                            <option>Other</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                            <MapPin size={16} className="text-primary" />
                                                            State
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={stateLocation}
                                                            onChange={(e) => setStateLocation(e.target.value)}
                                                            placeholder="e.g. Uttar Pradesh"
                                                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                            <MapPin size={16} className="text-primary" />
                                                            City
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={city}
                                                            onChange={(e) => setCity(e.target.value)}
                                                            placeholder="e.g. Lucknow"
                                                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3"
                                            >
                                                Continue to Details <ArrowRight size={20} />
                                            </button>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
                                                <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                                                    <Info size={18} />
                                                    Step 2: Issue Details
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Provide specific details to build a strong legal case.
                                                </p>
                                            </div>

                                            {/* AI Duplicate Detection Alert */}
                                            {duplicates.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl p-6 mb-8 shadow-sm"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl shrink-0 text-orange-600 dark:text-orange-400">
                                                            <Info size={24} />
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div>
                                                                <h4 className="text-orange-900 dark:text-orange-100 font-bold text-lg mb-1">
                                                                    Similar Litigation Record
                                                                </h4>
                                                                <p className="text-sm text-orange-700/80 dark:text-orange-300/80 leading-relaxed">
                                                                    The system has identified an existing petition that closely matches yours. Consolidating these records may strengthen the legal standing.
                                                                </p>
                                                            </div>

                                                            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-1">Detection Status</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">DUPLICATE MATCH</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-1">Similarity Score</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg font-mono font-bold text-orange-900 dark:text-orange-100">
                                                                            {(duplicateScore * 100).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="sm:col-span-2 pt-2 border-t border-orange-100 dark:border-orange-900/20">
                                                                    <div className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-2">Original Petition</div>
                                                                    <div className="flex items-center justify-between bg-white dark:bg-black/40 p-3 rounded-lg border border-orange-100 dark:border-orange-900/20">
                                                                        <div>
                                                                            <span className="block font-medium text-sm text-orange-900 dark:text-orange-100 line-clamp-1">{duplicates[0].title}</span>
                                                                            <span className="text-xs font-mono text-orange-500 dark:text-orange-400">{duplicates[0].pilId || duplicates[0].id}</span>
                                                                        </div>
                                                                        <Link
                                                                            href={`/pil/${duplicates[0].id}`}
                                                                            target="_blank"
                                                                            className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                        >
                                                                            View Status <ArrowRight size={14} />
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-sm font-bold flex items-center gap-2">
                                                        <FileText size={16} className="text-primary" />
                                                        What is the problem?
                                                    </label>
                                                    <span className={cn("text-xs font-medium", description.length > 4500 ? "text-red-500" : "text-muted-foreground")}>
                                                        {description.length}/5000
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                                                    placeholder="Describe the issue in detail..."
                                                    rows={6}
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold flex items-center gap-2">
                                                        <Clock size={16} className="text-primary" />
                                                        Since when is it happening?
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={sinceWhen}
                                                        onChange={(e) => setSinceWhen(e.target.value)}
                                                        placeholder="e.g. Last 6 months"
                                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold flex items-center gap-2">
                                                        <Users size={16} className="text-primary" />
                                                        Who is affected?
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={affectedGroup}
                                                        onChange={(e) => setAffectedGroup(e.target.value)}
                                                        placeholder="e.g. Residents of XYZ Colony"
                                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold flex items-center gap-2">
                                                    <Paperclip size={16} className="text-primary" />
                                                    What proof do you have?
                                                </label>
                                                <textarea
                                                    value={evidenceDescription}
                                                    onChange={(e) => setEvidenceDescription(e.target.value)}
                                                    placeholder="Describe any photos, documents, or reports you have..."
                                                    rows={3}
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none mb-2"
                                                />
                                                {/* File Upload UI */}
                                                <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center hover:bg-primary/5 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={handleFileChange}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="flex flex-col items-center gap-2">
                                                        <UploadCloud size={32} className="text-primary/60" />
                                                        <p className="font-bold text-lg">Click to Upload Evidence</p>
                                                        <p className="text-sm text-muted-foreground">Photos, PDFs, or Documents (Max 5MB)</p>
                                                    </div>
                                                </div>

                                                {files.length > 0 && (
                                                    <div className="space-y-2 mt-4">
                                                        {files.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white dark:bg-background/50 p-3 rounded-lg border border-border">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <FileText size={18} className="text-primary shrink-0" />
                                                                    <span className="text-sm font-medium truncate">{file.name}</span>
                                                                    <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFile(idx)}
                                                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                        <ShieldAlert size={16} className="text-primary" />
                                                        Public Health Impact?
                                                    </label>
                                                    <div className="flex gap-4">
                                                        {["Yes", "No"].map((opt) => (
                                                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="publicHealth"
                                                                    value={opt}
                                                                    checked={publicHealth === opt}
                                                                    onChange={(e) => setPublicHealth(e.target.value)}
                                                                    className="w-4 h-4 text-primary focus:ring-primary"
                                                                />
                                                                <span className="text-sm font-medium">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                        <Flame size={16} className="text-primary" />
                                                        Urgency
                                                    </label>
                                                    <select
                                                        value={urgency}
                                                        onChange={(e) => setUrgency(e.target.value)}
                                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                    >
                                                        <option>Low</option>
                                                        <option>Medium</option>
                                                        <option>High</option>
                                                        <option>Critical</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                                        <MessageSquare size={16} className="text-primary" />
                                                        Complaint Filed?
                                                    </label>
                                                    <div className="flex gap-4">
                                                        {["Yes", "No"].map((opt) => (
                                                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="complaintFiled"
                                                                    value={opt}
                                                                    checked={complaintFiled === opt}
                                                                    onChange={(e) => setComplaintFiled(e.target.value)}
                                                                    className="w-4 h-4 text-primary focus:ring-primary"
                                                                />
                                                                <span className="text-sm font-medium">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="flex-1 bg-muted text-foreground py-4 rounded-xl font-bold border border-border"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { validatePIL(); setStep(3); }}
                                                    className="flex-1 bg-primary text-white py-4 rounded-xl font-bold shadow-lg"
                                                >
                                                    Proceed to Review
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
                                                <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                                                    <CheckCircle2 size={18} />
                                                    Step 3: Review & Submit
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Review your details before filing. The system has checked for existing records.
                                                </p>
                                            </div>

                                            <div className="bg-muted/30 rounded-xl p-6 space-y-4 border border-border">
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Title & Category</h4>
                                                    <p className="font-bold text-lg">{title}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">{category}</span>
                                                        <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full font-medium">{city}, {stateLocation}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Affected Group</h4>
                                                        <p className="text-sm font-medium">{affectedGroup}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Since When</h4>
                                                        <p className="text-sm font-medium">{sinceWhen}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Problem Description</h4>
                                                    <p className="text-sm whitespace-pre-wrap">{description}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Evidence Summary</h4>
                                                    <p className="text-sm">{evidenceDescription}</p>
                                                    {files.length > 0 && (
                                                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                                            <Paperclip size={12} /> {files.length} files attached
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pre-Filing Review Section */}
                                            {validation && (
                                                <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2 mb-2">
                                                        <Scale size={16} /> Pre-Filing Review
                                                    </h4>
                                                    <div className="text-sm text-slate-700/80 dark:text-slate-400/80 prose prose-sm max-w-none font-medium">
                                                        <div dangerouslySetInnerHTML={{ __html: validation.replace(/\n/g, '<br/>') }} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    className="flex-1 bg-muted text-foreground py-4 rounded-xl font-bold border border-border"
                                                >
                                                    Back to Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSubmit}
                                                    disabled={loading || uploading}
                                                    className="flex-1 bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            {uploading ? "Uploading Evidence..." : "Filing Petition..."}
                                                        </>
                                                    ) : (
                                                        <>
                                                            Confirm & File PIL <Send size={20} />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </section>
                    </div>

                    {/* Right Side: Advice & AI Feedback */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Proactive Advice Section */}
                        <section className="bg-gradient-to-br from-indigo-500 to-primary p-6 rounded-3xl text-white shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <HelpCircle size={24} />
                                <h3 className="font-bold text-lg">{t("create_pil.advice_title")}</h3>
                            </div>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                {t("create_pil.advice_description")}
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { step: t("create_pil.step_1_title"), text: t("create_pil.step_1_desc") },
                                    { step: t("create_pil.step_2_title"), text: t("create_pil.step_2_desc") },
                                    { step: t("create_pil.step_3_title"), text: t("create_pil.step_3_desc") },
                                    { step: t("create_pil.step_4_title"), text: t("create_pil.step_4_desc") }
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                                        <div className="bg-white/20 h-6 w-12 flex items-center justify-center rounded text-[10px] font-bold shrink-0">
                                            {item.step}
                                        </div>
                                        <p className="text-xs leading-tight">{item.text}</p>
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full mt-6 bg-white text-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
                                View Full Guide <ArrowRight size={16} />
                            </button>
                        </section>

                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
                            <AlertCircle className="text-primary flex-shrink-0" size={24} />
                            <div className="text-sm">
                                <span className="font-bold block mb-1 text-primary">{t("create_pil.responsibility_title")}</span>
                                <p className="text-muted-foreground leading-relaxed">
                                    {t("create_pil.responsibility_desc")}
                                </p>
                            </div>
                        </div>

                        {/* Preview/Feedback Right Side */}
                        <AnimatePresence mode="wait">
                            {validation ? (
                                <motion.div
                                    key="ai-feedback"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-background rounded-3xl border border-primary/30 shadow-xl overflow-hidden"
                                >
                                    <div className="bg-primary px-6 py-4 flex items-center justify-between text-white">
                                        <div className="flex items-center gap-3">
                                            <Sparkles size={20} />
                                            <span className="font-bold">AI Legal Assistant</span>
                                        </div>
                                        <button onClick={() => setValidation("")} className="hover:bg-white/10 rounded-full p-1 transition-colors">
                                            <Info size={16} />
                                        </button>
                                    </div>
                                    <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {validation}
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => {
                                                    setValidation("");
                                                }}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={16} />
                                                Got it, thanks!
                                            </button>
                                            <button
                                                onClick={validatePIL}
                                                className="bg-muted text-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                            >
                                                <Zap size={16} />
                                                Re-analyze Draft
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="preview-placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-background/50 border border-border border-dashed rounded-3xl p-12 flex flex-col items-center text-center space-y-4"
                                >
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="font-bold mb-1">AI Feedback Pending</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Complete the title and description, then click &quot;{t("create_pil.ai_validate")}&quot;
                                            to get instant suggestions on your petition&apos;s strength.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Visual Preview */}
                        <div className="bg-indigo-950/5 border border-indigo-900/10 rounded-3xl p-8">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Live Preview Card</span>
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <div className="w-2 h-2 rounded-full bg-indigo-300" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Filed</div>
                                </div>
                                <h4 className={cn("text-lg font-bold mb-2", !title && "text-muted-foreground/20")}>
                                    {title || "Petition Title Appears Here"}
                                </h4>
                                <p className={cn("text-xs leading-relaxed mb-6", !description && "text-muted-foreground/10")}>
                                    {description ? (description.substring(0, 180) + "...") : "Your detailed case description will be summarized here for the public feed..."}
                                </p>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/10" />
                                        <div className="h-2 w-16 bg-muted rounded" />
                                    </div>
                                    <div className="h-6 w-16 bg-primary/5 rounded border border-primary/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
