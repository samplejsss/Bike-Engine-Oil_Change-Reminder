"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Loader2, Bike } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

export default function DailyRideInput({ onRideAdded, quickAddKm = 0, mechanicPhone = "", currentStats }) {
  const { user } = useAuth();
  const [km, setKm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [shareLinks, setShareLinks] = useState(null);

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
      
      if (mechanicPhone && currentStats) {
        const newTotal = currentStats.totalKm + kmVal;
        const newSinceReset = newTotal - currentStats.lastResetKm;
        const newRemaining = currentStats.oilChangeLimit - newSinceReset;
        
        const appUrl = typeof window !== "undefined" ? `${window.location.origin}/history` : "";
        const details = [
           `🏍️ *BikeCare Tracker Update*`,
           `I just logged a ride of *${kmVal} km*.`,
           ``,
           `📊 *Current Stats:*`,
           `• Total KM Ridden: *${newTotal.toFixed(1)} km*`,
           `• Oil Change Limit: *${currentStats.oilChangeLimit.toLocaleString()} km*`,
           `• KM Since Last Change: *${(currentStats.totalKm - currentStats.lastResetKm + kmVal).toFixed(1)} km*`,
           `• Oil Change Due In: *${newRemaining > 0 ? newRemaining.toFixed(1) + " km" : "OVERDUE ⚠️"}*`,
           ``,
           `📄 *Full Rides Report:*`,
           appUrl ? `View & download your complete rides PDF report here:\n${appUrl}` : `Open the BikeCare Tracker app > History tab to download PDF report.`,
        ].join('\n');

        const cleanPhone = mechanicPhone.replace(/\D/g, "");
        if (cleanPhone) {
          // Auto-fire WhatsApp first
          try {
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(details)}`, "_blank");
          } catch(e) { console.warn("WhatsApp open failed", e); }

          // Auto-fire SMS after short delay (so browser doesn't block immediate double-popup)
          setTimeout(() => {
            try {
              window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(details)}`;
            } catch(e) { console.warn("SMS open failed", e); }
          }, 800);

          // Also set share links as manual fallback in case popups were blocked
          setShareLinks({
            wa: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(details)}`,
            sms: `sms:${cleanPhone}?body=${encodeURIComponent(details)}`
          });
        }
      }

      setTimeout(() => {
        setSuccess(false);
        setShareLinks(null);
      }, 10000);
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
          <h3 className="font-semibold text-white">Add Today&apos;s Ride</h3>
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
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 mt-2 mb-4"
          >
            <p className="text-green-400 text-sm font-medium">✓ Ride added successfully!</p>
            {shareLinks && (
              <div className="flex gap-2">
                <a 
                  href={shareLinks.wa} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 text-xs font-bold flex items-center justify-center hover:bg-[#25D366]/30 transition-all"
                >
                  Send WhatsApp
                </a>
                <a 
                  href={shareLinks.sms}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center hover:bg-blue-500/30 transition-all"
                >
                  Send SMS
                </a>
              </div>
            )}
          </motion.div>
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
