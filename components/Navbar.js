"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import { Bike, LayoutDashboard, History as HistoryIcon, LogOut, LogIn, Menu, X, TrendingUp, Settings, Sparkles, Fuel, FileText } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user } = useAuth();
  const { bikes, activeBikeId, selectBike } = useActiveBike();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/history", label: "History", icon: HistoryIcon },
        { href: "/fuel", label: "Fuel", icon: Fuel },
        { href: "/bikes", label: "Bikes", icon: Bike },
        { href: "/maintenance", label: "Maintenance", icon: Settings },
        { href: "/documents", label: "Documents", icon: FileText },
        { href: "/analytics", label: "Analytics", icon: TrendingUp },
        { href: "/advisor", label: "Advisor", icon: Sparkles },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : [];

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="glass border-b border-white/5 backdrop-blur-2xl pointer-events-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg btn-glow flex items-center justify-center">
                    <Bike className="text-white" size={18} />
                  </div>
                  <div className="absolute inset-0 rounded-lg bg-purple-500/30 blur-md group-hover:blur-lg transition-all" />
                </div>
                <span className="font-bold text-lg gradient-text">BikeCare</span>
              </Link>

              {/* Desktop Links */}
              <div className="hidden lg:flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar px-2 mx-4">
                {navLinks.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex-shrink-0 group ${
                        isActive
                          ? "text-purple-300"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="desktopNavIndicator"
                          className="absolute inset-0 bg-purple-500/20 border border-purple-500/30 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <Icon size={16} className={isActive ? "text-purple-400" : "text-slate-500 group-hover:text-purple-400 transition-colors"} />
                        {label}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {user && bikes?.length > 0 && (
                <div className="hidden lg:flex items-center">
                  <select
                    value={activeBikeId || ""}
                    onChange={(e) => selectBike(e.target.value)}
                    className="glass-input !h-10 !py-0 text-sm min-w-44 bg-slate-900 border-white/10"
                  >
                    {bikes.map((bike) => (
                      <option key={bike.id} value={bike.id}>
                        {bike.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auth Buttons (Desktop) */}
              <div className="hidden lg:flex items-center gap-3 ml-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold shadow-lg">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium btn-glow text-white"
                  >
                    <LogIn size={15} /> Login
                  </Link>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all ml-auto"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* ✅ FIXED: Mobile hamburger menu now shows all nav links */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="lg:hidden border-t border-white/5 px-4 py-4 glass overflow-hidden max-h-[80vh] overflow-y-auto no-scrollbar"
              >
                {user && bikes?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2 px-2 uppercase tracking-wider font-semibold">Active Bike</p>
                    <select
                      value={activeBikeId || ""}
                      onChange={(e) => { selectBike(e.target.value); setMobileOpen(false); }}
                      className="glass-input !h-11 text-sm w-full bg-slate-900 border-white/10"
                    >
                      {bikes.map((bike) => (
                        <option key={bike.id} value={bike.id}>
                          {bike.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {navLinks.length > 0 && (
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-slate-500 mb-2 px-2 uppercase tracking-wider font-semibold">Menu</p>
                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          pathname === href
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon size={18} className={pathname === href ? "text-purple-400" : ""} />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="border-t border-white/5 pt-3">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                          {user.email?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-slate-300 text-sm truncate font-medium">{user.email}</span>
                      </div>
                      <button
                        onClick={() => { handleLogout(); setMobileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all font-medium"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-3 w-full py-3 rounded-xl text-sm btn-glow text-white font-medium"
                    >
                      <LogIn size={18} /> Login
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Modern Bottom Navbar (Mobile Only) */}
      {user && (
        <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 pointer-events-none flex justify-center px-4">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="glass rounded-[24px] flex items-center overflow-x-auto no-scrollbar px-2 py-2 shadow-2xl border border-white/10 bg-black/40 backdrop-blur-3xl pointer-events-auto snap-x"
          >
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-none min-w-[72px] snap-center flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-[20px] border border-white/5"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={`relative z-10 p-1 rounded-xl transition-all duration-300 ${isActive ? "text-purple-300 transform scale-110" : "text-slate-400 group-hover:text-white group-hover:scale-105"}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide relative z-10 transition-colors duration-300 ${isActive ? "text-purple-300" : "text-slate-500"}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </motion.div>
        </div>
      )}
    </>
  );
}
