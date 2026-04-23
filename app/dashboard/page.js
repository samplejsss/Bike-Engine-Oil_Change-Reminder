"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildFuelEntriesWithEfficiency, getFuelCostThisMonth, getLatestKmpl, getRecentAverageKmpl } from "@/lib/fuelMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import CircularProgress from "@/components/CircularProgress";
import DailyRideInput from "@/components/DailyRideInput";
import OdometerInput from "@/components/OdometerInput";
import InitialOdometerSetup from "@/components/InitialOdometerSetup";
import ExpenseInput from "@/components/ExpenseInput";
import MaintenanceChecklist from "@/components/MaintenanceChecklist";
import AlertModal from "@/components/AlertModal";
import { playWarningSound, sendBrowserNotification } from "@/hooks/useNotifications";
import { getDocumentStatus } from "@/lib/documentUtils";
import {
  Bike,
  MapPin,
  Droplets,
  CalendarDays,
  Settings2,
  Loader2,
  RefreshCw,
  Fuel,
  AlertTriangle,
  IndianRupee,
  ClipboardList,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBike, activeBikeId, loading: bikeLoading } = useActiveBike();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [bikeData, setBikeData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [avgDailyKm, setAvgDailyKm] = useState(0);
  const [totalKmFromHistory, setTotalKmFromHistory] = useState(0);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [insuranceCountdown, setInsuranceCountdown] = useState(null);


  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setUserData(snap.data());
      else {
        const defaults = { email: user.email, fuelEfficiencyThreshold: 35, createdAt: serverTimestamp() };
        await setDoc(ref, defaults);
        setUserData(defaults);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  const fetchBikeData = useCallback(async () => {
    if (!user || !activeBikeId) return;
    try {
      const bikeRef = doc(db, "users", user.uid, "bikes", activeBikeId);
      const bikeSnap = await getDoc(bikeRef);
      if (bikeSnap.exists()) {
        setBikeData(bikeSnap.data());
      } else {
        const defaults = {
          name: activeBike?.name || "My Bike",
          purchaseKm: 0,
          oilChangeInterval: 2000,
          lastResetKm: 0,
          lastOdometerReading: 0,
          hasInitialOdometer: false,
          createdAt: serverTimestamp(),
        };
        await setDoc(bikeRef, defaults);
        setBikeData(defaults);
      }
    } catch (err) {
      console.error("Error fetching bike data:", err);
    }
  }, [user, activeBikeId, activeBike?.name]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchStats = useCallback(async () => {
    if (!user || !activeBikeId) return;
    try {
      const allRidesQuery = query(
        collection(db, "rides"),
        where("userId", "==", user.uid),
        where("bikeId", "==", activeBikeId)
      );
      const allRidesSnap = await getDocs(allRidesQuery);
      let totalSum = 0;
      allRidesSnap.forEach((d) => {
        totalSum += Number(d.data().km || 0);
      });
      setTotalKmFromHistory(totalSum);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      let last14Sum = 0;
      allRidesSnap.forEach((d) => {
        const data = d.data() || {};
        const dt = data.date?.toDate ? data.date.toDate() : data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
        if (dt && dt >= twoWeeksAgo) last14Sum += Number(data.km || 0);
      });
      setAvgDailyKm(last14Sum / 14);

      const fuelLogsQueryScoped = query(
        collection(db, "users", user.uid, "fuelLogs"),
        where("bikeId", "==", activeBikeId)
      );
      const fuelLogsSnap = await getDocs(fuelLogsQueryScoped);
      const logs = fuelLogsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setFuelEntries(buildFuelEntriesWithEfficiency(logs));

      const tasksSnap = await getDocs(
        collection(db, "users", user.uid, "bikes", activeBikeId, "maintenanceTasks")
      );
      let count = 0;
      const now = new Date();
      const dueSoonKm = 200;
      const dueSoonDays = 7;
      const currentOdo = Number(bikeData?.lastOdometerReading || totalSum || 0);
      tasksSnap.forEach((docSnap) => {
        const t = docSnap.data() || {};
        const nextKm = typeof t.nextDueKm === "number" ? t.nextDueKm : null;
        const nextDate = t.nextDueDate?.toDate
          ? t.nextDueDate.toDate()
          : t.nextDueDate?.seconds
            ? new Date(t.nextDueDate.seconds * 1000)
            : null;
        const kmRem = nextKm != null ? nextKm - currentOdo : null;
        const daysRem = nextDate ? Math.ceil((nextDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
        const overdue = (kmRem != null && kmRem <= 0) || (daysRem != null && daysRem <= 0);
        const soon = !overdue && ((kmRem != null && kmRem <= dueSoonKm) || (daysRem != null && daysRem <= dueSoonDays));
        if (overdue || soon) count += 1;
      });
      setDueSoonCount(count);

      const docsSnap = await getDocs(collection(db, "users", user.uid, "bikes", activeBikeId, "documents"));
      const attention = [];
      let insuranceDays = null;
      docsSnap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        const statusInfo = getDocumentStatus(d.expiryDate);
        if (statusInfo.daysLeft != null && statusInfo.daysLeft <= 30) {
          attention.push({ id: docSnap.id, ...d, daysLeft: statusInfo.daysLeft, status: statusInfo.status });
        }
        if (String(d.type || "").toLowerCase() === "insurance") {
          insuranceDays = statusInfo.daysLeft;
        }
      });
      attention.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
      setExpiringDocs(attention);
      setInsuranceCountdown(insuranceDays);
    } catch(err) {
      console.error(err);
    }
  }, [user, activeBikeId, bikeData?.lastOdometerReading]);

  useEffect(() => {
    if (user && activeBikeId) {
      fetchUserData();
      fetchBikeData();
      fetchStats();
    }
  }, [user, activeBikeId, fetchUserData, fetchBikeData, fetchStats]);

  // Check reminder
  useEffect(() => {
    if (!bikeData) return;
    const { oilChangeInterval, lastResetKm } = bikeData;
    const remaining = oilChangeInterval - (totalKmFromHistory - lastResetKm);
    if (remaining <= 0) {
        setShowAlert(true);
        if (!showAlert) { // To prevent infinite sounds if it re-renders
            sendBrowserNotification("Oil Change Due! ⚠️", "It's time to change your engine oil. Please check your dashboard.");
            playWarningSound();
        }
    }
  }, [bikeData, showAlert, totalKmFromHistory]);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([fetchUserData(), fetchBikeData(), fetchStats()]);
  }, [fetchUserData, fetchBikeData, fetchStats]);

  const handleOilChanged = async () => {
    setResetLoading(true);
    try {
      const ref = doc(db, "users", user.uid, "bikes", activeBikeId);
      await updateDoc(ref, {
        lastResetKm: totalKmFromHistory,
        lastOilChangeDate: serverTimestamp(),
      });
      await fetchBikeData();
      await fetchStats();
      setShowAlert(false);
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setResetLoading(false);
    }
  };

  if (authLoading || bikeLoading || dataLoading) {
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

  if (!user || !userData || !bikeData || !activeBikeId) return null;

  // Show initial odometer setup if not configured
  const hasInitialOdometer = bikeData.hasInitialOdometer || bikeData.lastOdometerReading > 0;
  if (!hasInitialOdometer) {
    return (
      <>
        <Navbar />
        <InitialOdometerSetup 
          onComplete={refreshDashboardData} 
          currentOdometerReading={bikeData.lastOdometerReading || 0}
        />
      </>
    );
  }

  const { oilChangeInterval = 2000, lastResetKm = 0, lastOilChangeDate, lastOdometerReading = 0 } = bikeData;
  const { quickAddKm = 0, mechanicPhone = "", fuelEfficiencyThreshold = 35 } = userData;
  const totalKm = totalKmFromHistory;
  const kmSinceReset = totalKm - lastResetKm;
  const remainingKm = Math.max(0, oilChangeInterval - kmSinceReset);
  const oilUsedPct = Math.min(100, (kmSinceReset / oilChangeInterval) * 100);
  const isDue = (oilChangeInterval - kmSinceReset) <= 0;

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

  const avgFuelEfficiency = getRecentAverageKmpl(fuelEntries, 3);
  const latestFuelEfficiency = getLatestKmpl(fuelEntries);
  const monthlyFuelCost = getFuelCostThisMonth(fuelEntries);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyDistance = fuelEntries
    .filter((entry) => entry.dateObj >= monthStart)
    .reduce((sum, entry) => sum + (entry.distanceSinceLast || 0), 0);
  const costPerKm = monthlyDistance > 0 ? monthlyFuelCost / monthlyDistance : null;
  const isEfficiencyLow = typeof latestFuelEfficiency === "number" && latestFuelEfficiency < Number(fuelEfficiencyThreshold || 0);

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
                {activeBike?.name || "Your Bike"} Dashboard 👋
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

          {isEfficiencyLow && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3"
            >
              <AlertTriangle className="text-amber-300 mt-0.5" size={18} />
              <div>
                <p className="text-amber-200 text-sm font-semibold">Low fuel efficiency detected</p>
                <p className="text-amber-100/90 text-xs mt-1">
                  Latest mileage is {latestFuelEfficiency.toFixed(2)} km/L, below your threshold of {Number(fuelEfficiencyThreshold).toFixed(1)} km/L.
                </p>
              </div>
            </motion.div>
          )}

          {typeof insuranceCountdown === "number" && insuranceCountdown <= 30 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3"
            >
              <AlertTriangle className="text-amber-300 mt-0.5" size={18} />
              <div>
                <p className="text-amber-200 text-sm font-semibold">
                  Insurance {insuranceCountdown <= 0 ? "expired" : `expires in ${insuranceCountdown} days`}
                </p>
                <button
                  onClick={() => router.push("/documents")}
                  className="text-xs text-amber-100 underline mt-1"
                >
                  Open Document Vault
                </button>
              </div>
            </motion.div>
          )}

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
              value={`${remainingKm.toFixed(0)} km`}
              sub={isDue ? "Oil change overdue!" : "Until oil change"}
              color={isDue ? "purple" : "blue"}
              delay={0.1}
              danger={isDue}
            />
            <StatCard
              icon={Fuel}
              label="Avg Fuel Efficiency"
              value={avgFuelEfficiency ? `${avgFuelEfficiency.toFixed(2)} km/L` : "--"}
              sub="Last 3 fill-ups"
              color="green"
              delay={0.2}
            />
            <StatCard
              icon={CalendarDays}
              label="Last Oil Change"
              value={lastOilStr}
              sub="Date of last reset"
              color="cyan"
              delay={0.3}
            />
            <StatCard
              icon={Settings2}
              label="Oil Change Limit"
              value={`${oilChangeInterval.toLocaleString()} km`}
              sub="Current interval"
              color="green"
              delay={0.4}
            />
            <StatCard
              icon={IndianRupee}
              label="Fuel Cost (Month)"
              value={`Rs ${monthlyFuelCost.toFixed(0)}`}
              sub="Total fuel spend this month"
              color="cyan"
              delay={0.5}
            />
            <StatCard
              icon={Droplets}
              label="Fuel Cost / KM"
              value={costPerKm ? `Rs ${costPerKm.toFixed(2)}` : "--"}
              sub="Fuel spend per kilometer"
              color="blue"
              delay={0.6}
            />
            <StatCard
              icon={ClipboardList}
              label="Maintenance Tasks"
              value={`${dueSoonCount}`}
              sub="Due soon / overdue"
              color={dueSoonCount > 0 ? "blue" : "green"}
              delay={0.7}
            />
          </div>

          {dueSoonCount > 0 && (
            <div className="mb-8 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/maintenance")}
                className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm font-semibold"
              >
                Review maintenance tasks
              </motion.button>
            </div>
          )}

          {expiringDocs.length > 0 && (
            <div className="mb-8 glass rounded-2xl border border-white/10 p-5">
              <h3 className="text-white font-semibold mb-3">Attention Required</h3>
              <div className="space-y-2">
                {expiringDocs.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm bg-slate-900/40 rounded-xl px-3 py-2 border border-white/5">
                    <span className="text-slate-200">{d.type}: {d.fileName}</span>
                    <span className={d.daysLeft <= 0 ? "text-red-300" : "text-amber-300"}>
                      {d.daysLeft <= 0 ? `Expired ${Math.abs(d.daysLeft)}d ago` : `${d.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => router.push("/documents")}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-semibold"
                >
                  Manage documents
                </button>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress (large) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`glass rounded-2xl border p-8 flex flex-col items-center justify-center gap-6 h-fit self-start sticky top-28 lg:top-32 ${
                isDue ? "border-red-500/30 danger-glow" : "border-white/8"
              }`}
            >
              <h2 className="text-lg font-semibold text-white self-start">Oil Change Progress</h2>
              <CircularProgress
                percentage={oilUsedPct}
                remainingKm={remainingKm}
                limit={oilChangeInterval}
                danger={isDue}
              />
              
              <div className="w-full mt-2 p-5 rounded-2xl bg-slate-900/50 border border-white/5 flex justify-between items-center">
                 <span className="text-slate-400 text-sm font-medium">Km since last change</span>
                 <span className="text-white font-mono text-lg font-bold">{kmSinceReset.toFixed(1)} km</span>
              </div>
            </motion.div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Action Cards (Add Ride, Odometer & Add Expense) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="space-y-6">
                    {/* Odometer Reading */}
                    <OdometerInput 
                      onRideAdded={refreshDashboardData} 
                      currentStats={{ totalKm, lastResetKm, oilChangeLimit: oilChangeInterval, lastOdometerReading, bikeId: activeBikeId }}
                    />
                 </div>
                 <div className="space-y-6">
                    {/* Add ride */}
                    <DailyRideInput 
                      onRideAdded={refreshDashboardData} 
                      quickAddKm={quickAddKm} 
                      mechanicPhone={mechanicPhone} 
                      currentStats={{ totalKm, lastResetKm, oilChangeLimit: oilChangeInterval, bikeId: activeBikeId }}
                    />
                    {/* Add expense */}
                    <ExpenseInput onExpenseAdded={refreshDashboardData} />
                 </div>
              </div>

              {/* Smart Prediction Engine */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass rounded-2xl p-6 border border-white/8 relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CalendarDays size={100} />
                 </div>
                 <h3 className="text-lg font-semibold text-white mb-2 relative z-10 flex items-center gap-2">
                     <CalendarDays className="text-cyan-400" size={18} /> Smart Predictor
                 </h3>
                 <p className="text-sm text-slate-400 mb-6 relative z-10">
                     Based on your 14-day riding average of <span className="text-white font-mono">{avgDailyKm.toFixed(1)} km/day</span>
                 </p>
                 
                 <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Estimated Days Left</p>
                        <p className="text-2xl font-bold text-white">
                           {avgDailyKm > 0 ? Math.max(0, Math.ceil(remainingKm / avgDailyKm)) : "--"} <span className="text-sm font-normal text-slate-400">days</span>
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Estimated Date</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">
                           {avgDailyKm > 0 ? (
                              remainingKm > 0 ? new Date(Date.now() + (remainingKm / avgDailyKm) * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
                                month: "short", day: "numeric", year: "numeric"
                              }) : "Overdue"
                           ) : "Need more data"}
                        </p>
                    </div>
                 </div>
              </motion.div>

              {/* Maintenance Checklist Component */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <MaintenanceChecklist />
              </motion.div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
