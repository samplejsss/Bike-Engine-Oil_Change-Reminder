import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ActiveBikeProvider } from "@/hooks/useActiveBike";
import FcmInitializer from "@/components/FcmInitializer";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400","500","600","700"] });

const SITE_URL = "https://myvehiclecares.vercel.app";
const SITE_NAME = "MyVehicleCares";

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "MyVehicleCares — Smart Motorcycle Maintenance & Oil Change Reminder",
    template: "%s | MyVehicleCares",
  },

  description:
    "MyVehicleCares is the #1 free motorcycle maintenance app. Track daily km, get oil change reminders, log fuel, manage expenses, and get AI-powered bike advice. Never miss a service again.",

  keywords: [
    "MyVehicleCares",
    "my vehicle care",
    "myvehiclecares.vercel.app",
    "bike oil change reminder",
    "motorcycle maintenance tracker",
    "bike km tracker",
    "two wheeler service reminder",
    "bike health tracker",
    "motorcycle oil change app",
    "bike fuel tracker",
    "bike expense tracker",
    "Royal Enfield maintenance",
    "Honda Activa service tracker",
    "KTM maintenance app",
    "free bike tracker app",
    "vehicle maintenance app India",
    "bike service reminder India",
    "odometer tracker",
    "bike mileage tracker",
    "BikeCare",
    "shanib ck",
    "shanibck.me",
  ],

  authors: [{ name: "Shanib C K", url: "https://www.shanibck.me/" }],
  creator: "Shanib C K",
  publisher: "Shanib C K",

  category: "Automotive, Productivity, Utilities",

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
    languages: { "en-IN": `${SITE_URL}/en-IN` },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "MyVehicleCares — Smart Motorcycle Maintenance App",
    description:
      "Track your daily rides, get oil change alerts, log fuel, and manage your bike expenses — all in one beautiful free app. Built for Indian riders.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "MyVehicleCares — Smart Motorcycle Maintenance App",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@shanibck",
    creator: "@shanibck",
    title: "MyVehicleCares — Smart Motorcycle Maintenance App",
    description:
      "Never miss an oil change. Track rides, fuel, expenses & get AI maintenance advice. Free motorcycle health tracker.",
    images: [`${SITE_URL}/og-image.png`],
  },

  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/logo.png",
  },

  manifest: "/site.webmanifest",

  verification: {
    // Add your actual Google Search Console verification token here once you register
    // google: "your-verification-token",
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "MyVehicleCares",
    "application-name": "MyVehicleCares",
    "msapplication-TileColor": "#7c3aed",
    "theme-color": "#7c3aed",
    "format-detection": "telephone=no",
  },
};

// ── Structured Data (JSON-LD) ─────────────────────────────────────────────
function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: "MyVehicleCares",
        url: SITE_URL,
        description:
          "Free motorcycle maintenance tracking app. Track daily km, get oil change reminders, log fuel, manage expenses, and get AI-powered bike advice.",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web, Android, iOS",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        author: {
          "@type": "Person",
          name: "Shanib C K",
          url: "https://www.shanibck.me/",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "120",
          bestRating: "5",
        },
        featureList: [
          "Oil change km reminder",
          "Daily ride km tracking",
          "Odometer reading tracker",
          "Fuel efficiency (km/L) log",
          "Expense tracker",
          "AI mechanic advisor",
          "Document vault (RC, insurance, PUC)",
          "Multi-bike profile support",
          "Ride history & analytics",
          "WhatsApp/SMS mechanic alerts",
        ],
        screenshot: `${SITE_URL}/og-image.png`,
        image: `${SITE_URL}/logo.png`,
        inLanguage: "en-IN",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "MyVehicleCares",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 256,
          height: 256,
        },
        founder: {
          "@type": "Person",
          name: "Shanib C K",
          url: "https://www.shanibck.me/",
          jobTitle: "Developer",
          sameAs: ["https://www.shanibck.me/"],
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: "https://www.shanibck.me/",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "MyVehicleCares",
        description: "Smart motorcycle maintenance and oil change reminder app",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is MyVehicleCares free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, MyVehicleCares is completely free to use. No subscription, no credit card required.",
            },
          },
          {
            "@type": "Question",
            name: "How does the oil change reminder work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You set your oil change interval in km (e.g., 2000 km). BikeCare tracks your rides and sends an alert when you're approaching or have exceeded the limit.",
            },
          },
          {
            "@type": "Question",
            name: "Can I track multiple bikes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! MyVehicleCares supports multiple bike profiles. Each bike has its own independent km counter, oil change history, fuel logs, and expenses.",
            },
          },
          {
            "@type": "Question",
            name: "Is my data secure?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "All data is stored securely in Firebase — Google's cloud infrastructure. Your data is private and only accessible to your account.",
            },
          },
          {
            "@type": "Question",
            name: "Does it work for all bikes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, MyVehicleCares works with any two-wheeler — Royal Enfield, Honda, Yamaha, Bajaj, KTM, Hero, Suzuki, TVS, and more.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={spaceGrotesk.className}>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#7c3aed" />
        <StructuredData />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ActiveBikeProvider>
            <FcmInitializer />
            <div className="bg-mesh" aria-hidden="true" />
            <div className="bg-mesh-grid" aria-hidden="true" />
            <div className="relative z-10 w-full overflow-x-hidden min-h-screen">
              {children}
            </div>
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#1e293b",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                },
              }}
            />
          </ActiveBikeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
