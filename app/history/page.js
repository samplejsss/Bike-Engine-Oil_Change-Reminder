"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { MapPin, Calendar, Clock, Bike, Loader2, Edit2, Trash2, Check, X as XIcon, History as HistoryIcon, Download } from "lucide-react";
import CalendarComponent from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit / Delete states
  const [editingId, setEditingId] = useState(null);
  const [editKm, setEditKm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      setDataLoading(true);
      const q = query(
        collection(db, "rides"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetched = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort locally to avoid Firebase composite index requirement
      fetched.sort((a, b) => {
        const timeA = a.date?.seconds || 0;
        const timeB = b.date?.seconds || 0;
        return timeB - timeA;
      });
      setRides(fetched.slice(0, 100)); // Limit to last 100 on client
    } catch (err) {
      console.error("Error fetching ride history:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  const handleDelete = async (rideId, rideKm) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    setActionLoading(rideId);
    try {
      await deleteDoc(doc(db, "rides", rideId));
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { totalKm: increment(-rideKm) });
      setRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete ride.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async (rideId, oldKm) => {
    const newKmVal = parseFloat(editKm);
    if (!newKmVal || newKmVal <= 0) return alert("Invalid KM value");
    
    setActionLoading(rideId);
    try {
      const diff = newKmVal - oldKm;
      await updateDoc(doc(db, "rides", rideId), { km: newKmVal });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { totalKm: increment(diff) });
      setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, km: newKmVal } : r));
      setEditingId(null);
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update ride.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Paint Page 1 background (slate-900)
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("BikeCare Tracker", 14, 22);

    doc.setTextColor(168, 85, 247); // Tailwind purple-400 equivalent for print clarity
    doc.setFontSize(16);
    doc.text("Rides Report", 14, 30);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);
    
    if (user && user.email) {
      doc.text(`Rider Account: ${user.email}`, 14, 46);
    }

    const tableColumn = ["Date", "Time", "Kilometers Logging"];
    const tableRows = [];

    rides.forEach(ride => {
      const date = ride.date ? new Date(ride.date.seconds * 1000) : new Date();
      const rDate = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const rTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      tableRows.push([rDate, rTime, `${ride.km.toFixed(1)} km`]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 52,
      theme: "grid",
      headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], halign: 'left', lineColor: [51, 65, 85], lineWidth: 0.1 },
      bodyStyles: { fillColor: [30, 41, 59], textColor: [226, 232, 240], lineColor: [51, 65, 85], lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 10, cellPadding: 5 },
      willDrawPage: (data) => {
        // Paint backgrounds on any potentially generated new pages to ensure true dark mode
        if (data.pageNumber > 1) {
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
      },
    });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Automatically Generated by BikeCare Tracker App", 14, doc.lastAutoTable.finalY + 15);

    doc.save("bikecare_dark_rides_report.pdf");
  };

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
            className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
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
            {rides.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 w-fit self-start sm:self-center shrink-0"
              >
                <Download size={16} /> PDF Report
              </motion.button>
            )}
          </motion.div>

          {/* Calendar View */}
          <div className="mb-8">
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 sm:p-6 border border-white/8 overflow-hidden"
             >
                <style>{`
                  .react-calendar { background: transparent; border: none; font-family: inherit; width: 100%; color: white; }
                  .react-calendar__navigation button { color: white; min-width: 44px; background: transparent; font-weight: bold; border-radius: 8px; transition: all 0.2s; }
                  .react-calendar__navigation button:enabled:hover { background: rgba(255,255,255,0.1); }
                  .react-calendar__month-view__days__day--weekend { color: #f87171; }
                  .react-calendar__month-view__weekdays { color: #94a3b8; font-weight: 500; text-transform: uppercase; font-size: 0.75rem; }
                  .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
                  .react-calendar__tile { color: white; border-radius: 8px; padding: 14px 0.5em; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 56px; }
                  .react-calendar__tile:enabled:hover { background: rgba(255,255,255,0.1); border-radius: 8px; }
                  .react-calendar__tile--now { background: rgba(6, 182, 212, 0.2); border-radius: 8px; }
                  .react-calendar__tile--active { background: rgba(168, 85, 247, 0.8) !important; color: white; border-radius: 8px; }
                  .ride-dot { height: 6px; width: 6px; background-color: #22d3ee; border-radius: 50%; margin-top: 4px; box-shadow: 0 0 8px #22d3ee; }
                `}</style>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                   <Calendar className="text-purple-400" size={18} /> Ride Calendar Map
                </h3>
                <CalendarComponent
                  tileContent={({ date, view }) => {
                    if (view === 'month') {
                      const hasRide = rides.some(r => {
                        const rDate = r.date ? new Date(r.date.seconds * 1000) : new Date();
                        return rDate.toDateString() === date.toDateString();
                      });
                      return hasRide ? <div className="ride-dot" /> : null;
                    }
                  }}
                />
             </motion.div>
          </div>

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
                    Head over to the dashboard to log your first ride and start tracking your bike&apos;s health.
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
                          <p className="text-white font-semibold flex items-center gap-2">
                            Logged daily running
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 self-start sm:self-center ml-16 sm:ml-0">
                        {editingId === ride.id ? (
                           <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl border border-white/10">
                             <input 
                               type="number" 
                               className="glass-input w-20 sm:w-24 px-2 py-1 h-9 text-sm text-right font-mono" 
                               value={editKm} 
                               onChange={e => setEditKm(e.target.value)} 
                               step="0.1" 
                               autoFocus
                             />
                             <button onClick={() => handleUpdate(ride.id, ride.km)} disabled={actionLoading === ride.id} className="w-9 h-9 rounded-xl glass border border-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/10 transition-colors">
                               {actionLoading === ride.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                             </button>
                             <button onClick={() => setEditingId(null)} disabled={actionLoading === ride.id} className="w-9 h-9 rounded-xl glass border border-slate-500/20 text-slate-400 flex items-center justify-center hover:bg-slate-500/10 transition-colors">
                               <XIcon size={16} />
                             </button>
                           </div>
                        ) : (
                           <>
                             <div className="text-right mr-2">
                               <p className="text-xl sm:text-2xl font-bold text-purple-400 flex items-center justify-end gap-1">
                                 {ride.km.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span>
                               </p>
                             </div>
                             <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => { setEditingId(ride.id); setEditKm(ride.km.toString()); }} 
                                 className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/30 text-blue-400 transition-all shrink-0"
                                 title="Edit ride"
                               >
                                 <Edit2 size={16} />
                               </button>
                               <button 
                                 onClick={() => handleDelete(ride.id, ride.km)} 
                                 disabled={actionLoading === ride.id} 
                                 className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 text-red-400 transition-all shrink-0"
                                 title="Delete ride"
                               >
                                 {actionLoading === ride.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                               </button>
                             </div>
                           </>
                        )}
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
