"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useMemo, } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, Filter, Calendar, TrendingUp, IndianRupee, Image as ImageIcon, X, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import PdfViewer from "@/components/PdfViewer";

const CATEGORIES = ["Fuel", "Service", "Parts", "Insurance", "Parking", "Other"];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { activeBikeId, activeBike } = useActiveBike();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterDate, setFilterDate] = useState("All"); // All, This Month, Last Month, This Year
  
  // Form state
  const [form, setForm] = useState({
    amount: "",
    category: "Fuel",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [viewerUrl, setViewerUrl] = useState(null);

  useEffect(() => {
    if (!user || !activeBikeId) return;
    
    setLoading(true);
    let newExps = [];
    let oldExps = [];

    const updateState = () => {
       const combined = [...newExps, ...oldExps].sort((a, b) => {
         const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
         const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
         return dateB - dateA;
       });
       const formatted = combined.map(e => ({
          ...e,
          category: e.category || e.type || "Other"
       }));
       setExpenses(formatted);
       if (newExps.length > 0 || oldExps.length > 0) {
         setLoading(false);
       }
    };

    const qNew = query(
      collection(db, "users", user.uid, "bikes", activeBikeId, "expenses"),
      orderBy("date", "desc")
    );
    const unsubNew = onSnapshot(qNew, (snap) => {
      newExps = snap.docs.map(doc => ({ id: doc.id, isNew: true, ...doc.data() }));
      updateState();
      setLoading(false); // Make sure loading stops even if empty
    });

    const qOld = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("bikeId", "==", activeBikeId)
    );
    const unsubOld = onSnapshot(qOld, (snap) => {
      oldExps = snap.docs.map(doc => ({ id: doc.id, isOld: true, ...doc.data() }));
      updateState();
    });
    
    return () => { unsubNew(); unsubOld(); };
  }, [user, activeBikeId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.category || !form.date) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let receiptUrl = "";
      
      // Upload receipt if exists
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!data.success) throw new Error("Failed to upload receipt");
        receiptUrl = data.url;
      }
      
      await addDoc(collection(db, "users", user.uid, "bikes", activeBikeId, "expenses"), {
        amount: parseFloat(form.amount),
        category: form.category,
        date: new Date(form.date),
        description: form.description,
        receiptUrl,
        createdAt: serverTimestamp()
      });
      
      toast.success("Expense added successfully");
      setShowAdd(false);
      setForm({ amount: "", category: "Fuel", date: new Date().toISOString().split("T")[0], description: "" });
      setReceiptFile(null);
      setPreviewUrl("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (exp) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      if (exp.isOld) {
        await deleteDoc(doc(db, "expenses", exp.id));
      } else {
        await deleteDoc(doc(db, "users", user.uid, "bikes", activeBikeId, "expenses", exp.id));
      }
      toast.success("Expense deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete expense");
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Category filter
      if (filterCategory !== "All" && exp.category !== filterCategory) return false;
      
      // Date filter
      if (filterDate !== "All") {
        const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        const now = new Date();
        
        if (filterDate === "This Month") {
          if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filterDate === "Last Month") {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (expDate.getMonth() !== lastMonth.getMonth() || expDate.getFullYear() !== lastMonth.getFullYear()) return false;
        } else if (filterDate === "This Year") {
          if (expDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [expenses, filterCategory, filterDate]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  const categoryMonthlyTotals = useMemo(() => {
    const totals = {};
    const now = new Date();
    expenses.forEach(exp => {
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        const cat = exp.category || "Other";
        totals[cat] = (totals[cat] || 0) + exp.amount;
      }
    });
    return totals;
  }, [expenses]);

  const budgetWarnings = useMemo(() => {
    if (!activeBike?.budget) return [];
    const warnings = [];
    Object.entries(activeBike.budget).forEach(([cat, limit]) => {
      if (limit > 0) {
        const spent = categoryMonthlyTotals[cat] || 0;
        if (spent >= limit) {
          warnings.push({ cat, type: "exceeded", limit, spent });
        } else if (spent >= limit * 0.8) {
          warnings.push({ cat, type: "warning", limit, spent });
        }
      }
    });
    return warnings;
  }, [activeBike?.budget, categoryMonthlyTotals]);

  if (!user || !activeBikeId) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-purple-400" /> Expense Tracker
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage your spending for {activeBike?.name || "Selected Bike"}
              </p>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="btn-glow px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2 text-sm"
            >
              {showAdd ? <X size={16} /> : <Plus size={16} />}
              {showAdd ? "Cancel" : "Add Expense"}
            </button>
          </motion.div>

          {/* Budget Warnings */}
          {budgetWarnings.length > 0 && (
            <div className="mb-6 space-y-2">
              {budgetWarnings.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl flex items-center gap-3 border ${
                    w.type === "exceeded" 
                      ? "bg-red-500/10 border-red-500/30 text-red-200" 
                      : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  }`}
                >
                  <AlertTriangle size={18} className={w.type === "exceeded" ? "text-red-400" : "text-amber-400"} />
                  <div>
                    <p className="text-sm font-semibold">
                      {w.type === "exceeded" ? "Budget Exceeded" : "Approaching Budget Limit"} - {w.cat}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      You&apos;ve spent ₹{w.spent.toLocaleString('en-IN')} of your ₹{w.limit.toLocaleString('en-IN')} monthly limit.
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add Form */}
          <AnimatePresence>
            {showAdd && (
              <motion.form
                initial={{ opacity: 0, height: 0, mb: 0 }}
                animate={{ opacity: 1, height: "auto", mb: 32 }}
                exit={{ opacity: 0, height: 0, mb: 0 }}
                className="overflow-hidden"
                onSubmit={handleAddExpense}
              >
                <div className="glass rounded-2xl p-6 border border-purple-500/30">
                  <h2 className="text-lg font-semibold text-white mb-4">New Expense</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="glass-input"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="glass-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="glass-input"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="glass-input"
                        placeholder="e.g. Chain lube"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-xs text-slate-400 mb-2">Receipt / Invoice (Optional)</label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer glass px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white border border-white/10 flex items-center gap-2 transition-colors">
                        <ImageIcon size={16} /> Choose File
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                      </label>
                      {previewUrl && (
                        <div className="relative">
                          {receiptFile?.type?.includes("pdf") ? (
                            <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-xs text-slate-400">PDF</div>
                          ) : (
                            <img src={previewUrl} alt="Preview" className="h-12 rounded object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => { setReceiptFile(null); setPreviewUrl(""); }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-glow px-6 py-2 rounded-xl text-white font-semibold flex items-center gap-2"
                    >
                      {isSubmitting ? "Saving..." : "Save Expense"}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Stats & Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="glass rounded-2xl p-5 border border-white/10 flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Running Total</p>
                <p className="text-3xl font-bold text-white mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <IndianRupee size={24} className="text-purple-400" />
              </div>
            </div>
            
            <div className="glass rounded-2xl p-5 border border-white/10 flex-1 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-3">
                <Filter size={16} className="text-slate-400" />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent text-sm text-white outline-none w-full border-b border-white/10 pb-1">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-slate-400" />
                <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-sm text-white outline-none w-full border-b border-white/10 pb-1">
                  <option value="All">All Time</option>
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Year">This Year</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center border border-white/10">
                <Wallet className="mx-auto text-slate-500 mb-3" size={32} />
                <h3 className="text-white font-medium text-lg">No expenses found</h3>
                <p className="text-slate-400 text-sm mt-1">Try adjusting filters or add a new expense.</p>
              </div>
            ) : (
              filteredExpenses.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-4 border border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm sm:text-base">
                        {exp.category}
                        {exp.description && <span className="text-slate-400 font-normal ml-2">- {exp.description}</span>}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {exp.date?.toDate ? exp.date.toDate().toLocaleDateString('en-IN') : new Date(exp.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <p className="text-lg font-bold text-white">₹{exp.amount.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-2">
                      {exp.receiptUrl && (
                        <button
                          onClick={() => setViewerUrl(exp.receiptUrl)}
                          className="p-2 rounded-lg bg-white/5 text-cyan-400 hover:bg-white/10 transition-colors"
                          title="View Receipt"
                        >
                          <ImageIcon size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp)}
                        className="p-2 rounded-lg bg-white/5 text-red-400 hover:bg-red-500/20 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Viewer Modal */}
      <AnimatePresence>
        {viewerUrl && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-3xl glass rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <p className="text-white text-sm font-semibold">Receipt</p>
                <button onClick={() => setViewerUrl(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-black/60 p-3 h-[75vh] flex items-center justify-center relative">
                {(viewerUrl.toLowerCase().includes('.pdf') || viewerUrl.toLowerCase().includes('%2fpdf')) ? (
                  <PdfViewer url={viewerUrl} />
                ) : (
                  <img src={viewerUrl} alt="Receipt" className="w-full h-full object-contain rounded-lg" />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
