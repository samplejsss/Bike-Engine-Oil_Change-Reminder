"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Gauge, Bell, History, ArrowRight, CheckCircle, Sparkles,
  BarChart2, Zap, Shield, Droplets, MapPin, Fuel, Star,
  ChevronDown, TrendingUp, Lock, Wrench, IndianRupee
} from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";

const features = [
  { icon: Gauge,       title: "Live KM Tracking",     desc: "Log every ride and watch your total km grow in real time with beautiful progress visuals.",           color: "purple" },
  { icon: Bell,        title: "Smart Oil Reminders",   desc: "Set your oil change interval and get alerted at exactly the right km — never miss another change.",  color: "blue"   },
  { icon: History,     title: "Full Ride History",     desc: "A clean, filterable timeline of every ride with dates, distances, and odometer snapshots.",           color: "cyan"   },
  { icon: Sparkles,    title: "AI Mechanic Advisor",   desc: "Chat with an AI trained on your bike's own data for personalised, actionable maintenance tips.",      color: "violet" },
  { icon: BarChart2,   title: "Expense Analytics",     desc: "Visualise fuel, service and parts spending with beautiful interactive charts.",                       color: "emerald"},
  { icon: Zap,         title: "Predictive Engine",     desc: "Based on your riding patterns, predict exactly when your next service is due.",                       color: "amber"  },
  { icon: Fuel,        title: "Fuel Efficiency Log",   desc: "Track every fill-up and monitor km/L trends over time with automatic calculations.",                  color: "rose"   },
  { icon: Shield,      title: "Document Vault",        desc: "Store RC, insurance, PUC and more — with expiry alerts so nothing lapses.",                          color: "teal"   },
  { icon: MapPin,      title: "Multi-Bike Profiles",   desc: "Manage multiple bikes from one account — each with its own independent stats and history.",           color: "indigo" },
];

const stats = [
  { val: "2,000+", label: "Rides Tracked",  icon: TrendingUp },
  { val: "99.9%",  label: "Uptime",         icon: Shield     },
  { val: "₹0",     label: "Cost to Use",    icon: IndianRupee},
  { val: "4.9★",   label: "User Rating",    icon: Star       },
];

const testimonials = [
  { name: "Rahul M.",  bike: "Royal Enfield 350", text: "Never forgot an oil change since I started using MyVehicleCares. The AI advisor is genuinely useful!", avatar: "R", color: "from-purple-500 to-blue-500" },
  { name: "Priya S.",  bike: "Honda Activa 6G",   text: "Love the fuel tracking. Finally know my actual mileage and where my money is going.",            avatar: "P", color: "from-pink-500 to-rose-500"   },
  { name: "Kiran V.",  bike: "KTM Duke 390",      text: "Dashboard is beautiful. Feels premium — can't believe it's free. Highly recommend to all riders!", avatar: "K", color: "from-cyan-500 to-blue-600"   },
];

