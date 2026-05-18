"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowRight, 
  FiCode, 
  FiZap, 
  FiUsers, 
  FiLock, 
  FiUnlock, 
  FiTerminal,
  FiCheckCircle,
  FiShield,
  FiCompass,
  FiDatabase,
  FiLayers
} from "react-icons/fi";

// Safe fallback definition for Google branding vector
const GoogleIconSVG = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  
  // 1. DYNAMIC AUTHENTICATION SECURITY SYSTEM STATES
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; avatar: string } | null>(null);
  const [interceptedTarget, setInterceptedTarget] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-[#070B14]" />;

  // Initial dummy institution reference tracking tokens
  const sampleCollegeId = "a7K9x2M5pQ1w"; // Points to Newton School of Technology

  // 2. INTERACTIVE ROUTE GATEWAY CONTROLLER
  // Blocks layout navigation until authentication parameters are securely validated
  const executeProtectedNavigation = (targetPath: string, event?: React.MouseEvent) => {
    if (!isAuthenticated) {
      if (event) event.preventDefault();
      setInterceptedTarget(targetPath);
      setIsModalOpen(true);
    }
  };

  // 3. GOOGLE SECURITY HANDSHAKE SIMULATION
  const triggerGoogleAuthHandshake = () => {
    setAuthLoading(true);
    // Simulates an asynchronous security layer response delay
    setTimeout(() => {
      setIsAuthenticated(true);
      setAuthLoading(false);
      setIsModalOpen(false);
      setUserProfile({
        name: "Developer Student Node",
        email: "builder@peergrid.edu",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60"
      });
      
      // Auto-forwards to target if an intent was logged
      if (interceptedTarget) {
        window.location.href = interceptedTarget;
      }
    }, 1300);
  };

  const terminateSession = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setInterceptedTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white selection:bg-[#6C63FF]/30 select-none overflow-x-hidden font-sans relative">
      
      {/* AMBIENT GLOW BACKDROPS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-[#6C63FF]/10 via-[#4FD1C5]/5 to-transparent blur-[140px] pointer-events-none z-0" />

      {/* STICKY GLASSMORPHIC TOP CONTROL BAR */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-[#070B14]/80 backdrop-blur-xl border-b border-white/[0.04] z-40">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Platform Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center shadow-lg shadow-[#6C63FF]/20">
              <span className="font-black text-xs tracking-tighter text-white">PG</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">PeerGrid</span>
              <span className="text-[9px] text-[#4FD1C5] tracking-widest uppercase block font-mono font-bold leading-none mt-0.5">Verified Hub</span>
            </div>
          </div>

          {/* Core System Status Badges */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-400">
            <a href="#definition" className="hover:text-white transition-colors">What is PeerGrid?</a>
            <a href="#architecture" className="hover:text-white transition-colors">Relational Schema</a>
            
            <Link 
              href={`/colleges/${sampleCollegeId}`}
              onClick={(e) => executeProtectedNavigation(`/colleges/${sampleCollegeId}`, e)}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Explore Campuses</span>
              {!isAuthenticated && <FiLock size={10} className="text-gray-500" />}
            </Link>
          </div>

          {/* Authentication Session Manager Button */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 pl-2.5 pr-3 py-1 rounded-xl">
                <img src={userProfile?.avatar} className="w-6 h-6 rounded-lg object-cover border border-white/10" alt="Session Node" />
                <div className="hidden sm:block text-left">
                  <div className="text-[10px] font-bold text-white leading-tight">{userProfile?.name}</div>
                  <div className="text-[9px] text-emerald-400 font-mono leading-none">Session Guard Active</div>
                </div>
                <button 
                  onClick={terminateSession}
                  className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setInterceptedTarget(null); setIsModalOpen(true); }}
                className="h-9 px-4 rounded-xl bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20 border border-[#6C63FF]/30 text-xs font-bold tracking-wide text-[#818cf8] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <FiLock size={12} />
                <span>Initialize Gateway</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* CORE EXPLANATORY HERO MATRICES */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10 min-h-[80vh]">
        
        {/* Left Informative Pillar Text Block */}
        <div className="max-w-2xl text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full text-[10px] font-mono font-bold tracking-widest text-[#4FD1C5] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5] animate-ping" />
            Security Interceptor: Active Gated Layer
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
            Discover What Modern <br />
            <span className="bg-gradient-to-r from-[#6C63FF] via-[#818cf8] to-[#4FD1C5] bg-clip-text text-transparent">
              Campuses Are Actually Building.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
            Archaic university brochures offer no real data. PeerGrid brings full transparency to institutional ecosystems by hosting real-time project logs, technical metrics, and peer connections directly from verified computer science students.
          </p>

          {/* SECURITY ACCESS NOTICE */}
          <div className="p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-2xl max-w-xl mx-auto lg:mx-0 flex items-start gap-3 text-left">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 shrink-0 mt-0.5">
              <FiShield size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-200">Gated Access Layer Protection</h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                To safeguard the integrity of student submissions and database configurations, browsing the system requires a verified single sign-on (SSO) handshake.
              </p>
            </div>
          </div>

          {/* INTERACTIVE LINK TRIGGERS */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            {isAuthenticated ? (
              <Link
                href={`/colleges/${sampleCollegeId}`}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#5a52f5] hover:shadow-lg hover:shadow-[#6C63FF]/20 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Enter Institutional Feed</span>
                <FiUnlock size={13} />
              </Link>
            ) : (
              <button
                onClick={() => executeProtectedNavigation(`/colleges/${sampleCollegeId}`)}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#5a52f5] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>Unlock Platform Console</span>
                <FiLock size={13} />
              </button>
            )}
            
            <a 
              href="#architecture"
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs font-bold tracking-wider text-gray-300 hover:text-white uppercase flex items-center justify-center transition-all"
            >
              Analyze Schema Mechanics
            </a>
          </div>
        </div>

        {/* Right Graphical Visual Block - The Platform Core Map */}
        <div className="w-full lg:w-[460px] aspect-[4/5] bg-[#0b0f17] border border-white/[0.06] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
          
          {/* Header element */}
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <div className="flex items-center gap-2">
              <FiDatabase className="text-[#6C63FF]" size={14} />
              <span className="text-[11px] font-bold text-white tracking-wide">Data Flow Engine Topology</span>
            </div>
            <div className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              isAuthenticated ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              <div className={`w-1 h-1 rounded-full ${isAuthenticated ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>{isAuthenticated ? "UNLOCKED" : "SECURED_GATE"}</span>
            </div>
          </div>

          {/* CENTRAL NODE DIAGRAM SCHEMATIC */}
          <div className="my-auto space-y-4">
            
            {/* Relational Table 1 */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/10 text-[#818cf8] border border-[#6C63FF]/20 flex items-center justify-center">
                  <FiUsers size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">users_dummy_data.ts</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Tracks unique user_id handles & courses</p>
                </div>
              </div>
              <FiCheckCircle size={14} className="text-[#4FD1C5]" />
            </div>

            {/* Relational Connector Arrow */}
            <div className="h-4 w-0.5 bg-dashed border-l border-white/10 mx-7 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-mono tracking-tighter">FOREIGN_KEY</div>
            </div>

            {/* Relational Table 2 */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4FD1C5]/10 text-[#4FD1C5] border border-[#4FD1C5]/20 flex items-center justify-center">
                  <FiTerminal size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">post_dummy_data.ts</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Houses project code logs & document assets</p>
                </div>
              </div>
              <FiCheckCircle size={14} className="text-[#4FD1C5]" />
            </div>

            {/* Relational Connector Arrow */}
            <div className="h-4 w-0.5 bg-dashed border-l border-white/10 mx-7 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-mono tracking-tighter">FOREIGN_KEY</div>
            </div>

            {/* Relational Table 3 */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">
                  <FiCompass size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">collages_dummy_data.ts</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Stores 10-point granular diagnostic scoring</p>
                </div>
              </div>
              <FiCheckCircle size={14} className="text-[#4FD1C5]" />
            </div>

          </div>

          {/* Interactive footer tracker */}
          <p className="text-[10px] text-gray-500 text-center leading-normal border-t border-white/[0.04] pt-2 font-mono">
            Relational integrity mapping verified dynamically at runtime.
          </p>
        </div>
      </section>

      {/* SECTION: PLATFORM DEFINITION & PURPOSE DETAILS */}
      <section id="definition" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.03]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold font-mono tracking-widest text-[#6C63FF] uppercase block">Core Objective</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Why Does PeerGrid Exist?
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
              Most platforms mix user profile records directly with communication metrics, leading to heavy datasets that are difficult to update. PeerGrid isolates the platform layers to separate code assets from personal identifiers.
            </p>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
              By referencing only decoupled relation keys like <code className="text-[#4FD1C5] font-mono">user_id</code> and <code className="text-amber-400 font-mono">collage_id</code> inside the timeline data streams, user identity queries run efficiently on client builds.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Campus Choice Engineering", text: "Allows incoming computer science students to parse verified feedback before committing financial capital.", icon: <FiCode className="text-[#4FD1C5]" /> },
              { title: "Decentralized Network Mapping", text: "Helps student engineers showcase multi-variable backpropagation vectors and custom Go syntax workflows without noise.", icon: <FiLayers className="text-[#818cf8]" /> },
              { title: "Granular Scoring Metrics", text: "Audits target campus networks transparently across custom parameters including startup capitalization and active hacking groups.", icon: <FiZap className="text-amber-400" /> },
              { title: "Decoupled Interface Elements", text: "Maintains independent follow, like, and collection markers completely separate from individual database records.", icon: <FiLock className="text-rose-400" /> },
            ].map((box, i) => (
              <div key={i} className="p-4 bg-[#0b0f17] border border-white/[0.04] rounded-2xl space-y-3 shadow-md">
                <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-sm">{box.icon}</div>
                <h3 className="text-xs font-bold text-white tracking-wide">{box.title}</h3>
                <p className="text-[11.5px] text-gray-400 leading-relaxed font-normal">{box.text}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION: DETAILED SCHEMA ARCHITECTURE RULES */}
      <section id="architecture" className="py-16 border-t border-white/[0.03] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold tracking-widest uppercase text-[#4FD1C5] font-mono">Data Flow Protocols</span>
          <h2 className="text-2xl font-black tracking-tight text-white">Relational Integrity Constraints</h2>
          <p className="text-xs text-gray-400 font-normal">
            Our platform strictly enforces data decoupling across three autonomous object entities:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-left">
          
          {/* User Record Definition Box */}
          <div className="bg-[#0b0f17] border border-white/[0.04] rounded-2xl p-5 space-y-3 relative overflow-hidden group">
            <div className="text-xs font-bold text-[#818cf8] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
              <span>Entity 01: Profile Node</span>
            </div>
            <div className="text-[11px] text-gray-500 bg-black/30 border border-white/5 p-2 rounded-xl text-left font-mono">
              id: <span className="text-emerald-400">"usr_dhairya1"</span><br/>
              name: "Dhairya Agrawal"<br/>
              username: "@dhairya_builds"<br/>
              college_id: "a7K9x2M5pQ1w"
            </div>
            <p className="text-[11px] text-gray-400 font-sans leading-relaxed font-normal">
              Stores static personal metrics, handle tracking references, and target institution validation tokens. **Strictly locked out of active timeline arrays.**
            </p>
          </div>

          {/* Post Record Definition Box */}
          <div className="bg-[#0b0f17] border border-white/[0.04] rounded-2xl p-5 space-y-3 relative overflow-hidden group">
            <div className="text-xs font-bold text-[#4FD1C5] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5]" />
              <span>Entity 02: Timeline Payload</span>
            </div>
            <div className="text-[11px] text-gray-500 bg-black/30 border border-white/5 p-2 rounded-xl text-left font-mono">
              id: "post_ln_raft001"<br/>
              user_id: <span className="text-[#818cf8]">"usr_dhairya1"</span><br/>
              collage_id: <span className="text-amber-400">"a7K9x2M5pQ1w"</span><br/>
              attached_data: [...]
            </div>
            <p className="text-[11px] text-gray-400 font-sans leading-relaxed font-normal">
              Stores raw strings, categorized tag markers, time indexes, and payload files. Resolves identity and institution profiles dynamically on the client using foreign keys.
            </p>
          </div>

          {/* College Record Definition Box */}
          <div className="bg-[#0b0f17] border border-white/[0.04] rounded-2xl p-5 space-y-3 relative overflow-hidden group">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Entity 03: Institution Hub</span>
            </div>
            <div className="text-[11px] text-gray-500 bg-black/30 border border-white/5 p-2 rounded-xl text-left font-mono">
              id: <span className="text-amber-400">"a7K9x2M5pQ1w"</span><br/>
              name: "Newton School of Tech"<br/>
              place: "Bangalore, Karnataka"<br/>
              rating_coding: 9.5
            </div>
            <p className="text-[11px] text-gray-400 font-sans leading-relaxed font-normal">
              Maintains campus properties, locations, and granular evaluation weights. Feeds structural details to associated project logs dynamically.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER SYSTEM SEGMENT */}
      <footer className="border-t border-white/[0.04] bg-[#070B14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center font-black text-xs text-white">
                P
              </div>
              <span className="font-bold text-sm tracking-tight text-white">PeerGrid Frameworks</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-normal">
              Decoupled, high-efficiency data monitoring dashboards for educational ecosystems.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <button onClick={() => executeProtectedNavigation(`/colleges/${sampleCollegeId}`)} className="hover:text-white transition-colors cursor-pointer">Global Feed</button>
            <a href="#definition" className="hover:text-white transition-colors">Documentation</a>
            <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Identity Provider Configs</a>
          </div>
        </div>
      </footer>

      {/* OVERLAY INTERCEPT MODAL ELEMENT: HIGH FIDELITY GOOGLE AUTHENTICATION SYSTEM SIMULATION */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[#0b0f17] border border-white/[0.08] rounded-2xl shadow-2xl p-6 text-center space-y-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Security Shield Visual Indicator */}
              <div className="w-12 h-12 rounded-xl bg-[#6C63FF]/10 text-[#818cf8] border border-[#6C63FF]/20 flex items-center justify-center mx-auto shadow-inner">
                <FiShield size={22} className={authLoading ? "animate-pulse text-[#4FD1C5]" : ""} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-wide">Single Sign-On Authentication</h3>
                <p className="text-xs text-gray-400 leading-normal max-w-[280px] mx-auto font-normal">
                  PeerGrid uses secure identity routing. Authenticate via Google identity services to instantiate your profile node.
                </p>
              </div>

              {/* ACTION REGION */}
              <div className="pt-2">
                {authLoading ? (
                  <div className="w-full h-11 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 font-mono">
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-[#4FD1C5] animate-spin" />
                    <span>Exchanging Tokens...</span>
                  </div>
                ) : (
                  <button
                    onClick={triggerGoogleAuthHandshake}
                    className="w-full h-11 bg-white text-black hover:bg-gray-100 font-bold text-xs rounded-xl flex items-center justify-center tracking-wide transition-all active:scale-[0.98] cursor-pointer shadow-lg"
                  >
                    <GoogleIconSVG />
                    <span>Sign In With Google Identity</span>
                  </button>
                )}
              </div>

              {/* Safety Dismiss Trigger */}
              <button 
                disabled={authLoading}
                onClick={() => setIsModalOpen(false)}
                className="text-[11px] text-gray-500 hover:text-white transition-colors cursor-pointer font-medium disabled:opacity-20"
              >
                Cancel & Return
              </button>

              {/* Absolute lower bar decoration */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[#6C63FF] via-[#818cf8] to-[#4FD1C5]" />

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}