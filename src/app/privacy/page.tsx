"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SplineScene from "@/components/ui/SplineScene";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden">

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-cosmic-900/20 z-0 pointer-events-none" />
                <div className="container mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">

                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Legal Framework
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                            Privacy <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cosmic-purple">
                                Protocol
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground/80 font-medium leading-relaxed max-w-lg">
                            Your data sovereignty is our priority. We use advanced encryption and minimal data collection to ensure your voice is heard without compromising your identity.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="h-[400px] lg:h-[500px] w-full relative"
                    >
                        {/* 3D Scene - Abstract Sphere representing 'Digital Security' */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
                        <SplineScene
                            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                            className="w-full h-full"
                        />
                    </motion.div>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-4 py-20 max-w-4xl">
                <div className="space-y-12">

                    <PolicySection title="1. Information Collection">
                        We collect information to facilitate the PIL process. This includes your name, email (for authentication), and IP address (for security and abuse prevention). We do not sell your personal data to third parties.
                    </PolicySection>

                    <PolicySection title="2. Public Visibility">
                        Petitions (PILs) filed on JanVichar are public documents. Your name as the creator will be visible to support transparency in public interest litigations.
                    </PolicySection>

                    <PolicySection title="3. Data Security">
                        We employ industry-standard encryption (SSL/TLS) for data in transit. Our database is secured with strict access controls. Only authorized administrators can access sensitive user logs.
                    </PolicySection>

                    <PolicySection title="4. Cookies & Tracking">
                        We use local storage and cookies solely for maintaining your session and preferences (like Dark Mode). We use a custom lightweight tracking system to monitor platform usage and prevent bot activity.
                    </PolicySection>

                    <div className="pt-10 border-t border-border">
                        <p className="text-sm text-muted-foreground text-center">
                            Last Updated: October 25, 2026 • Effective Date: Immediate
                        </p>
                    </div>

                </div>
            </section>
        </div>
    );
}

function PolicySection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card/50 backdrop-blur-sm border border-white/5 p-8 rounded-3xl hover:bg-card/80 transition-all cursor-default"
        >
            <h2 className="text-2xl font-bold mb-4 text-primary">{title}</h2>
            <p className="text-muted-foreground leading-relaxed font-medium">
                {children}
            </p>
        </motion.div>
    );
}
