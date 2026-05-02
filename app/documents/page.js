"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBike } from "@/hooks/useActiveBike";
import Navbar from "@/components/Navbar";
import { DOCUMENT_TYPES, getDocumentStatus, statusBadgeClasses } from "@/lib/documentUtils";
import { Eye, FileText, Loader2, UploadCloud, X, Trash2 } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import toast from "react-hot-toast";
import dynamic from 'next/dynamic';
import PageHeader from "@/components/PageHeader";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => <div className="text-white text-sm">Loading PDF Viewer...</div>
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // Free-tier friendly limit: 5MB

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeBikeId, activeBike, loading: bikeLoading } = useActiveBike();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [viewerDoc, setViewerDoc] = useState(null);
  const [form, setForm] = useState({
    type: "Insurance",
    expiryDate: "",
    issueDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const docsRef = useMemo(() => {
    if (!user || !activeBikeId) return null;
    return collection(db, "users", user.uid, "bikes", activeBikeId, "documents");
  }, [user, activeBikeId]);

  const loadDocuments = useCallback(async () => {
    if (!docsRef) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(docsRef));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const aExp = a.expiryDate?.toDate ? a.expiryDate.toDate().getTime() : 0;
        const bExp = b.expiryDate?.toDate ? b.expiryDate.toDate().getTime() : 0;
        return aExp - bExp;
      });
      setDocuments(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [docsRef]);

  useEffect(() => {
    if (user && activeBikeId) loadDocuments();
  }, [user, activeBikeId, loadDocuments]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Max 5MB allowed to keep storage free-tier friendly.");
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!docsRef || !user || !activeBikeId) return;
    if (!selectedFile) {
      toast.error("Please upload a file.");
      return;
    }
    if (!form.expiryDate) {
      toast.error("Expiry date is required.");
      return;
    }

    setSaving(true);
    try {
      const docRef = await addDoc(docsRef, {
        userId: user.uid,
        bikeId: activeBikeId,
        type: form.type,
        fileName: selectedFile.name,
        fileUrl: "",
        expiryDate: new Date(form.expiryDate),
        issueDate: form.issueDate ? new Date(form.issueDate) : null,
        notes: form.notes || "",
        notifiedDays: [],
        createdAt: serverTimestamp(),
      });

      const fileExt = selectedFile.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, `users/${user.uid}/bikes/${activeBikeId}/documents/${uniqueName}`);
      
      await uploadBytes(storageRef, selectedFile);
      const fileUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid, "bikes", activeBikeId, "documents", docRef.id), {
        fileUrl,
      });

      setSelectedFile(null);
      setPreviewUrl("");
      setForm({ type: "Insurance", expiryDate: "", issueDate: "", notes: "" });
      toast.success("Document uploaded.");
      await loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bikes", activeBikeId, "documents", id));
      toast.success("Document deleted");
      await loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  const grouped = useMemo(() => {
    const groups = {};
    DOCUMENT_TYPES.forEach((t) => {
      groups[t] = [];
    });
    documents.forEach((d) => {
      const key = DOCUMENT_TYPES.includes(d.type) ? d.type : "Other";
      groups[key].push(d);
    });
    return groups;
  }, [documents]);



  if (authLoading || bikeLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader variant="documents" />
      </div>
    );
  }

  if (!user || !activeBikeId) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <PageHeader 
            title="Document Vault"
            subtitle={`Manage RC, Insurance, PUC and other bike documents for ${activeBike?.name || "selected bike"}.`}
            icon={FileText}
            badge="Secure Vault"
            colorClass="text-cyan-400"
            gradientClass="bg-cyan-500/20"
          />

          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-white/10 mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Upload Document</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="glass-input"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
                    className="glass-input"
                    placeholder="Issue date"
                  />
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="glass-input min-h-24"
                  placeholder="Notes"
                />
              </div>

              <div className="space-y-3">
                <div
                  {...getRootProps()}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                    isDragActive ? "border-cyan-400 bg-cyan-500/10" : "border-white/15 hover:border-cyan-400/60"
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto text-cyan-300" size={26} />
                  <p className="mt-2 text-sm text-slate-300">
                    {isDragActive ? "Drop the file here..." : "Drag & drop PDF/image, or click to browse"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Max 5MB (free storage friendly)</p>
                </div>
                {selectedFile && (
                  <div className="p-3 rounded-xl border border-white/10 bg-slate-900/40">
                    <p className="text-sm text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                )}
                {previewUrl && (
                  <img src={previewUrl} alt="preview" className="rounded-xl border border-white/10 max-h-52 object-cover w-full" />
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl btn-glow text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {saving ? "Uploading..." : "Upload"}
              </button>
            </div>
          </motion.form>

          <div className="space-y-6">
            {DOCUMENT_TYPES.map((type) => (
              <div key={type}>
                <h3 className="text-white font-semibold mb-3">{type}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(grouped[type] || []).map((d) => {
                    const { status, daysLeft } = getDocumentStatus(d.expiryDate);
                    
                    return (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-4 border border-white/10"
                      >
                        <div className="flex justify-between gap-2 mb-2">
                          <p className="text-white font-semibold text-sm truncate">{d.fileName}</p>
                          <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadgeClasses(status)}`}>
                            {status === "expired" ? "Expired" : status === "expiringSoon" ? "Expiring Soon" : "Valid"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Expiry:{" "}
                          {d.expiryDate?.toDate ? d.expiryDate.toDate().toLocaleDateString("en-IN") : "--"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {daysLeft == null ? "--" : daysLeft <= 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `Expires in ${daysLeft} days`}
                        </p>
                        {d.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{d.notes}</p>}
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewerDoc(d)}
                            disabled={!d.fileUrl}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(d.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1 hover:bg-red-500/20"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {(grouped[type] || []).length === 0 && (
                    <div className="rounded-xl p-4 border border-white/10 bg-slate-900/40 text-slate-500 text-sm">
                      No {type} documents yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {viewerDoc && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-3xl glass rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <p className="text-white text-sm font-semibold truncate">{viewerDoc.fileName}</p>
                <button onClick={() => setViewerDoc(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-black/60 p-3 h-[75vh] relative flex flex-col items-center justify-center rounded-b-2xl">
                {(viewerDoc.fileName?.toLowerCase().endsWith('.pdf') || viewerDoc.fileUrl?.toLowerCase().includes('.pdf') || viewerDoc.fileUrl?.toLowerCase().includes('%2fpdf')) ? (
                  <PdfViewer url={viewerDoc.fileUrl} />
                ) : (
                  <img src={viewerDoc.fileUrl} alt={viewerDoc.fileName} className="w-full h-full object-contain rounded-lg" />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

