"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import { buildFuelEntriesWithEfficiency } from "@/lib/fuelMetrics";
import { Droplets, Loader2, Fuel, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";

export default function FuelPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBikeId, loading: bikeLoading } = useActiveBike();
  const router = useRouter();
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    odometer: "",
    liters: "",
    pricePerLiter: "",
    stationName: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchFuelLogs = useCallback(async () => {
    if (!user || !activeBikeId) return;
    try {
      setDataLoading(true);
      const fuelLogsQuery = query(
        collection(db, "users", user.uid, "fuelLogs"),
        where("bikeId", "==", activeBikeId)
      );
      const snap = await getDocs(fuelLogsQuery);
      const logs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setFuelLogs(logs);
    } catch (error) {
      console.error("Error loading fuel logs:", error);
      toast.error("Could not load fuel logs.");
    } finally {
      setDataLoading(false);
    }
  }, [user, activeBikeId]);

  useEffect(() => {
    if (user && activeBikeId) fetchFuelLogs();
  }, [user, activeBikeId, fetchFuelLogs]);

  const fuelEntries = useMemo(
    () => buildFuelEntriesWithEfficiency(fuelLogs).slice().reverse(),
    [fuelLogs]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!activeBikeId) {
      toast.error("Select a bike first.");
      return;
    }
    const odometer = Number(formData.odometer);
    const liters = Number(formData.liters);
    const pricePerLiter = Number(formData.pricePerLiter);

    if (odometer <= 0 || liters <= 0 || pricePerLiter <= 0) {
      toast.error("Please enter valid odometer, liters, and price values.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "fuelLogs"), {
        date: new Date(formData.date),
        odometer,
        liters,
        pricePerLiter,
        bikeId: activeBikeId,
        stationName: formData.stationName.trim() || "",
        notes: formData.notes.trim() || "",
        createdAt: serverTimestamp(),
      });
      toast.success("Fuel entry added.");
      setFormData({
        date: new Date().toISOString().split("T")[0],
        odometer: "",
        liters: "",
        pricePerLiter: "",
        stationName: "",
        notes: "",
      });
      fetchFuelLogs();
    } catch (error) {
      console.error("Error saving fuel log:", error);
      toast.error("Failed to add fuel entry.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || bikeLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="fuel" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <PageHeader 
            title="Fuel Log"
            subtitle="Add fuel fill-ups and track your per-tank fuel efficiency."
            icon={Fuel}
            badge="Efficiency Tracker"
            colorClass="text-amber-400"
            gradientClass="bg-amber-500/20"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-white/10 h-fit"
            >
              <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <PlusCircle size={18} className="text-cyan-400" /> Add Fill-up
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="glass-input"
                  required
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Odometer (km)"
                  value={formData.odometer}
                  onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                  className="glass-input"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Liters"
                    value={formData.liters}
                    onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                    className="glass-input"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price/Liter (Rs)"
                    value={formData.pricePerLiter}
                    onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Station Name (optional)"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  className="glass-input"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-input min-h-24"
                />
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="w-full btn-glow text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Droplets size={17} />}
                  {saving ? "Saving..." : "Save Fuel Entry"}
                </motion.button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Past Fill-ups</h2>
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {fuelEntries.length === 0 ? (
                  <div className="p-6 rounded-xl border border-white/10 bg-slate-900/40 text-center">
                    <p className="text-slate-400 text-sm">No fuel logs yet.</p>
                  </div>
                ) : (
                  fuelEntries.map((entry) => (
                    <div key={entry.id} className="p-4 rounded-xl bg-slate-900/50 border border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">
                          {entry.dateObj.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-white font-semibold">{entry.odometer.toFixed(1)} km</p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                        <p>{entry.liters.toFixed(2)} L</p>
                        <p>Rs {entry.pricePerLiter.toFixed(2)}/L</p>
                        <p>Total: Rs {(entry.liters * entry.pricePerLiter).toFixed(2)}</p>
                        <p className={entry.kmpl ? "text-emerald-400 font-semibold" : ""}>
                          {entry.kmpl ? `${entry.kmpl.toFixed(2)} km/L` : "Need previous fill-up"}
                        </p>
                      </div>
                      {entry.stationName && (
                        <p className="mt-2 text-xs text-cyan-300">{entry.stationName}</p>
                      )}
                      {entry.notes && <p className="mt-1 text-xs text-slate-500">{entry.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
