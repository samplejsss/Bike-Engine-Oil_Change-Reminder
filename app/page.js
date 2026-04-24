"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bike, Gauge, Bell, History, ArrowRight, CheckCircle, Sparkles, BarChart2, Zap, TrendingUp, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

const features = [
  {
    icon: Gauge,
    title: "Track Daily KM",
    desc: "Log every ride and watch your total kilometers grow in real time.",
    color: "purple",
  },
  {
    icon: Bell,
    title: "Smart Oil Reminders",
    desc: "Set your oil change interval and get reminded exactly when it's due.",
    color: "blue",
  },
  {
    icon: History,
    title: "Full Ride History",
    desc: "Browse all past rides with dates and distances in a clean timeline.",
    color: "cyan",
  },
  {
    icon: Sparkles,
    title: "AI Mechanic Advisor",
    desc: "Chat with an AI trained on your bike data for personalized maintenance tips.",
    color: "violet",
  },
  {
    icon: BarChart2,
    title: "Expense Analytics",
    desc: "Visualize your fuel, service and parts spending with beautiful charts.",
    color: "emerald",
  },
  {
    icon: Zap,
    title: "Smart Predictions",
    desc: "Based on your riding patterns, predict exactly when your next oil change is due.",
    color: "amber",
  },
];



export default function LandingPage() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        size: Math.random() * 3 + 1,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4,
      }))
    );
  }, []);
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        {/* Particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Hero */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-32 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border border-purple-500/30 text-purple-300 text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Bike Health Tracker · Free & Open
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6"
          >
            Track Your{" "}
            <span className="gradient-text">Bike Health</span>
            <br />
            <span className="text-slate-300">Smartly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Never miss an oil change again. Log your daily rides, monitor your km, and let
            BikeCare Tracker remind you exactly when your engine needs attention.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-glow inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg cursor-pointer"
              >
                Get Started <ArrowRight size={20} />
              </motion.div>
            </Link>
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="glass inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-slate-300 font-semibold text-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                View Dashboard
              </motion.div>
            </Link>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-20 relative max-w-3xl mx-auto"
          >
            <div className="glass rounded-3xl border border-white/8 p-4 sm:p-8 float-anim">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                {[
                  { label: "Total KM", val: "12,450", color: "text-purple-400" },
                  { label: "Oil Used", val: "73%", color: "text-yellow-400" },
                  { label: "Next Change", val: "540 km", color: "text-green-400" },
                ].map((s, i) => (
                  <div key={i} className="glass rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-white/5 text-center flex flex-col justify-center items-center">
                    <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1 whitespace-nowrap">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Bike size={20} className="text-purple-400" />
                </div>
                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "73%" }}
                      transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-2">Oil change progress · 540 of 2,000 km</p>
                </div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </section>

        {/* Features */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to{" "}
              <span className="gradient-text">maintain your bike</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A powerful toolkit for every rider — from tracking to reminders.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="glass rounded-2xl p-7 border border-white/8 glass-hover group"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${
                    f.color === "purple"
                      ? "from-purple-500/30 to-purple-600/10 text-purple-400"
                      : f.color === "blue"
                      ? "from-blue-500/30 to-blue-600/10 text-blue-400"
                      : f.color === "cyan"
                      ? "from-cyan-500/30 to-cyan-600/10 text-cyan-400"
                      : f.color === "violet"
                      ? "from-violet-500/30 to-violet-600/10 text-violet-400"
                      : f.color === "emerald"
                      ? "from-emerald-500/30 to-emerald-600/10 text-emerald-400"
                      : "from-amber-500/30 to-amber-600/10 text-amber-400"
                  }`}
                >
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Checklist CTA */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass rounded-3xl border border-purple-500/20 p-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to care for your bike?
            </h2>
            <p className="text-slate-400 mb-8 text-sm">
              Free to use · No credit card needed · Works on any device
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {["Daily km tracking", "Oil change alerts", "Ride history", "Secure cloud sync"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <CheckCircle size={15} className="text-green-400" />
                    {item}
                  </div>
                )
              )}
            </div>
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-glow inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base cursor-pointer"
              >
                Start Tracking Free <ArrowRight size={18} />
              </motion.div>
            </Link>
          </motion.div>
        </section>
      </main>
    </>
  );
}
