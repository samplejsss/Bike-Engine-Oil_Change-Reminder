"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, CheckCheck, Gauge, Wrench, Droplets, AlertTriangle, Info } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const ICON_MAP = {
  oil: <Droplets size={16} className="text-amber-400" />,
  maintenance: <Wrench size={16} className="text-cyan-400" />,
  km: <Gauge size={16} className="text-emerald-400" />,
  alert: <AlertTriangle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

function timeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });
    return () => unsub();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const markOneRead = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell"
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative w-10 h-10 flex items-center justify-center rounded-2xl glass border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all duration-200 group"
      >
        {unreadCount > 0 ? (
          <Bell size={18} className="text-white group-hover:text-cyan-300 transition-colors" />
        ) : (
          <Bell size={18} className="text-slate-400 group-hover:text-slate-200 transition-colors" />
        )}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50 ring-2 ring-black/40"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[340px] sm:w-[380px] z-[200]"
          >
            {/* Panel Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1117]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/5">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-cyan-400" />
                  <span className="text-white font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Mark all read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <BellOff size={28} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                    <p className="text-slate-600 text-xs mt-1">Ride or maintenance alerts will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        onClick={() => markOneRead(n.id)}
                        className={`flex gap-3 p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 ${
                          !n.read ? "bg-cyan-500/5" : ""
                        }`}
                      >
                        {/* Icon bubble */}
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${
                          !n.read
                            ? "bg-cyan-500/10 border-cyan-500/30"
                            : "bg-white/5 border-white/10"
                        }`}>
                          {ICON_MAP[n.type] || ICON_MAP.info}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${!n.read ? "text-white" : "text-slate-300"}`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <div className="shrink-0 mt-1.5">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-white/10 bg-black/20">
                  <p className="text-center text-[11px] text-slate-600">
                    Last 30 notifications shown
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
