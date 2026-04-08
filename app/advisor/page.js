"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Bot, Loader2, Sparkles, MessageSquare, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import ReactMarkdown from "react-markdown";

export default function AIAdvisorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [dataContext, setDataContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Fetch contextual user data
  useEffect(() => {
    if (!user) return;
    const fetchContext = async () => {
      try {
        const uRef = await getDoc(doc(db, "users", user.uid));
        const uData = uRef.data() || {};
        
        // Fetch context without orderBy to avoid Firebase index errors, then sort in JS
        const qRides = query(collection(db, "rides"), where("userId", "==", user.uid));
        const rSnap = await getDocs(qRides);
        const latestRides = rSnap.docs
          .map(d => ({ km: d.data().km, date: d.data().date?.toDate() }))
          .sort((a,b) => (b.date || 0) - (a.date || 0))
          .slice(0, 5);

        const qExp = query(collection(db, "expenses"), where("userId", "==", user.uid));
        const eSnap = await getDocs(qExp);
        const latestExpenses = eSnap.docs
          .map(d => ({ amount: d.data().amount, type: d.data().type, date: d.data().date?.toDate() }))
          .sort((a,b) => (b.date || 0) - (a.date || 0))
          .slice(0, 5);

        setDataContext({
          userStats: {
            bikeName: uData.bikeName || "My Bike",
            totalKm: uData.totalKm || 0,
            oilChangeLimit: uData.oilChangeLimit,
            kmSinceLastChange: (uData.totalKm || 0) - (uData.lastResetKm || 0)
          },
          recentRides: latestRides,
          recentExpenses: latestExpenses
        });
      } catch (err) {
         console.error("Error fetching context:", err);
      }
    };
    fetchContext();
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           prompt: userMsg,
           contextObj: dataContext,
           history: messages // pass previous messages for ongoing chat
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Unknown API Error";
        try {
           const errData = JSON.parse(errText);
           errMsg = errData.error || errData.message || errMsg;
        } catch(e) {
           errMsg = errText.substring(0, 80); // Catch HTML error splash text safely
        }
        
        if (errMsg) {
           throw new Error(errMsg);
        }
      } else {
         const data = await res.json();
         setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetQuestions = [
    "Analyze my recent rides and efficiency.",
    "When should I change my engine oil?",
    "How can I reduce my motorcycle maintenance expenses?",
    "What are signs of a worn-out chain?"
  ];

  if (authLoading) return <div className="min-h-screen bg-[#050510]" />;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 md:pb-6 px-4 sm:px-6 flex flex-col max-w-4xl mx-auto h-screen">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0 border-b border-white/10 pb-4">
           <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-purple-400" /> AI Mechanic Advisor
           </h1>
           <p className="text-slate-400 text-sm mt-1">Ask questions, request analysis, and get accurate insights.</p>
        </motion.div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
           {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-80 mt-10">
                 <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Bot size={32} className="text-purple-400" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
                    <p className="text-slate-400 max-w-sm text-sm">I have secure access to your bike's KM, rides, and maintenance history. Ask me anything!</p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                    {presetQuestions.map((q, i) => (
                       <button
                         key={i}
                         onClick={() => { setInput(q); }}
                         className="glass p-3 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left flex items-start gap-2"
                       >
                         <MessageSquare size={16} className="shrink-0 mt-0.5 text-purple-400" />
                         {q}
                       </button>
                    ))}
                 </div>
              </div>
           )}

           {messages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                 {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                       <Bot size={16} className="text-purple-400" />
                    </div>
                 )}
                 <div className={`p-4 rounded-2xl max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'glass border-white/5 text-slate-200 rounded-tl-sm text-sm'}`}>
                    {msg.role === 'user' ? (
                       <p>{msg.text}</p>
                    ) : (
                       <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10 prose-strong:text-purple-300">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                       </div>
                    )}
                 </div>
              </motion.div>
           ))}
           
           {isLoading && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex gap-4 justify-start">
                 <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <Loader2 size={16} className="text-purple-400 animate-spin" />
                 </div>
                 <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: "0.2s"}} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: "0.4s"}} />
                 </div>
              </motion.div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="pt-4 shrink-0">
           <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={dataContext ? "Ask about your bike's health or expenses..." : "Loading contextual data..."}
                disabled={!dataContext || isLoading}
                className="w-full glass bg-slate-900/50 border-white/10 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-slate-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !dataContext}
                className="absolute right-2 top-2 bottom-2 w-10 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md"
              >
                 <Send size={18} className={input.trim() && !isLoading ? "ml-0.5" : ""} />
              </button>
           </form>
        </div>
      </main>
    </>
  );
}
