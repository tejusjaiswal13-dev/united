"use client";

import { motion } from "framer-motion";


import { Users, Shield, Globe, Award } from "lucide-react";

export default function AboutUs() {
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
                            Our Mission
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                            Redefining <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cosmic-purple">
                                Justice
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground/80 font-medium leading-relaxed max-w-lg">
                            JanVichar is a platform built to bridge the gap between citizens and the judicial system. harnessing the power of technology to amplify your voice.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="h-[400px] lg:h-[500px] w-full relative flex items-center justify-center"
                    >
                        {/* CSS-based Crowd Network Visual */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />

                            <div className="relative w-72 h-72">
                                {/* Orbiting Dots representing citizens */}
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            rotate: 360,
                                        }}
                                        transition={{
                                            duration: 10 + i * 2,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        className="absolute inset-0"
                                        style={{ transform: `rotate(${i * 30}deg)` }}
                                    >
                                        <div className="w-3 h-3 bg-primary rounded-full absolute -top-1.5 left-1/2 -ml-1.5 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    </motion.div>
                                ))}

                                {/* Central Core */}
                                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/20 to-cosmic-purple/20 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-inner">
                                    <Users className="w-16 h-16 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                </div>

                                {/* Connecting Lines (Simulated with rotating borders) */}
                                <div className="absolute inset-0 border-2 border-dashed border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
                                <div className="absolute inset-16 border-2 border-dotted border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-muted/10 relative">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black mb-4">Core Values</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            We believe in a justice system that is accessible, transparent, and powered by the people.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <ValueCard
                            icon={<Users className="w-8 h-8 text-primary" />}
                            title="Crowd Power"
                            description="Uniting voices to create a stronger impact. Every signature counts towards change."
                        />
                        <ValueCard
                            icon={<Shield className="w-8 h-8 text-cosmic-purple" />}
                            title="Absolute Trust"
                            description="Built on secure, transparent technology. Your data and your cause are protected."
                        />
                        <ValueCard
                            icon={<Globe className="w-8 h-8 text-cyan-500" />}
                            title="Universal Access"
                            description="Breaking down barriers to legal recourse. Justice accessible to everyone, everywhere."
                        />
                    </div>
                </div>
            </section>

            {/* Team/Story Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="bg-card border border-border rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="md:w-1/2 space-y-6 relative z-10">
                        <div className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm">
                            <Award size={18} /> The Genesis
                        </div>
                        <h2 className="text-4xl font-black">Born from Necessity</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            JanVichar began as a simple idea: that the law should serve the people, not intimidate them.
                            Recognizing the complexity of filing Public Interest Litigations (PILs), we set out to create a
                            tool that simplifies the process, gathering community support to give weight to genuine causes.
                        </p>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Today, we are a growing community of changemakers, developers, and legal experts working together
                            to make justice a reality for all.
                        </p>
                    </div>
                    <div className="md:w-1/2 w-full h-[300px] md:h-[400px] bg-muted/20 rounded-2xl flex items-center justify-center border border-white/5 relative overflow-hidden group">
                        {/* Placeholder for Team Image or 3D Abstract */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cosmic-purple/20 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                        <span className="font-black text-2xl text-muted-foreground/30 relative z-10">Our Story Visualization</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="p-8 rounded-3xl bg-card border border-border shadow-lg hover:shadow-primary/10 transition-all cursor-default relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>
            <div className="bg-background/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-border">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
                {description}
            </p>
        </motion.div>
    );
}
