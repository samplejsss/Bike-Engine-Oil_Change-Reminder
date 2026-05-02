"use client";
import { motion } from "framer-motion";

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  badge, 
  rightContent,
  colorClass = "text-cyan-400",
  gradientClass = "bg-cyan-500/20"
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
    >
      <div className={`absolute -top-24 -left-24 w-64 h-64 ${gradientClass} rounded-full blur-3xl opacity-40 pointer-events-none mix-blend-screen`}></div>
      <div className="relative z-10 flex-1">
        {badge && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <p className={`${colorClass} font-semibold tracking-wider text-xs uppercase mb-3 ml-1`}>{badge}</p>
          </motion.div>
        )}
        <div className="flex items-center gap-3 mb-2">
          {Icon && (
            <div className={`w-12 h-12 rounded-2xl ${gradientClass} flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
              <Icon className={colorClass} size={24} />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
        </div>
        <p className="text-slate-400 text-base sm:text-lg max-w-xl pl-1">
          {subtitle}
        </p>
      </div>
      {rightContent && (
        <div className="relative z-10 shrink-0">
          {rightContent}
        </div>
      )}
    </motion.div>
  );
}
