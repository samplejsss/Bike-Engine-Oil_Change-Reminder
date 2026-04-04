import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BikeCare Tracker — Track Your Bike Health Smartly",
  description: "Track your daily rides and never miss an oil change. BikeCare Tracker helps you monitor bike health with smart km-based reminders.",
  keywords: "bike tracker, oil change reminder, motorcycle maintenance, daily ride tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <div className="bg-mesh" aria-hidden="true" />
          <div className="relative z-10 w-full overflow-x-hidden min-h-screen">
            {children}
          </div>
          <Toaster 
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
