"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bike, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="border-t border-white/5 mt-auto py-6 px-4"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md btn-glow flex items-center justify-center">
            <Bike size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold gradient-text">BikeCare Tracker</span>
        </div>

        {/* Developer Credit */}
        <p className="text-xs text-slate-500 text-center">
          Developed by{" "}
          <a
            href="https://www.shanibck.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors inline-flex items-center gap-1 hover:underline underline-offset-2"
          >
            Shanib C K <ExternalLink size={10} />
          </a>
        </p>

        {/* Copyright */}
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
}
