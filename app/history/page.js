"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, orderBy, getDocs, limit as fbLimit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { MapPin, Calendar, Clock, Bike, Loader2, ArrowUpRight, History as HistoryIcon } from "lucide-react";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      setDataLoading(true);
      const q = query(
        collection(db, "rides"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        fbLimit(50)
      );
      const querySnapshot = await getDocs(q);
      const fetched = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setRides(fetched);
    } catch (err) {
      console.error("Error fetching ride history:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl btn-glow flex items-center justify-center">
            <HistoryIcon size={24} className="text-white" />
          </div>
          <Loader2 size={24} className="text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center border border-cyan-500/20">
                <Calendar size={24} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Ride History</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Your past trips and daily logging records.
                </p>
              </div>
            </div>
          </motion.div>

          {/* List */}
          <div className="space-y-4">
            <AnimatePresence>
              {rides.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass flex flex-col items-center justify-center py-20 rounded-3xl border border-white/5 text-center"
                >
                  <Bike size={48} className="text-slate-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No rides yet</h3>
                  <p className="text-slate-400 max-w-sm">
                    Head over to the dashboard to log your first ride and start tracking your bike's health.
                  </p>
                </motion.div>
              ) : (
                rides.map((ride, i) => {
                  const date = ride.date
                    ? new Date(ride.date.seconds * 1000)
                    : new Date();
                  
                  return (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="glass rounded-2xl p-5 sm:p-6 border border-white/8 glass-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all"
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex flex-col items-center justify-center border border-white/10 shrink-0">
                          <span className="text-xs font-bold text-white">
                            {date.getDate()}
                          </span>
                          <span className="text-[10px] text-purple-300 uppercase leading-none">
                            {date.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-300 text-sm flex items-center gap-1.5 mb-1 font-medium">
                            <Clock size={14} className="text-slate-500" />
                            {date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-white font-semibold">
                            Logged daily running
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-start sm:self-center ml-16 sm:ml-0">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-400 flex items-center gap-1 justify-end">
                            {ride.km.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span>
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-300 text-slate-500 transition-colors shrink-0">
                          <ArrowUpRight size={18} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}
