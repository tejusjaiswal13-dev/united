"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Clock, AlertTriangle, Users, Monitor, Smartphone, Globe } from "lucide-react";

interface PIL {
    id: string;
    title: string;
    description: string;
    supporters: number;
    createdAt: unknown;
    creatorName?: string;
    category?: string;
    location?: { state: string; city: string };
    urgency?: string;
    status?: string;
    hearingResult?: string;
    hearingDate?: string;
}

interface UserData {
    id: string;
    email?: string;
    displayName?: string;
    ip?: string;
    userAgent?: string;
    platform?: string;
    lastActive?: Timestamp;
    photoURL?: string;
}

export default function AdminPortal() {
    const { loading: authLoading } = useAuth();
    const router = useRouter();
    const [pils, setPils] = useState<PIL[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [healing, setHealing] = useState(false);
    const [activeTab, setActiveTab] = useState<"pils" | "users">("pils");

    useEffect(() => {
        const isAdmin = localStorage.getItem("jv_admin_session") === "true";
        if (!isAdmin) {
            router.push("/admin-login");
            return;
        }

        // Fetch PILs
        const qPils = query(collection(db, "pils"), orderBy("createdAt", "desc"));
        const unsubscribePils = onSnapshot(qPils, (snapshot) => {
            const pilsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as PIL[];
            setPils(pilsData);
        });

        // Fetch Users (for analytics)
        // Note: Creating a query for users. If 'lastActive' doesn't exist on all, orderBy might filter them out in some security rules/indexes.
        // For now, simpler query.
        const qUsers = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const usersData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as UserData[];
            // Client-side sort for users to avoid index issues immediately
            usersData.sort((a, b) => (b.lastActive?.toMillis() || 0) - (a.lastActive?.toMillis() || 0));
            setUsers(usersData);
            setLoading(false);
        });

        return () => {
            unsubscribePils();
            unsubscribeUsers();
        };
    }, [router]);

    const handleAdminLogout = () => {
        localStorage.removeItem("jv_admin_session");
        router.push("/");
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this PIL? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "pils", id));
            } catch (error) {
                console.error("Error deleting PIL", error);
                alert("Failed to delete PIL.");
            }
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, "pils", id), { status });
        } catch (error) {
            console.error("Error updating status", error);
            alert("Failed to update status.");
        }
    };

    const healLegacyData = async () => {
        if (!confirm("This will overwrite missing fields with default values for all PILs. Continue?")) return;
        setHealing(true);
        let updatedCount = 0;
        try {
            const updates = pils.map(async (pil) => {
                const needsUpdate = !pil.category || !pil.location || !pil.urgency;
                if (needsUpdate) {
                    await updateDoc(doc(db, "pils", pil.id), {
                        category: pil.category || "Public Safety",
                        location: pil.location || { state: "India", city: "New Delhi" },
                        urgency: pil.urgency || "Medium"
                    });
                    updatedCount++;
                }
            });
            await Promise.all(updates);
            alert(`Successfully healed ${updatedCount} legacy records.`);
        } catch (error) {
            console.error("Error healing data:", error);
            alert("Failed to heal data. Check console.");
        } finally {
            setHealing(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="w-12 h-12 border-4 border-cosmic-purple border-t-transparent animate-spin rounded-full" />
                <p className="font-bold text-muted-foreground animate-pulse">Loading Admin Portal...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-background">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 pb-6 border-b border-border">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-primary">JanVichar Admin</h2>
                    <p className="text-muted-foreground font-medium mt-1">Central Command & Analytics</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("pils")}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === "pils" ? "bg-white dark:bg-zinc-800 shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            PILs
                        </button>
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === "users" ? "bg-white dark:bg-zinc-800 shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Users
                        </button>
                    </div>

                    <div className="bg-destructive/10 text-destructive px-4 py-1.5 rounded-full text-sm font-bold border border-destructive/20 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        Live
                    </div>
                    <button
                        onClick={handleAdminLogout}
                        className="bg-foreground text-background px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg text-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {activeTab === "pils" ? (
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-cosmic-900 text-white">
                                    <tr>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Petition Details</th>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Category/Loc</th>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Creator</th>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap text-center">Support</th>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Status</th>
                                        <th className="p-5 font-bold text-sm uppercase tracking-widest whitespace-nowrap text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pils.map((pil) => (
                                        <tr key={pil.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="p-5 max-w-xs">
                                                <div className="font-black text-foreground mb-1 group-hover:text-primary transition-colors truncate" title={pil.title}>{pil.title}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono opacity-50">ID: {pil.id}</div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded w-fit">
                                                        {pil.category || "N/A"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {pil.urgency || "N/A"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {pil.location?.city || "Unknown"}, {pil.location?.state || ""}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                                        {pil.creatorName?.charAt(0) || "A"}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-muted-foreground">{pil.creatorName || "Anonymous"}</span>
                                                        <span className="text-[10px] text-muted-foreground/60">Citizen</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-black">
                                                    {pil.supporters}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <div className="space-y-2">
                                                    <select
                                                        value={pil.status || "Filed"}
                                                        onChange={(e) => updateStatus(pil.id, e.target.value)}
                                                        className="w-full bg-background border border-border p-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:border-primary/50 transition-all font-mono"
                                                    >
                                                        <option value="Filed">Filed</option>
                                                        <option value="Under Review">Under Review</option>
                                                        <option value="Admitted">Admitted</option>
                                                        <option value="Hearing">Hearing</option>
                                                        <option value="Heard">Heard (Concluded)</option>
                                                        <option value="Rejected">Rejected</option>
                                                        <option value="Success">Success</option>
                                                    </select>

                                                    {pil.status === "Heard" && (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                placeholder="Enter hearing result..."
                                                                defaultValue={pil.hearingResult || ""}
                                                                onBlur={(e) => updateDoc(doc(db, "pils", pil.id), { hearingResult: e.target.value })}
                                                                className="w-full text-[10px] p-2 bg-muted/50 border border-border rounded-md font-medium"
                                                                rows={2}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Result Date (e.g. 15 Oct 2026)"
                                                                defaultValue={pil.hearingDate || ""}
                                                                onBlur={(e) => updateDoc(doc(db, "pils", pil.id), { hearingDate: e.target.value })}
                                                                className="w-full text-[10px] p-2 bg-muted/50 border border-border rounded-md font-mono"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => router.push(`/pil/${pil.id}`)}
                                                        className="p-2.5 bg-muted text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all active:scale-90"
                                                        title="View/Edit Details"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(pil.id)}
                                                        className="p-2.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl transition-all active:scale-90"
                                                        title="Delete PIL"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="p-8 bg-destructive/5 border border-destructive/10 rounded-3xl flex flex-col sm:flex-row items-center gap-6 justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive shrink-0">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-destructive">Administrative Safeguards</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl font-medium">
                                    You have full authority to modify and remove records from the core database. Please exercise extreme caution.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={healLegacyData}
                            disabled={healing}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {healing ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Clock size={18} />}
                            {healing ? "Healing..." : "Heal Legacy Data"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Users className="text-primary" /> User Analytics
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{users.length} Active</span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#1e293b] text-white">
                                <tr>
                                    <th className="p-4 font-bold text-xs uppercase tracking-widest">User Details</th>
                                    <th className="p-4 font-bold text-xs uppercase tracking-widest">IP Address</th>
                                    <th className="p-4 font-bold text-xs uppercase tracking-widest">Platform / Agent</th>
                                    <th className="p-4 font-bold text-xs uppercase tracking-widest text-right">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                                                    {user.displayName ? user.displayName.charAt(0) : "U"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">{user.displayName || "Unknown User"}</div>
                                                    <div className="text-xs text-muted-foreground">{user.email || "No Email"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-muted-foreground" />
                                                {user.ip || "Unknown"}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-bold flex items-center gap-2">
                                                    {user.platform?.includes("Win") ? <Monitor size={14} /> : <Smartphone size={14} />}
                                                    {user.platform || "Unknown OS"}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={user.userAgent}>
                                                    {user.userAgent}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-xs font-medium text-muted-foreground">
                                            {user.lastActive?.toDate().toLocaleString() || "Never"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