const colorMap = {
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/25",  text: "text-purple-400",  glow: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"  },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/25",    text: "text-blue-400",    glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"   },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    text: "text-cyan-400",    glow: "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"    },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400",  glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"  },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"  },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400",   glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"  },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/25",    text: "text-rose-400",    glow: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]"   },
  teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/25",    text: "text-teal-400",    glow: "group-hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]"  },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/25",  text: "text-indigo-400",  glow: "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"  },
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function LandingPage() {
  const [particles, setParticles] = useState([]);
  const { user } = useAuth();
  const { activeBike, activeBikeId } = useActiveBike();

  useEffect(() => {
     
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i, size: Math.random() * 2.5 + 0.5,
      x: Math.random() * 100, y: Math.random() * 100,
      delay: Math.random() * 5, dur: 3 + Math.random() * 3,
    })));
  }, []);

  const isRealData = user && activeBike;
  const bikeName = isRealData ? (activeBike.name || `${activeBike.make || ""} ${activeBike.model || ""}`.trim() || "My Bike") : "Royal Enfield 350";
  const updatedText = isRealData ? "Your active bike" : "Updated just now";
  
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    if (!user || !activeBikeId) {
      setLiveStats(null);
      return;
    }
    const fetchLiveStats = async () => {
      try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        // 1. Total KM from rides
        const ridesQ = query(collection(db, "rides"), where("userId", "==", user.uid), where("bikeId", "==", activeBikeId));
        const ridesSnap = await getDocs(ridesQ);
        let totalSum = 0;
        ridesSnap.forEach(d => { totalSum += Number(d.data().km || 0); });
        
        // 2. Efficiency from fuel
        const { buildFuelEntriesWithEfficiency, getLatestKmpl } = await import("@/lib/fuelMetrics");
        const fuelQ = query(collection(db, "users", user.uid, "fuelLogs"), where("bikeId", "==", activeBikeId));
        const fuelSnap = await getDocs(fuelQ);
        const fuelLogs = fuelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fuelEntries = buildFuelEntriesWithEfficiency(fuelLogs);
        const latestKmpl = getLatestKmpl(fuelEntries);
        
        // 3. Expenses this month
        const expQ = query(collection(db, "users", user.uid, "bikes", activeBikeId, "expenses"));
        const expSnap = await getDocs(expQ);
        const oldExpQ = query(collection(db, "expenses"), where("userId", "==", user.uid), where("bikeId", "==", activeBikeId));
        const oldExpSnap = await getDocs(oldExpQ);
        
        let mTotal = 0;
        const now = new Date();
        const startOfM = new Date(now.getFullYear(), now.getMonth(), 1);
        const processExp = (dSnap) => {
          const d = dSnap.data();
          const dt = d.date?.toDate ? d.date.toDate() : new Date(d.date);
          if (dt >= startOfM) mTotal += (d.amount || 0);
        };
        expSnap.forEach(processExp);
        oldExpSnap.forEach(processExp);
        
        setLiveStats({
          totalKm: totalSum,
          latestKmpl: latestKmpl,
          monthlyExpenses: mTotal
        });
      } catch (err) {
        console.error("Error fetching live stats for hero:", err);
      }
    };
    fetchLiveStats();
  }, [user, activeBikeId]);

  const currentOdo = isRealData 
    ? (liveStats?.totalKm ?? activeBike.lastOdometerReading ?? activeBike.purchaseKm ?? 0) 
    : 12450;
    
  const lastChange = isRealData 
    ? (activeBike.lastResetKm ?? activeBike.purchaseKm ?? 0) 
    : 11000;
    
  const interval = isRealData 
    ? (activeBike.oilChangeInterval ?? 2000) 
    : 2000;
  
  const oilUsedNum = Math.max(0, currentOdo - lastChange);
  const oilRemainingNum = Math.max(0, interval - oilUsedNum);
  const oilPercentNum = Math.min(100, Math.max(0, (oilUsedNum / interval) * 100));

  const totalKmStr = currentOdo.toLocaleString();
  const oilUsedPercentStr = `${Math.round(oilPercentNum)}%`;
  const oilRemainingStr = `${oilRemainingNum.toLocaleString()} km`;
  const progressWidthStr = `${oilPercentNum}%`;
  const oilUsedStr = `${oilUsedNum.toLocaleString()} / ${interval.toLocaleString()} km`;
  
  const displayEfficiency = isRealData 
    ? (typeof liveStats?.latestKmpl === "number" && liveStats.latestKmpl > 0 
        ? `${liveStats.latestKmpl.toFixed(1)} km/L` 
        : "--") 
    : "42.3 km/L";
    
  const displayExpense = isRealData 
    ? (typeof liveStats?.monthlyExpenses === "number" 
        ? `₹${liveStats.monthlyExpenses.toLocaleString('en-IN')}` 
        : "₹0") 
    : "₹2,340";

  return (
    <>
      <Navbar />

      {/* Particle field */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <div key={p.id} className="particle"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`,
              animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
        ))}
      </div>

      <main className="relative z-10 overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

              {/* Left copy */}
              <div className="text-center lg:text-left">
                <motion.div {...fadeUp(0)}
                  className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border border-purple-500/30 text-purple-300 text-sm font-semibold mb-8">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Free · No credit card · Runs instantly
                </motion.div>

                <motion.h1 {...fadeUp(0.08)}
                  className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black leading-[1.05] mb-6">
                  MyVehicleCares
                  <br />
                  <span className="gradient-text">Health Command</span>
                  <br />
                  <span className="text-slate-200">Centre</span>
                </motion.h1>

                <motion.p {...fadeUp(0.16)}
                  className="text-lg text-slate-400 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Never miss an oil change again. Log rides, track fuel, monitor expenses, and get AI-powered maintenance advice — all in one sleek dashboard.
                </motion.p>

                <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/login">
                    <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      className="btn-glow inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base cursor-pointer">
                      Get Started Free <ArrowRight size={18} />
                    </motion.span>
                  </Link>
                  <Link href="/dashboard">
                    <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl glass border border-white/10 hover:border-purple-500/40 text-slate-300 font-semibold text-base cursor-pointer transition-all">
                      View Dashboard <ArrowRight size={18} className="text-purple-400" />
                    </motion.span>
                  </Link>
                </motion.div>

                <motion.div {...fadeUp(0.3)} className="flex items-center gap-4 mt-8 justify-center lg:justify-start flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Lock size={12} className="text-green-400" /> Firebase secured
                  </div>
                  <span className="text-slate-700">·</span>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Shield size={12} className="text-blue-400" /> Your data stays yours
                  </div>
                  <span className="text-slate-700">·</span>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Wrench size={12} className="text-purple-400" /> Built for riders
                  </div>
                </motion.div>
              </div>

              {/* Right — dashboard mockup */}
              <motion.div {...fadeUp(0.3)} className="relative">
                <div className="absolute inset-0 bg-purple-600/15 blur-[90px] rounded-full pointer-events-none" />
                <div className="relative glass rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl float-anim">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                        <Image src="/logo.png" alt="MyVehicleCares" width={40} height={40} className="object-cover" loading="eager" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{bikeName}</p>
                        <p className="text-slate-500 text-xs">{updatedText}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 glass px-3 py-1.5 rounded-full border border-green-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active
                    </span>
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Total KM",    val: totalKmStr, color: "text-purple-400" },
                      { label: "Oil Used",    val: oilUsedPercentStr,    color: "text-amber-400"  },
                      { label: "Next Change", val: oilRemainingStr, color: "text-green-400"  },
                    ].map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                        className="glass rounded-xl p-3 border border-white/5 text-center">
                        <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>
                  {/* Oil progress */}
                  <div className="glass rounded-xl border border-white/5 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Droplets size={14} className="text-purple-400" />
                        <span className="text-sm text-slate-300 font-semibold">Oil Change Progress</span>
                      </div>
                      <span className="text-xs text-slate-500">{oilUsedStr}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: progressWidthStr }} transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    </div>
                  </div>
                  {/* Bottom row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-xl border border-white/5 p-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                        <Fuel size={13} className="text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">{displayEfficiency}</p>
                        <p className="text-slate-500 text-[10px]">Avg efficiency</p>
                      </div>
                    </div>
                    <div className="glass rounded-xl border border-white/5 p-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <TrendingUp size={13} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">{displayExpense}</p>
                        <p className="text-slate-500 text-[10px]">This month</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Scroll cue */}
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
              className="flex justify-center mt-16 text-slate-700">
              <ChevronDown size={26} />
            </motion.div>
          </div>
        </section>

        {/* ── STATS BAR ──────────────────────────────────────────────── */}
        <section className="py-12 px-4 border-y border-white/5 bg-white/[0.015]">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={i} {...inView(i * 0.08)} className="text-center">
                <div className="flex justify-center mb-2">
                  <s.icon size={20} className="text-purple-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-black gradient-text">{s.val}</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────── */}
        <section className="py-28 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div {...inView()} className="text-center mb-16">
              <p className="text-purple-400 font-semibold text-sm tracking-widest uppercase mb-4">Everything You Need</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Built for <span className="gradient-text">real riders</span>
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">Every feature is designed around how bikers actually think about maintenance.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const c = colorMap[f.color];
                return (
                  <motion.div key={i} {...inView((i % 3) * 0.07)} whileHover={{ y: -5, scale: 1.01 }}
                    className={`glass rounded-2xl p-7 border ${c.border} group relative overflow-hidden cursor-pointer transition-shadow duration-300 ${c.glow}`}>
                    <div className={`w-12 h-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center mb-5`}>
                      <f.icon size={22} className={c.text} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    <div className={`mt-5 flex items-center gap-1 text-xs font-semibold ${c.text} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                      Explore <ArrowRight size={11} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/5 to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto">
            <motion.div {...inView()} className="text-center mb-14">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={18} className="text-amber-400 fill-amber-400" />)}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white">
                Riders <span className="gradient-text">love it</span>
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div key={i} {...inView(i * 0.1)}
                  className="glass rounded-2xl p-6 border border-white/8 relative overflow-hidden group hover:border-purple-500/30 transition-colors duration-300">
                  <div className="absolute -top-6 -right-4 text-7xl font-black text-purple-500/8 select-none leading-none">&ldquo;</div>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} size={12} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-5 relative z-10">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-bold text-white text-sm`}>{t.avatar}</div>
                    <div>
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-slate-500 text-xs">{t.bike}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ─────────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div {...inView()}
              className="relative glass rounded-3xl border border-purple-500/20 p-10 sm:p-14 text-center overflow-hidden">
              <div className="absolute top-0 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] translate-y-1/2 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-purple-400 font-semibold text-sm tracking-widest uppercase mb-4">Start Today</p>
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                  Ready to ride <span className="gradient-text">smarter?</span>
                </h2>
                <p className="text-slate-400 mb-8 text-lg">Free forever · No credit card · Works on any device</p>
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  {["Daily km tracking","Oil change alerts","Ride history","AI advisor","Expense tracking","Secure sync"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-300 glass px-3 py-1.5 rounded-full border border-white/8">
                      <CheckCircle size={12} className="text-green-400" /> {item}
                    </div>
                  ))}
                </div>
                <Link href="/login">
                  <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="btn-glow inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-white font-bold text-lg cursor-pointer">
                    Start Tracking Free <ArrowRight size={20} />
                  </motion.span>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="py-10 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                  <Image src="/logo.png" alt="MyVehicleCares" width={32} height={32} className="object-cover" />
                </div>
                <span className="font-bold text-white tracking-wide">MyVehicleCares (BikeCare)</span>
              </div>

              {/* Developer credit */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Developed by</span>
                <a href="https://www.shanibck.me/" target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400">
                  Shanib C K
                </a>
                <span className="text-slate-600">· © {new Date().getFullYear()}</span>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { label: "Dashboard",  href: "/dashboard"  },
                  { label: "Analytics",  href: "/analytics"  },
                  { label: "History",    href: "/history"    },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="text-slate-500 hover:text-purple-400 text-sm transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom credit bar */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-slate-600 text-xs">
                Built with ❤️ for riders · Designed & Developed by{" "}
                <a href="https://www.shanibck.me/" target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                  Shanib C K
                </a>
              </p>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
