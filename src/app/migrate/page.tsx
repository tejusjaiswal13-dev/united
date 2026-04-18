"use client";
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function MigratePage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ seen: 0, updated: 0, skipped: 0 });

    async function runMigration() {
        if (loading) return;
        setLoading(true);
        setLogs(prev => [...prev, "🚀 Starting full scan of 'pils' collection..."]);

        try {
            const querySnapshot = await getDocs(collection(db, "pils"));
            let updatedCount = 0;
            let seenCount = 0;

            setLogs(prev => [...prev, `Found ${querySnapshot.size} total documents to check.`]);

            for (const docSnap of querySnapshot.docs) {
                seenCount++;
                const data = docSnap.data();
                const supporters = data.supporters || 0;
                const status = data.status || "Awaiting Consensus";
                const docRef = doc(db, "pils", docSnap.id);

                let action = null;
                const THRESHOLD = 200;

                // Case 1: Prematurely promoted (supporters < 200 but status is Ready)
                if (supporters < THRESHOLD && status === "Ready for Review") {
                    await updateDoc(docRef, { status: "Awaiting Consensus" });
                    action = `FIXED: Reverted to Awaiting Consensus (Supporters: ${supporters} < ${THRESHOLD})`;
                    updatedCount++;
                }
                // Case 2: Should be promoted but isn't (supporters >= 200 but status is Awaiting)
                else if (supporters >= THRESHOLD && status === "Awaiting Consensus") {
                    await updateDoc(docRef, { status: "Ready for Review" });
                    action = `PROMOTED: Updated to Ready for Review (Supporters: ${supporters} >= ${THRESHOLD})`;
                    updatedCount++;
                }

                if (action) {
                    setLogs(prev => [...prev, `[${docSnap.id}] ${data.title?.substring(0, 30)}... -> ${action}`]);
                }
            }

            setStats({ seen: seenCount, updated: updatedCount, skipped: seenCount - updatedCount });
            setLogs(prev => [...prev, "✅ Migration complete!"]);
        } catch (e: unknown) {
            console.error(e);
            setLogs(prev => [...prev, `❌ Error: ${e instanceof Error ? e.message : String(e)}`]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-10 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Data Migration Utility</h1>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
                <h2 className="font-bold text-amber-800 mb-2">Threshold Update: 200 Upvotes</h2>
                <ul className="text-sm list-disc pl-5 space-y-1 text-amber-900">
                    <li>Reverts PILs with &lt; 200 votes to &quot;Awaiting Consensus&quot;</li>
                    <li>Promotes PILs with &ge; 200 votes to &quot;Ready for Review&quot;</li>
                </ul>
            </div>

            <button
                onClick={runMigration}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                id="start-migration-btn"
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        Scanning Documents...
                    </>
                ) : (
                    "Start Migration Scan"
                )}
            </button>

            {stats.seen > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.seen}</div>
                        <div className="text-xs text-muted-foreground uppercase">Scanned</div>
                    </div>
                    <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.updated}</div>
                        <div className="text-xs uppercase">Updated</div>
                    </div>
                    <div className="bg-blue-100 text-blue-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.skipped}</div>
                        <div className="text-xs uppercase">Unchanged</div>
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-gray-900 text-green-400 rounded-xl h-96 overflow-auto font-mono text-xs shadow-inner">
                {logs.length === 0 ? (
                    <span className="text-gray-500 italic">Waiting to start...</span>
                ) : (
                    logs.map((log, i) => <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>)
                )}
            </div>
        </div>
    );
}
