"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import { PREDEFINED_MAINTENANCE_TASKS } from "@/lib/maintenanceDefaults";
import { computeNextDue, formatDueLabel, getTaskStatus } from "@/lib/maintenanceUtils";
import { Bike, CheckCircle2, ClipboardList, Download, Loader2, Plus, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

export default function MaintenancePage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBikeId, activeBike, loading: bikeLoading } = useActiveBike();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [bikeOdo, setBikeOdo] = useState(0);

  const [markingId, setMarkingId] = useState(null);
  const [markKm, setMarkKm] = useState("");
  const [markNotes, setMarkNotes] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editMode, setEditMode] = useState("add"); // add | edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    taskName: "",
    intervalKm: "",
    intervalDays: "",
    notes: "",
  });

  const pdfRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const tasksRef = useMemo(() => {
    if (!user || !activeBikeId) return null;
    return collection(db, "users", user.uid, "bikes", activeBikeId, "maintenanceTasks");
  }, [user, activeBikeId]);

  const logsRef = useMemo(() => {
    if (!user || !activeBikeId) return null;
    return collection(db, "users", user.uid, "bikes", activeBikeId, "maintenanceLogs");
  }, [user, activeBikeId]);

  const fetchBikeOdo = useCallback(async () => {
    if (!user || !activeBikeId) return;
    const bikeRef = doc(db, "users", user.uid, "bikes", activeBikeId);
    const snap = await getDoc(bikeRef);
    const d = snap.exists() ? snap.data() : {};
    setBikeOdo(Number(d.lastOdometerReading || 0));
  }, [user, activeBikeId]);

  const seedDefaultsIfEmpty = useCallback(async () => {
    if (!tasksRef) return;
    const snap = await getDocs(tasksRef);
    if (snap.size > 0) return;

    const baseKm = bikeOdo || 0;
    const now = new Date();

    await Promise.all(
      PREDEFINED_MAINTENANCE_TASKS.map(async (t) => {
        const intervalKm = t.intervalKm == null ? null : Number(t.intervalKm);
        const intervalDays = t.intervalDays == null ? null : Number(t.intervalDays);
        const next = computeNextDue({
          lastDoneKm: baseKm,
          lastDoneDate: now,
          intervalKm,
          intervalDays,
        });
        await addDoc(tasksRef, {
          taskName: t.taskName,
          intervalKm,
          intervalDays,
          lastDoneKm: baseKm,
          lastDoneDate: now,
          nextDueKm: next.nextDueKm,
          nextDueDate: next.nextDueDate,
          notes: "",
          createdAt: serverTimestamp(),
        });
      })
    );
  }, [tasksRef, bikeOdo]);

  const fetchTasks = useCallback(async () => {
    if (!tasksRef) return;
    setLoading(true);
    try {
      await fetchBikeOdo();
      await seedDefaultsIfEmpty();
      const snap = await getDocs(tasksRef);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(a.taskName).localeCompare(String(b.taskName)));
      setTasks(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load maintenance tasks.");
    } finally {
      setLoading(false);
    }
  }, [tasksRef, fetchBikeOdo, seedDefaultsIfEmpty]);

  useEffect(() => {
    if (user && activeBikeId) fetchTasks();
  }, [user, activeBikeId, fetchTasks]);

  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      statusInfo: getTaskStatus(t, bikeOdo),
    }));
  }, [tasks, bikeOdo]);

  const dueSoonCount = useMemo(
    () => enrichedTasks.filter((t) => ["amber", "red"].includes(t.statusInfo.status)).length,
    [enrichedTasks]
  );

  const markDone = async (task) => {
    const km = Number(markKm || bikeOdo);
    if (!km || km <= 0) {
      toast.error("Enter a valid odometer km.");
      return;
    }

    const intervalKm = task.intervalKm == null ? null : Number(task.intervalKm);
    const intervalDays = task.intervalDays == null ? null : Number(task.intervalDays);
    const doneDate = new Date();
    const next = computeNextDue({ lastDoneKm: km, lastDoneDate: doneDate, intervalKm, intervalDays });

    setMarkingId(task.id);
    try {
      await updateDoc(doc(tasksRef, task.id), {
        lastDoneKm: km,
        lastDoneDate: doneDate,
        nextDueKm: next.nextDueKm,
        nextDueDate: next.nextDueDate,
        notes: markNotes || task.notes || "",
        updatedAt: serverTimestamp(),
      });
      if (logsRef) {
        await addDoc(logsRef, {
          taskName: task.taskName,
          doneKm: km,
          doneDate,
          notes: markNotes || "",
          createdAt: serverTimestamp(),
        });
      }
      toast.success(`${task.taskName} marked as done.`);
      setMarkKm("");
      setMarkNotes("");
      await fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark task done.");
    } finally {
      setMarkingId(null);
    }
  };

  const openAdd = () => {
    setEditMode("add");
    setEditId(null);
    setEditForm({ taskName: "", intervalKm: "", intervalDays: "", notes: "" });
    setEditorOpen(true);
  };

  const openEdit = (task) => {
    setEditMode("edit");
    setEditId(task.id);
    setEditForm({
      taskName: task.taskName || "",
      intervalKm: task.intervalKm == null ? "" : String(task.intervalKm),
      intervalDays: task.intervalDays == null ? "" : String(task.intervalDays),
      notes: task.notes || "",
    });
    setEditorOpen(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!tasksRef) return;
    if (!editForm.taskName.trim()) {
      toast.error("Task name is required.");
      return;
    }
    const intervalKm = editForm.intervalKm === "" ? null : Number(editForm.intervalKm);
    const intervalDays = editForm.intervalDays === "" ? null : Number(editForm.intervalDays);

    if (intervalKm == null && intervalDays == null) {
      toast.error("Set at least one interval (km or days).");
      return;
    }

    try {
      if (editMode === "add") {
        const now = new Date();
        const next = computeNextDue({
          lastDoneKm: bikeOdo,
          lastDoneDate: now,
          intervalKm,
          intervalDays,
        });
        await addDoc(tasksRef, {
          taskName: editForm.taskName.trim(),
          intervalKm,
          intervalDays,
          lastDoneKm: bikeOdo,
          lastDoneDate: now,
          nextDueKm: next.nextDueKm,
          nextDueDate: next.nextDueDate,
          notes: editForm.notes || "",
          createdAt: serverTimestamp(),
        });
        toast.success("Task added.");
      } else if (editId) {
        const ref = doc(tasksRef, editId);
        const snap = await getDoc(ref);
        const current = snap.exists() ? snap.data() : {};
        const next = computeNextDue({
          lastDoneKm: Number(current.lastDoneKm || bikeOdo),
          lastDoneDate: current.lastDoneDate || new Date(),
          intervalKm,
          intervalDays,
        });
        await setDoc(
          ref,
          {
            taskName: editForm.taskName.trim(),
            intervalKm,
            intervalDays,
            nextDueKm: next.nextDueKm,
            nextDueDate: next.nextDueDate,
            notes: editForm.notes || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success("Task updated.");
      }

      setEditorOpen(false);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save task.");
    }
  };

  const exportPdf = async () => {
    if (!user || !activeBikeId || !logsRef) return;
    try {
      const logSnap = await getDocs(logsRef);
      const logs = logSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .map((l) => ({
          ...l,
          doneDateObj: l.doneDate?.toDate ? l.doneDate.toDate() : l.doneDate?.seconds ? new Date(l.doneDate.seconds * 1000) : new Date(),
        }))
        .sort((a, b) => b.doneDateObj - a.doneDateObj);

      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("BikeCare Maintenance Log", 12, 16);
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Bike: ${activeBike?.name || "Selected Bike"}`, 12, 24);
      pdf.text(`Generated: ${format(new Date(), "PPpp")}`, 12, 30);

      const startY = 40;
      let y = startY;
      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(10);

      const row = (cols) => {
        const [a, b, c, d] = cols;
        pdf.text(String(a || "").slice(0, 22), 12, y);
        pdf.text(String(b || "").slice(0, 14), 68, y);
        pdf.text(String(c || "").slice(0, 10), 104, y);
        pdf.text(String(d || "").slice(0, 28), 130, y);
        y += 6;
        if (y > 280) {
          pdf.addPage();
          pdf.setFillColor(15, 23, 42);
          pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
          pdf.setTextColor(226, 232, 240);
          y = 16;
        }
      };

      pdf.setTextColor(168, 85, 247);
      row(["Task", "Date", "KM", "Notes"]);
      pdf.setTextColor(226, 232, 240);

      logs.forEach((l) => {
        row([
          l.taskName,
          format(l.doneDateObj, "PP"),
          l.doneKm ? `${Number(l.doneKm).toFixed(0)}` : "",
          l.notes || "",
        ]);
      });

      pdf.save(`maintenance_log_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF.");
    }
  };

  if (authLoading || bikeLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!user || !activeBikeId) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto" ref={pdfRef}>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="text-purple-400" /> Maintenance Schedule
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track routine tasks for {activeBike?.name || "your bike"} · Current odometer:{" "}
              <span className="text-white font-mono font-semibold">{bikeOdo.toFixed(0)} km</span>
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
            <div className="glass rounded-2xl border border-white/10 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Bike className="text-amber-400" size={18} />
              </div>
              <div>
                <p className="text-slate-500 text-xs">Tasks due soon</p>
                <p className="text-white font-bold text-xl">{dueSoonCount}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openAdd}
                className="px-4 py-2 rounded-xl btn-glow text-white text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} /> Add Task
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportPdf}
                className="px-4 py-2 rounded-xl glass border border-white/10 text-slate-200 text-sm font-semibold flex items-center gap-2 hover:bg-white/5"
              >
                <Download size={16} /> Export PDF
              </motion.button>
            </div>
          </div>

          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-0 px-5 py-3 bg-slate-900/40 text-xs text-slate-400 font-semibold">
              <div className="col-span-3">Task</div>
              <div className="col-span-3">Next Due</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-4 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {enrichedTasks.map((t) => {
                const s = t.statusInfo.status;
                const badge =
                  s === "red"
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : s === "amber"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-4 items-start md:items-center"
                  >
                    <div className="md:col-span-3">
                      <p className="text-white font-semibold">{t.taskName}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Interval:{" "}
                        {t.intervalKm ? `${t.intervalKm} km` : "--"}
                        {t.intervalKm && t.intervalDays ? " / " : ""}
                        {t.intervalDays ? `${t.intervalDays} days` : ""}
                      </p>
                    </div>
                    <div className="md:col-span-3 text-sm text-slate-300">
                      <p className="font-mono">
                        {formatDueLabel({ kmRemaining: t.statusInfo.kmRemaining, daysRemaining: t.statusInfo.daysRemaining })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t.statusInfo.nextDueKm != null ? `@ ${t.statusInfo.nextDueKm.toFixed(0)} km` : ""}
                        {t.statusInfo.nextDueDate ? ` · ${t.statusInfo.nextDueDate.toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${badge}`}>
                        {s === "red" ? "Overdue" : s === "amber" ? "Due soon" : "OK"}
                      </span>
                    </div>
                    <div className="md:col-span-4 flex flex-col md:flex-row gap-2 md:justify-end">
                      <div className="flex gap-2">
                        <input
                          className="glass-input !h-9 !py-0 text-sm w-28"
                          placeholder={`KM (${bikeOdo.toFixed(0)})`}
                          value={markingId === t.id ? markKm : ""}
                          onChange={(e) => setMarkKm(e.target.value)}
                        />
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          disabled={markingId === t.id}
                          onClick={() => markDone(t)}
                          className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                        >
                          {markingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          Mark done
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openEdit(t)}
                          className="px-3 py-2 rounded-lg glass border border-white/10 text-slate-200 text-sm font-semibold flex items-center gap-2 hover:bg-white/5"
                        >
                          <Settings2 size={16} /> Edit
                        </motion.button>
                      </div>
                      {markingId === t.id && (
                        <input
                          className="glass-input !h-9 !py-0 text-sm"
                          placeholder="Notes (optional)"
                          value={markNotes}
                          onChange={(e) => setMarkNotes(e.target.value)}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {editorOpen && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={saveTask}
              className="w-full max-w-lg glass rounded-2xl border border-white/10 p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold text-white">
                {editMode === "add" ? "Add Maintenance Task" : "Edit Maintenance Task"}
              </h3>
              <input
                className="glass-input"
                placeholder="Task name"
                value={editForm.taskName}
                onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="glass-input"
                  type="number"
                  placeholder="Interval km (optional)"
                  value={editForm.intervalKm}
                  onChange={(e) => setEditForm({ ...editForm, intervalKm: e.target.value })}
                />
                <input
                  className="glass-input"
                  type="number"
                  placeholder="Interval days (optional)"
                  value={editForm.intervalDays}
                  onChange={(e) => setEditForm({ ...editForm, intervalDays: e.target.value })}
                />
              </div>
              <textarea
                className="glass-input min-h-24"
                placeholder="Notes (optional)"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/15 text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl btn-glow text-white font-semibold">
                  Save
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

