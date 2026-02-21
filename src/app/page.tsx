"use client";

import { useRef, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ArrowRight, CheckCircle2, Globe, Scale, Shield, Users, Zap, FileText } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import FloatingCard from "@/components/ui/FloatingCard";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const features = [
    {
      title: "Crowd-Sourced Justice",
      description: "Gather thousands of signatures to give weight to your cause before legal submission.",
      icon: <Users className="w-6 h-6 text-cosmic-purple" />,
    },
    {
      title: "Pre-Filing Review",
      description: "Our automated legal engine checks your draft for relevance and formatting.",
      icon: <Scale className="w-6 h-6 text-cyan-400" />,
    },
    {
      title: "Secure & transparent",
      description: "End-to-end encryption ensures your data and identity remain protected.",
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
    },
    {
      title: "Legal Formatting",
      description: "Automatically generate court-ready PDFs from your drafted content.",
      icon: <FileText className="w-6 h-6 text-amber-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cosmic-purple/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-primary shadow-glow">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              v2.0 Beta Live
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              Justice <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cosmic-purple to-cyan-400 animate-gradient-x">
                Defies Gravity
              </span>
            </h1>

            <p className="text-xl text-muted-foreground/80 font-medium leading-relaxed max-w-lg">
              Elevate local issues to national attention. Draft, validate, and gather support for Public Interest Litigations with the power of technology and community.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/create-pil">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center gap-2 transition-all"
                >
                  Draft a PIL <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/learn">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 px-8 py-4 rounded-xl font-bold text-lg backdrop-blur-sm transition-all"
                >
                  How it Works
                </motion.button>
              </Link>
            </div>

            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] text-white z-${10 - i}`}>
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>Joined by 10,000+ citizens today</span>
            </div>
          </motion.div>

          {/* Premium CSS-based Justice Orb Visual */}
          <div className="relative h-[500px] w-full lg:h-[700px] hidden md:flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Outer Glows */}
              <div className="absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
              <div className="absolute w-[300px] h-[300px] bg-cosmic-purple/20 rounded-full blur-[80px] animate-pulse delay-700" />

              {/* The Justice Orb */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="relative w-64 h-64 rounded-full bg-gradient-to-br from-primary via-cosmic-purple to-cyan-500 p-[2px] shadow-2xl shadow-primary/20 group"
              >
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center relative overflow-hidden backdrop-blur-3xl">
                  {/* Internal Orbits */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />

                  {/* Floating Icons representing components of justice */}
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="z-10"
                  >
                    <Scale className="w-24 h-24 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                  </motion.div>

                  {/* Geometric Accents */}
                  <div className="absolute border border-white/5 w-[120%] h-[120%] rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute border border-white/5 w-[140%] h-[140%] rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                </div>
              </motion.div>

              {/* Stats Cards floating around */}
              <motion.div
                animate={{ x: [0, 10, 0], y: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-1/4 right-0 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-white">4.2k PILs Filed</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ x: [0, -10, 0], y: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute bottom-1/4 left-0 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold text-white">Digital Courts Ready</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid with Floating Cards */}
      <section className="py-24 bg-cosmic-900/50 backdrop-blur-sm relative z-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-6">Power to the People</h2>
            <p className="text-lg text-muted-foreground">Advanced tools usually reserved for top law firms, now in your hands.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <FloatingCard key={idx} className="h-full">
                <div className="h-full p-8 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all flex flex-col gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-cosmic-purple rounded-3xl opacity-20 blur-2xl transform -rotate-3" />
            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Scale className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Judicial Trust</h3>
                  <p className="text-sm text-muted-foreground">Aligned with e-Courts Standards</p>
                </div>
              </div>
              <div className="space-y-4">
                {["Constitutional Reference Check", "Jurisdiction Compatibility", "Pre-submission formatting"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Make Your Case <br />
              <span className="text-primary">Undeniable</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              A PIL with 10,000 signatures and system-verified citations is harder to ignore. We provide the infrastructure to turn local grievances into legal movements.
            </p>
            <Link href="/unified">
              <button className="px-8 py-4 rounded-xl font-bold border-b-4 border-primary bg-primary/10 hover:bg-primary/20 text-primary transition-all">
                Explore Active Campaigns
              </button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
