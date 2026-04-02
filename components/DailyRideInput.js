"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Loader2, Bike } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

export default function DailyRideInput({ onRideAdded, quickAddKm = 0, mechanicPhone = "" }) {
  const { user } = useAuth();
  const [km, setKm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleAddRide(parseFloat(km));
  };

  const handleAddRide = async (kmVal) => {
    if (!kmVal || kmVal <= 0) {
      setError("Please enter a valid km value.");
      return;
    }
    if (kmVal > 2000) {
      setError("Max 2000 km per entry.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Add ride doc
      await addDoc(collection(db, "rides"), {
        userId: user.uid,
        km: kmVal,
        date: serverTimestamp(),
      });

      // Update user totalKm
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { totalKm: increment(kmVal) });

      setKm("");
      setSuccess(true);
      if (onRideAdded) onRideAdded();
      
      if (mechanicPhone) {
        const text = `Hey! I just logged a daily run of ${kmVal} km using BikeCare Tracker. Keep an eye out for my next oil change limit!`;
        const cleanPhone = mechanicPhone.replace(/\D/g, "");
        if (cleanPhone) {
          // Attempt automatic WhatsApp redirect
          try {
             const a = document.createElement("a");
             a.target = "_blank";
             a.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
             a.click();
          } catch(e) {
             console.log("Popup blocked or error", e);
          }
        }
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to add ride. Try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-2xl p-6 border border-white/8"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl btn-glow flex items-center justify-center">
          <Bike size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Add Today's Ride</h3>
          <p className="text-xs text-slate-500">Log your daily kilometers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            id="km-input"
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="Enter kilometers (e.g. 45)"
            className="glass-input pr-16"
            min="0.1"
            max="2000"
            step="0.1"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
            km
          </span>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm"
          >
            {error}
          </motion.p>
        )}

        {success && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-sm"
          >
            ✓ Ride added successfully!
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full btn-glow text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PlusCircle size={18} />
          )}
          {loading ? "Adding..." : "Add Ride"}
        </motion.button>
      </form>

      {quickAddKm > 0 && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs text-slate-500 mb-3">Quick Add (Daily Commute)</p>
          <motion.button
            type="button"
            onClick={() => handleAddRide(quickAddKm)}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full glass border border-purple-500/20 text-purple-300 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-500/10 transition-all disabled:opacity-60"
          >
            <PlusCircle size={16} />
            Add {quickAddKm} km instantly
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
