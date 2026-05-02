# 🏍️ BikeCare Tracker

<p align="center">
  <a href="https://nextjs.org">
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  </a>
  <a href="https://react.dev">
    <img src="https://img.shields.io/badge/React-61DAFF?style=for-the-badge&logo=react&logoColor=black" alt="React">
  </a>
  <a href="https://tailwindcss.com">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=black" alt="Tailwind CSS">
  </a>
  <a href="https://firebase.google.com">
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build">
</p>

> A smart motorcycle maintenance tracker that logs your daily rides and sends intelligent oil change reminders based on kilometers driven.

---

## ✨ Key Features

### 📍 Ride Tracking
Log kilometers for each ride with date, notes, and bike selection.

### 🔔 Smart Reminders
Get notified when it's time for an oil change.

### 📊 Analytics Dashboard
View ride history, expense stats, and maintenance trends.

### 🤖 AI Advisor
Chat with AI about your bike maintenance.

### 📄 PDF Reports
Export ride history as PDF documents.

### ⛽ Fuel Tracking
Track fuel expenses and consumption.

### 🔧 Maintenance Log
Record all bike maintenance activities.

### 🛠️ Service Checklists
Pre-built maintenance checklists.

### 🔍 OCR Reading
Upload meter photos to auto-read kilometers.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/bikecare-tracker.git
cd bikecare-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🏗️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | Next.js 16 • React 18 • Tailwind CSS • TypeScript |
| **Backend** | Firebase Auth • Firestore • Cloud Functions |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **PDF** | jsPDF • jsPDF-AutoTable |
| **OCR** | Tesseract.js |

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (AI, etc.)
│   ├── dashboard/        # Main dashboard
│   ├── history/          # Ride history
│   ├── analytics/        # Statistics & charts
│   ├── advisor/          # AI maintenance chat
│   ├── bikes/            # Bike management
│   ├── fuel/             # Fuel tracking
│   ├── maintenance/      # Maintenance logs
│   ├─�� services/         # Service records
│   ├── checklists/       # Maintenance checklists
│   ├── documents/        # Document & PDF exports
│   ├── settings/        # App settings
│   └── login/            # Authentication
├── components/            # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Firebase & utilities
└── functions/            # Firebase Cloud Functions
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🔥 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Cloud Firestore**
4. Create a web app and copy config to `.env.local`

### Firestore Security Rules

```javascript
rules version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /rides/{rideId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🔗 Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Authentication |
| `/dashboard` | Main dashboard |
| `/history` | Ride history |
| `/analytics` | Statistics & charts |
| `/advisor` | AI maintenance chat |
| `/bikes` | Bike management |
| `/fuel` | Fuel tracking |
| `/maintenance` | Maintenance logs |
| `/services` | Service records |
| `/checklists` | Maintenance checklists |
| `/documents` | Document exports |
| `/settings` | App settings |

---

## 🚢 Deploy

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo)

---

## 📜 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Built with ❤️ for bike enthusiasts</sub>
</p>
