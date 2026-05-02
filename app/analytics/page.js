"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildFuelEntriesWithEfficiency, getRecentAverageKmpl } from "@/lib/fuelMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, IndianRupee, MapPin, Image as ImageIcon, FileText, FileSpreadsheet, Activity, Fuel, Tag } from "lucide-react";
import { format, subDays, isSameDay, startOfMonth, startOfDay } from "date-fns";
import PageHeader from "@/components/PageHeader";

const EXPENSE_COLORS = {
  Fuel: "#f59e0b",
  Service: "#3b82f6",
  Parts: "#8b5cf6",
  Accessories: "#06b6d4",
  Other: "#64748b",
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBikeId, loading: bikeLoading } = useActiveBike();
  const router = useRouter();
  
  const [rides, setRides] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !activeBikeId) return;
    
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const qRides = query(
          collection(db, "rides"),
          where("userId", "==", user.uid),
          where("bikeId", "==", activeBikeId)
        );
        const rideSnaps = await getDocs(qRides);
        const rData = rideSnaps.docs.map(d => ({
          id: d.id,
          ...d.data(),
          dateObj: d.data().date?.toDate() || new Date()
        }));
        setRides(rData);

        const qExp = query(
          collection(db, "expenses"),
          where("userId", "==", user.uid),
          where("bikeId", "==", activeBikeId)
        );
        const expSnaps = await getDocs(qExp);
        const eData = expSnaps.docs.map(d => ({
          id: d.id,
          ...d.data(),
          dateObj: d.data().date?.toDate() || new Date()
        }));
        setExpenses(eData);

        const qFuel = query(
          collection(db, "users", user.uid, "fuelLogs"),
          where("bikeId", "==", activeBikeId)
        );
        const fuelSnaps = await getDocs(qFuel);
        const fData = fuelSnaps.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFuelLogs(fData);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, [user, activeBikeId]);

  if (authLoading || bikeLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="analytics" />
      </div>
    );
  }

  if (!user) return null;

  // Process data for charts based on timeRange
  let chartData = [];
  let totalKmFiltered = 0;
  let totalExpenseFiltered = 0;

  if (timeRange === "all") {
    const grouped = {};
    [...rides, ...expenses].forEach(item => {
       const key = format(item.dateObj, 'MMM yyyy');
       const timestamp = startOfMonth(item.dateObj).getTime();
       if (!grouped[key]) grouped[key] = { date: key, timestamp, km: 0, expense: 0 };
    });
    rides.forEach(r => {
       grouped[format(r.dateObj, 'MMM yyyy')].km += r.km;
       totalKmFiltered += r.km;
    });
    expenses.forEach(e => {
       grouped[format(e.dateObj, 'MMM yyyy')].expense += e.amount;
       totalExpenseFiltered += e.amount;
    });
    chartData = Object.values(grouped).sort((a,b) => a.timestamp - b.timestamp);
  } else {
    const days = parseInt(timeRange);
    chartData = Array.from({ length: days }, (_, i) => {
      const d = subDays(new Date(), (days - 1) - i);
      return { date: format(d, 'MMM dd'), rawDate: d, km: 0, expense: 0 };
    });
    rides.forEach(r => {
      const t = chartData.find(d => isSameDay(d.rawDate, r.dateObj));
      if (t) { t.km += r.km; totalKmFiltered += r.km; }
    });
    expenses.forEach(e => {
      const t = chartData.find(d => isSameDay(d.rawDate, e.dateObj));
      if (t) { t.expense += e.amount; totalExpenseFiltered += e.amount; }
    });
  }

  // Calculate expense category breakdown
  const categoryTotals = {};
  let filteredExpenses = expenses;
  if (timeRange !== "all") {
    const days = parseInt(timeRange);
    const cutoff = startOfDay(subDays(new Date(), days - 1));
    filteredExpenses = expenses.filter(e => e.dateObj >= cutoff);
  }
  filteredExpenses.forEach(e => {
    const cat = e.type || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });
  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totalCatExpense = categoryData.reduce((s, c) => s + c.value, 0);

  // Summary stats
  const totalRides = timeRange === "all" ? rides.length : rides.filter(r => {
    if (timeRange === "all") return true;
    const cutoff = startOfDay(subDays(new Date(), parseInt(timeRange) - 1));
    return r.dateObj >= cutoff;
  }).length;
  const avgKmPerRide = totalRides > 0 ? totalKmFiltered / totalRides : 0;
  const costPerKm = totalKmFiltered > 0 ? totalExpenseFiltered / totalKmFiltered : 0;
  const fuelEntries = buildFuelEntriesWithEfficiency(fuelLogs);
  const avgFuelEfficiency = getRecentAverageKmpl(fuelEntries, 3);
  const fuelTrendData = fuelEntries
    .filter((entry) => typeof entry.kmpl === "number")
    .map((entry) => ({
      date: format(entry.dateObj, "MMM dd"),
      kmpl: Number(entry.kmpl.toFixed(2)),
      timestamp: entry.dateObj.getTime(),
    }));

  const handleDownloadCsv = () => {
    let csv = "Date,Type,Value(KM/Rupees),Category\n";
    let filtR = rides;
    let filtE = expenses;
    if (timeRange !== "all") {
       const days = parseInt(timeRange);
       const cutoff = startOfDay(subDays(new Date(), days - 1));
       filtR = rides.filter(r => r.dateObj >= cutoff);
       filtE = expenses.filter(e => e.dateObj >= cutoff);
    }
    const allData = [
       ...filtR.map(r => ({ date: r.dateObj, type: 'Ride', value: r.km, category: '' })),
       ...filtE.map(e => ({ date: e.dateObj, type: 'Expense', value: e.amount, category: e.type || 'Other' }))
    ].sort((a,b) => b.date - a.date);
    allData.forEach(item => {
       csv += `"${format(item.date, 'yyyy-MM-dd')}","${item.type}","${item.value}","${item.category}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bike_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async () => {
    if (!dashboardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(dashboardRef.current, { quality: 0.95, backgroundColor: '#0f172a', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `bike_analytics_${format(new Date(), 'yyyy-MM-dd')}.png`;
      a.click();
    } catch(err) { console.error('Error generating image', err); }
  };

  const handleDownloadPdf = async () => {
    if (!dashboardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(dashboardRef.current, { quality: 0.95, backgroundColor: '#0f172a', pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(14);
      pdf.text("BikeCare Analytics Report", 10, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Rides & Expenses Snapshot · Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 10, 22);
      pdf.addImage(dataUrl, 'PNG', 10, 30, pdfWidth, pdfHeight);
      pdf.save(`bike_analytics_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch(err) { console.error('Error generating pdf', err); }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 md:pb-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <PageHeader 
            title="Analytics Dashboard"
            subtitle="Visualize your rides and maintenance costs."
            icon={TrendingUp}
            badge="Insights"
            colorClass="text-cyan-400"
            gradientClass="bg-cyan-500/20"
            rightContent={
              <div className="flex flex-col sm:flex-row items-end gap-4 mt-2">
                <div className="flex bg-slate-800 rounded-lg p-1 border border-white/10">
                  {['7', '30', 'all'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeRange(t)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === t ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {t === 'all' ? 'All Time' : `${t} Days`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadCsv} title="Download CSV" className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-white transition-colors">
                    <FileSpreadsheet size={18} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadImage} title="Download Image" className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-white transition-colors">
                    <ImageIcon size={18} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDownloadPdf} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-colors">
                    <FileText size={16} /> Export PDF
                  </motion.button>
                </div>
              </div>
            }
          />

          {/* Summary Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
          >
            {[
              { label: "Rides Logged", value: totalRides, unit: "rides", icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Distance", value: totalKmFiltered.toFixed(1), unit: "km", icon: MapPin, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Total Spent", value: `₹${totalExpenseFiltered.toLocaleString('en-IN')}`, unit: "", icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Cost per KM", value: `₹${costPerKm.toFixed(2)}`, unit: "/km", icon: IndianRupee, color: "text-rose-400", bg: "bg-rose-500/10" },
              { label: "Avg per Ride", value: avgKmPerRide.toFixed(1), unit: "km", icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { label: "Fuel Efficiency", value: avgFuelEfficiency ? avgFuelEfficiency.toFixed(2) : "--", unit: avgFuelEfficiency ? "km/L" : "", icon: Fuel, color: "text-amber-400", bg: "bg-amber-500/10" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="glass rounded-2xl p-4 border border-white/8 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs">{s.label}</p>
                  <p className="text-white font-bold text-lg leading-tight">{s.value} <span className="text-slate-500 text-xs font-normal">{s.unit}</span></p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div ref={dashboardRef} className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <MapPin className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">{timeRange === 'all' ? 'Total Distance' : `${timeRange}-Day Distance`}</p>
                    <p className="text-3xl font-bold text-white">{totalKmFiltered.toFixed(1)} <span className="text-lg text-slate-500">km</span></p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#a855f7' }} />
                      <Area type="monotone" dataKey="km" stroke="#a855f7" fillOpacity={1} fill="url(#colorKm)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <IndianRupee className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Expenses</p>
                    <p className="text-3xl font-bold text-white">₹{totalExpenseFiltered.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#10b981' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Bar dataKey="expense" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Fuel className="text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Fuel Efficiency Trend</p>
                  <p className="text-3xl font-bold text-white">
                    {avgFuelEfficiency ? `${avgFuelEfficiency.toFixed(2)} km/L` : "--"}
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                {fuelTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fuelTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#f59e0b' }} />
                      <Line type="monotone" dataKey="kmpl" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Add at least 2 fuel logs to see efficiency trend.
                  </div>
                )}
              </div>
            </motion.div>

            {/* ✨ NEW: Expense Category Breakdown */}
            {categoryData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Tag className="text-amber-400" size={18} /> Expense Breakdown by Category
                </h3>
                <p className="text-slate-500 text-sm mb-6">Where your maintenance budget is going</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Pie Chart */}
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={EXPENSE_COLORS[entry.name] || "#64748b"}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          formatter={(value) => [`₹${value.toLocaleString()}`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category List */}
                  <div className="space-y-3">
                    {categoryData.map((cat, i) => {
                      const pct = totalCatExpense > 0 ? ((cat.value / totalCatExpense) * 100).toFixed(1) : 0;
                      const color = EXPENSE_COLORS[cat.name] || "#64748b";
                      return (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.07 }}
                          className="flex items-center gap-3"
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-400 text-sm flex-1">{cat.name}</span>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.5 + i * 0.07, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                          <span className="text-white font-semibold text-sm w-16 text-right">₹{cat.value.toLocaleString()}</span>
                          <span className="text-slate-500 text-xs w-10 text-right">{pct}%</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

