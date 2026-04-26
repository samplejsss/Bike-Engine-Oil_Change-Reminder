"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MaintenanceChecklist from "@/components/MaintenanceChecklist";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { CheckSquare, } from "lucide-react";

export default function ChecklistsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="checklists" />
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
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="text-blue-400" /> Maintenance Checklists
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Stay organized with task checklists for common maintenance procedures
            </p>
          </motion.div>

          {/* Checklists Component */}
          <MaintenanceChecklist />
        </div>
      </main>
    </>
  );
}
