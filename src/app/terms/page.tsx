"use client";

import { motion } from "framer-motion";
import SplineScene from "@/components/ui/SplineScene";

export default function TermsOfService() {
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
                            Rules of Engagement
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                            Terms of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cosmic-purple">
                                Service
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground/80 font-medium leading-relaxed max-w-lg">
                            By using JanVichar, you agree to uphold the standards of civic responsibility and truth. Together, we build a platform for justice.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="h-[400px] lg:h-[500px] w-full relative"
                    >
                        {/* 3D Scene - Abstract Structure representing 'Foundation/Rules' */}
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

                    <TermSection title="1. Acceptance of Terms">
                        By accessing or using JanVichar, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
                    </TermSection>

                    <TermSection title="2. Purpose of the Platform">
                        JanVichar is a tool for legal empowerment and civic engagement. It allows users to draft Public Interest Litigations (PILs) and collect community support. <strong className="text-primary">This platform does not provide professional legal advice.</strong> All drafts should be reviewed by a qualified legal professional before submission to any court.
                    </TermSection>

                    <TermSection title="3. User Conduct">
                        You agree not to:
                        <ul className="list-disc list-inside mt-4 space-y-2 opacity-80">
                            <li>Submit false, misleading, or defamatory content.</li>
                            <li>Use the platform for any illegal or unauthorized purpose.</li>
                            <li>Attempt to gain unauthorized access to the admin portal or other user accounts.</li>
                        </ul>
                    </TermSection>

                    <TermSection title="4. Intellectual Property">
                        The content you submit remains yours, but you grant JanVichar a license to display and share this content within the platform for the purpose of community engagement and support gathering.
                    </TermSection>

                    <TermSection title="5. Limitation of Liability">
                        JanVichar and its developers are not liable for any legal consequences arising from the use of PIL drafts generated on this platform. The responsibility for the accuracy and legal validity of any submission rests solely with the user.
                    </TermSection>

                    <div className="pt-10 border-t border-border">
                        <p className="text-sm text-muted-foreground text-center">
                            Effective Date: February 13, 2026
                        </p>
                    </div>

                </div>
            </section>
        </div>
    );
}

function TermSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card/50 backdrop-blur-sm border border-white/5 p-8 rounded-3xl hover:bg-card/80 transition-all cursor-default"
        >
            <h2 className="text-2xl font-bold mb-4 text-primary">{title}</h2>
            <div className="text-muted-foreground leading-relaxed font-medium">
                {children}
            </div>
        </motion.div>
    );
}
