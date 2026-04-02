"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Bike, LayoutDashboard, History as HistoryIcon, LogOut, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user } = useAuth();
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
      ]
    : [];

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="glass border-b border-white/5 backdrop-blur-2xl">
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
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    pathname === href
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
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
              className="md:hidden text-slate-400 hover:text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 px-4 py-4 space-y-2"
          >
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === href
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={16} /> Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm btn-glow text-white font-medium"
              >
                <LogIn size={16} /> Login
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
