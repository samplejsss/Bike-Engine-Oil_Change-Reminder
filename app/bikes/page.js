"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import { Bike, Pencil, Plus, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";

const emptyForm = {
  name: "",
  make: "",
  model: "",
  year: "",
  plateNumber: "",
  purchaseKm: "",
  color: "",
  imageUrl: "",
  oilChangeInterval: "2000",
};

export default function BikesPage() {
  const { user, loading: authLoading } = useAuth();
  const { bikes, activeBikeId, loading, selectBike, addBike, updateBikeDetails, deleteBikeById } =
    useActiveBike();

  const [saving, setSaving] = useState(false);
  const [editingBikeId, setEditingBikeId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [bikeMetrics, setBikeMetrics] = useState({});

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user || !bikes.length) {
        setBikeMetrics({});
        return;
      }
      const metrics = {};
      await Promise.all(
        bikes.map(async (bike) => {
          const ridesSnap = await getDocs(
            query(collection(db, "rides"), where("userId", "==", user.uid), where("bikeId", "==", bike.id))
          );
          let totalKm = 0;
          ridesSnap.forEach((d) => {
            totalKm += Number(d.data().km || 0);
          });
          metrics[bike.id] = {
            totalKm,
            lastOilChangeDate: bike.lastOilChangeDate
              ? new Date(
                  bike.lastOilChangeDate.seconds
                    ? bike.lastOilChangeDate.seconds * 1000
                    : bike.lastOilChangeDate
                )
              : null,
          };
        })
      );
      setBikeMetrics(metrics);
    };
    loadMetrics();
  }, [user, bikes]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingBikeId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Bike name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingBikeId) {
        await updateBikeDetails(editingBikeId, formData);
        toast.success("Bike updated.");
      } else {
        const newBikeId = await addBike(formData);
        if (newBikeId) await selectBike(newBikeId);
        toast.success("Bike added.");
      }
      resetForm();
    } catch (error) {
      console.error("Bike save failed:", error);
      toast.error("Could not save bike.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (bike) => {
    setEditingBikeId(bike.id);
    setFormData({
      name: bike.name || "",
      make: bike.make || "",
      model: bike.model || "",
      year: bike.year || "",
      plateNumber: bike.plateNumber || "",
      purchaseKm: bike.purchaseKm ?? "",
      color: bike.color || "",
      imageUrl: bike.imageUrl || "",
      oilChangeInterval: bike.oilChangeInterval || "2000",
    });
  };

  const handleDelete = async (bikeId) => {
    if (!window.confirm("Delete this bike?")) return;
    try {
      await deleteBikeById(bikeId);
      toast.success("Bike deleted.");
    } catch (error) {
      console.error("Bike delete failed:", error);
      toast.error("Failed to delete bike.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="bikes" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <PageHeader 
            title="My Bikes"
            subtitle="Manage multiple bikes and switch instantly."
            icon={Bike}
            badge="Garage"
            colorClass="text-cyan-400"
            gradientClass="bg-cyan-500/20"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-white/10 space-y-3 h-fit"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus size={18} className="text-emerald-400" />
                {editingBikeId ? "Edit Bike" : "Add Bike"}
              </h2>
              <input className="glass-input" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="glass-input" placeholder="Make" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} />
                <input className="glass-input" placeholder="Model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="glass-input" placeholder="Year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                <input className="glass-input" placeholder="Plate Number" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="glass-input" placeholder="Purchase KM" value={formData.purchaseKm} onChange={(e) => setFormData({ ...formData, purchaseKm: e.target.value })} />
                <input type="number" className="glass-input" placeholder="Oil Interval KM" value={formData.oilChangeInterval} onChange={(e) => setFormData({ ...formData, oilChangeInterval: e.target.value })} />
              </div>
              <input className="glass-input" placeholder="Color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
              <input className="glass-input" placeholder="Image URL" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 btn-glow rounded-xl py-2.5 text-white font-semibold disabled:opacity-60">
                  {saving ? "Saving..." : editingBikeId ? "Update Bike" : "Create Bike"}
                </button>
                {editingBikeId && (
                  <button type="button" onClick={resetForm} className="px-4 rounded-xl border border-white/15 text-slate-300">
                    Cancel
                  </button>
                )}
              </div>
            </motion.form>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {bikes.map((bike) => {
                const metrics = bikeMetrics[bike.id] || { totalKm: 0, lastOilChangeDate: null };
                const isActive = bike.id === activeBikeId;
                return (
                  <motion.div key={bike.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-2xl border p-5 ${isActive ? "border-cyan-400/40" : "border-white/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{bike.name}</h3>
                        <p className="text-slate-400 text-sm">{[bike.make, bike.model, bike.year].filter(Boolean).join(" • ") || "No details yet"}</p>
                      </div>
                      {isActive && <CheckCircle2 className="text-cyan-300" size={18} />}
                    </div>
                    <div className="mt-4 space-y-1 text-sm">
                      <p className="text-slate-300">Total KM: <span className="text-white font-semibold">{metrics.totalKm.toFixed(1)} km</span></p>
                      <p className="text-slate-300">Last oil change: <span className="text-white">{metrics.lastOilChangeDate ? metrics.lastOilChangeDate.toLocaleDateString("en-IN") : "Not recorded"}</span></p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => selectBike(bike.id)} className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm font-medium">Set Active</button>
                      <button onClick={() => handleEdit(bike)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(bike.id)} className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
