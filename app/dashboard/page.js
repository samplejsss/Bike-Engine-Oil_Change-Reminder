"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import CircularProgress from "@/components/CircularProgress";
import DailyRideInput from "@/components/DailyRideInput";
import AlertModal from "@/components/AlertModal";
import {
  Bike,
  MapPin,
  Droplets,
  CalendarDays,
  Settings2,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [limitEditing, setLimitEditing] = useState(false);
  const [newLimit, setNewLimit] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [dateEditing, setDateEditing] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        // Create default doc
        const defaults = {
          email: user.email,
          totalKm: 0,
          oilChangeLimit: 2000,
          lastResetKm: 0,
          createdAt: serverTimestamp(),
        };
        await setDoc(ref, defaults);
        setUserData(defaults);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchUserData();
  }, [user, fetchUserData]);

  // Check reminder
  useEffect(() => {
    if (!userData) return;
    const { totalKm, oilChangeLimit, lastResetKm } = userData;
    const remaining = oilChangeLimit - (totalKm - lastResetKm);
    if (remaining <= 0) setShowAlert(true);
  }, [userData]);

  const handleOilChanged = async () => {
    setResetLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        lastResetKm: userData.totalKm,
        lastOilChangeDate: serverTimestamp(),
      });
      await fetchUserData();
      setShowAlert(false);
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLimitSave = async () => {
    const val = parseInt(newLimit);
    if (!val || val < 100 || val > 50000) return;
    setSavingLimit(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { oilChangeLimit: val });
      await fetchUserData();
      setLimitEditing(false);
      setNewLimit("");
    } catch (err) {
      console.error("Limit update error:", err);
    } finally {
      setSavingLimit(false);
    }
  };

  const handleDateSave = async () => {
    if (!newDate) return;
    setSavingDate(true);
    try {
      const selectedDate = new Date(newDate);
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { lastOilChangeDate: selectedDate });
      await fetchUserData();
      setDateEditing(false);
      setNewDate("");
    } catch (err) {
      console.error("Date update error:", err);
    } finally {
      setSavingDate(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl btn-glow flex items-center justify-center">
            <Bike size={24} className="text-white" />
          </div>
          <Loader2 size={24} className="text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) return null;

  const { totalKm = 0, oilChangeLimit = 2000, lastResetKm = 0, lastOilChangeDate } = userData;
  const kmSinceReset = totalKm - lastResetKm;
  const remainingKm = oilChangeLimit - kmSinceReset;
  const oilUsedPct = Math.min(100, (kmSinceReset / oilChangeLimit) * 100);
  const isDue = remainingKm <= 0;

  const lastOilStr = lastOilChangeDate
    ? new Date(
        lastOilChangeDate.seconds !== undefined 
          ? lastOilChangeDate.seconds * 1000 
          : lastOilChangeDate instanceof Date 
            ? lastOilChangeDate 
            : typeof lastOilChangeDate.toMillis === "function" 
              ? lastOilChangeDate.toMillis() 
              : lastOilChangeDate
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not recorded";

  return (
    <>
      <Navbar />
      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        onConfirm={handleOilChanged}
        loading={resetLoading}
      />

      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Hey, {user.email?.split("@")[0]} 👋
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isDue ? (
                  <span className="text-red-400 font-medium">⚠️ Oil change is overdue!</span>
                ) : (
                  "Your bike health at a glance."
                )}
              </p>
            </div>
            {isDue && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAlert(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/30"
              >
                <RefreshCw size={15} /> Reset Oil Change
              </motion.button>
            )}
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={MapPin}
              label="Total KM Ridden"
              value={`${totalKm.toLocaleString()} km`}
              sub="Lifetime distance"
              color="purple"
              delay={0}
            />
            <StatCard
              icon={Droplets}
              label="Remaining KM"
              value={isDue ? "0 km" : `${remainingKm.toFixed(0)} km`}
              sub={isDue ? "Oil change overdue!" : "Until oil change"}
              color={isDue ? "purple" : "blue"}
              delay={0.1}
              danger={isDue}
            />
            <StatCard
              icon={CalendarDays}
              label="Last Oil Change"
              value={lastOilStr}
              sub="Date of last reset"
              color="cyan"
              delay={0.2}
            />
            <StatCard
              icon={Settings2}
              label="Oil Change Limit"
              value={`${oilChangeLimit.toLocaleString()} km`}
              sub="Current interval"
              color="green"
              delay={0.3}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress (large) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`glass rounded-2xl border p-8 flex flex-col items-center justify-center gap-6 ${
                isDue ? "border-red-500/30 danger-glow" : "border-white/8"
              }`}
            >
              <h2 className="text-lg font-semibold text-white self-start">Oil Change Progress</h2>
              <CircularProgress
                percentage={oilUsedPct}
                remainingKm={remainingKm}
                limit={oilChangeLimit}
                danger={isDue}
              />
            </motion.div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Add ride */}
              <DailyRideInput onRideAdded={fetchUserData} />

              {/* Oil limit setting */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass rounded-2xl p-6 border border-white/8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                      <Settings2 size={18} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Oil Change Interval</h3>
                      <p className="text-xs text-slate-500">
                        Current: {oilChangeLimit.toLocaleString()} km
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setLimitEditing(!limitEditing); setNewLimit(""); }}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  >
                    {limitEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
                {limitEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex gap-3"
                  >
                    <input
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder={`New limit (e.g. ${oilChangeLimit})`}
                      className="glass-input flex-1"
                      min="100"
                      max="50000"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleLimitSave}
                      disabled={savingLimit}
                      className="px-5 py-2 rounded-xl btn-glow text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                    >
                      {savingLimit ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>

              {/* Last Oil Change Date setting */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="glass rounded-2xl p-6 border border-white/8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                      <CalendarDays size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Last Oil Change Date</h3>
                      <p className="text-xs text-slate-500">
                        Current: {lastOilStr}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setDateEditing(!dateEditing); setNewDate(""); }}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  >
                    {dateEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
                {dateEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex gap-3"
                  >
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="glass-input flex-1"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDateSave}
                      disabled={savingDate}
                      className="px-5 py-2 rounded-xl btn-glow text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                    >
                      {savingDate ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="glass rounded-2xl p-6 border border-white/8"
              >
                <h3 className="font-semibold text-white mb-4">Current Oil Cycle</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Km since last change</span>
                    <span className="text-white font-mono font-semibold">{kmSinceReset.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Oil used</span>
                    <span
                      className={`font-mono font-semibold ${
                        oilUsedPct > 90 ? "text-red-400" : oilUsedPct > 70 ? "text-yellow-400" : "text-green-400"
                      }`}
                    >
                      {oilUsedPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, oilUsedPct)}%` }}
                      transition={{ duration: 1, ease: "easeInOut", delay: 0.6 }}
                      className={`h-full rounded-full ${
                        isDue
                          ? "bg-gradient-to-r from-red-500 to-orange-500"
                          : oilUsedPct > 70
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : "bg-gradient-to-r from-purple-500 to-blue-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0 km</span>
                    <span>{oilChangeLimit.toLocaleString()} km</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
