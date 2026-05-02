"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import { Calendar, Clock, Bike, Loader2, Edit2, Trash2, Check, X as XIcon, Download } from "lucide-react";
import CalendarComponent from "react-calendar";
import "react-calendar/dist/Calendar.css";
import PageHeader from "@/components/PageHeader";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBikeId, loading: bikeLoading } = useActiveBike();
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Edit / Delete states
  const [editingId, setEditingId] = useState(null);
  const [editKm, setEditKm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Download time range selector
  const now = new Date();
  const [downloadMode, setDownloadMode] = useState("all"); // 'months' | 'year' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  ); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear())); // YYYY

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchHistory = useCallback(async () => {
    if (!user || !activeBikeId) return;
    try {
      setDataLoading(true);
      const q = query(
        collection(db, "rides"),
        where("userId", "==", user.uid),
        where("bikeId", "==", activeBikeId)
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
  }, [user, activeBikeId]);

  useEffect(() => {
    if (user && activeBikeId) fetchHistory();
  }, [user, activeBikeId, fetchHistory]);

  const fetchAllRidesForDownload = useCallback(async () => {
    if (!user || !activeBikeId) return [];
    const q = query(
      collection(db, "rides"),
      where("userId", "==", user.uid),
      where("bikeId", "==", activeBikeId)
    );

    const querySnapshot = await getDocs(q);
    const fetched = [];
    querySnapshot.forEach((docSnap) => {
      fetched.push({ id: docSnap.id, ...docSnap.data() });
    });

    fetched.sort((a, b) => {
      const timeA = a.date?.seconds || 0;
      const timeB = b.date?.seconds || 0;
      return timeB - timeA;
    });

    return fetched;
  }, [user, activeBikeId]);

  const getRideDateObj = (ride) => {
    const d = ride?.date;
    if (!d) return null;
    if (typeof d.toDate === "function") return d.toDate();
    if (typeof d.seconds === "number") return new Date(d.seconds * 1000);
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const filterRidesByDownloadMode = (allRides) => {
    if (downloadMode === "all") {
      return {
        rides: allRides,
        label: "All Time",
        fileSuffix: "all-time",
      };
    }

    if (downloadMode === "months") {
      const parts = (selectedMonth || "").split("-");
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1; // JS month index

      if (!year || Number.isNaN(year) || monthIndex < 0 || monthIndex > 11) {
        return {
          rides: allRides,
          label: "All Time",
          fileSuffix: "all-time",
        };
      }

      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 1); // first day next month
      const filtered = allRides.filter((r) => {
        const dt = getRideDateObj(r);
        return dt && dt >= start && dt < end;
      });

      const monthLabel = start.toLocaleString("en-US", { month: "long" });
      return {
        rides: filtered,
        label: `${monthLabel} ${year}`,
        fileSuffix: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      };
    }

    // downloadMode === "year"
    const year = Number(selectedYear);
    if (!year || Number.isNaN(year)) {
      return {
        rides: allRides,
        label: "All Time",
        fileSuffix: "all-time",
      };
    }

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const filtered = allRides.filter((r) => {
      const dt = getRideDateObj(r);
      return dt && dt >= start && dt < end;
    });

    return {
      rides: filtered,
      label: String(year),
      fileSuffix: String(year),
    };
  };

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
    setDownloadLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const allRidesForDownload = await fetchAllRidesForDownload();
      const { rides: filteredRides, label: periodLabel, fileSuffix } =
        filterRidesByDownloadMode(allRidesForDownload);

      if (!filteredRides.length) {
        alert(`No rides found for ${periodLabel}.`);
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Paint Page 1 background (slate-900)
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("BikeCare Tracker", 14, 22);

      doc.setTextColor(168, 85, 247); // Tailwind purple-400 equivalent for print clarity
      doc.setFontSize(16);
      doc.text(`Rides Report · ${periodLabel}`, 14, 30);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

      if (user && user.email) {
        doc.text(`Rider Account: ${user.email}`, 14, 46);
      }

      const tableColumn = ["Date", "Time", "Kilometers Logging"];
      const tableRows = [];

      filteredRides.forEach((ride) => {
        const date = getRideDateObj(ride) || new Date();
        const rDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        const rTime = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const kmVal = typeof ride.km === "number" ? ride.km : Number(ride.km || 0);
        tableRows.push([rDate, rTime, `${kmVal.toFixed(1)} km`]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 52,
        theme: "grid",
        headStyles: {
          fillColor: [88, 28, 135],
          textColor: [255, 255, 255],
          halign: "left",
          lineColor: [51, 65, 85],
          lineWidth: 0.1,
        },
        bodyStyles: {
          fillColor: [30, 41, 59],
          textColor: [226, 232, 240],
          lineColor: [51, 65, 85],
          lineWidth: 0.1,
        },
        alternateRowStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, cellPadding: 5 },
        willDrawPage: (data) => {
          // Paint backgrounds on any potentially generated new pages to ensure true dark mode
          if (data.pageNumber > 1) {
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
          }
        },
      });

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        "Automatically Generated by BikeCare Tracker App",
        14,
        doc.lastAutoTable.finalY + 15
      );

      doc.save(`bikecare_dark_rides_report_${fileSuffix}.pdf`);
    } finally {
      setDownloadLoading(false);
    }
  };

  if (authLoading || bikeLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="history" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <PageHeader 
            title="Ride History"
            subtitle="Your past trips and daily logging records."
            icon={Calendar}
            badge="Activity Log"
            colorClass="text-cyan-400"
            gradientClass="bg-cyan-500/15"
            rightContent={
              rides.length > 0 && (
                <div className="flex flex-col items-start sm:items-end gap-3 self-start sm:self-center shrink-0">
                <div className="flex bg-slate-800 rounded-lg p-1 w-fit border border-white/10">
                  {[
                    { id: "months", label: "Months" },
                    { id: "year", label: "Year" },
                    { id: "all", label: "All Time" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDownloadMode(opt.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        downloadMode === opt.id
                          ? "bg-cyan-500 text-white shadow"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {downloadMode === "months" && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="glass-input text-white px-3 py-2 h-9 text-sm w-40"
                      aria-label="Select month"
                    />
                  )}
                  {downloadMode === "year" && (
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      min="2000"
                      max="2100"
                      className="glass-input text-white px-3 py-2 h-9 text-sm w-24"
                      aria-label="Select year"
                    />
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadPDF}
                    disabled={downloadLoading}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 w-fit self-start sm:self-center shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {downloadLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Download size={16} /> PDF Report
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          />

          {/* Streak Counter & Calendar Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             {/* Streak Counter */}
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/5 flex flex-col items-center justify-center text-center group"
             >
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 border border-orange-500/30 group-hover:scale-110 transition-transform">
                   <span className="text-3xl">🔥</span>
                </div>
                <h3 className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-1">Current Streak</h3>
                <div className="flex items-end justify-center gap-1">
                   <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                      {(() => {
                         if (!rides || rides.length === 0) return 0;
                         let streak = 0;
                         let currentDate = new Date();
                         currentDate.setHours(0, 0, 0, 0);

                         // Create a set of unique date strings (YYYY-MM-DD)
                         const rideDates = new Set(rides.map(r => {
                            const d = r.date ? new Date(r.date.seconds * 1000) : new Date();
                            return d.toISOString().split('T')[0];
                         }));

                         // Check if rode today or yesterday to start streak
                         const todayStr = currentDate.toISOString().split('T')[0];
                         const yesterday = new Date(currentDate);
                         yesterday.setDate(yesterday.getDate() - 1);
                         const yesterdayStr = yesterday.toISOString().split('T')[0];

                         if (!rideDates.has(todayStr) && !rideDates.has(yesterdayStr)) {
                            return 0; // Streak broken
                         }

                         // Count backwards
                         let checkDate = new Date(rideDates.has(todayStr) ? currentDate : yesterday);
                         while (true) {
                            const checkStr = checkDate.toISOString().split('T')[0];
                            if (rideDates.has(checkStr)) {
                               streak++;
                               checkDate.setDate(checkDate.getDate() - 1);
                            } else {
                               break;
                            }
                         }
                         return streak;
                      })()}
                   </span>
                   <span className="text-slate-400 font-medium mb-1">days</span>
                </div>
                <p className="text-xs text-slate-500 mt-4">Ride every day to keep the fire burning!</p>
             </motion.div>

             {/* Calendar View */}
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 sm:p-6 border border-white/8 overflow-hidden md:col-span-2"
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
