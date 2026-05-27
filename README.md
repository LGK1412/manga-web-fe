# MangaWord - Frontend Web App

A high-performance, responsive, and feature-rich frontend application tailored for immersive comic (manga) and light novel reading experiences. Built with modern web technologies, the platform focuses on speed, seamless state management, and real-time interactive user engagement.

 **Backend API Repository:** [Explore MangaWord Backend API](https://github.com/Shinpei2158/manga-web-be)

---

## User Interface Preview

*Provide clear screenshots or GIFs of your application below to showcase your UI/UX design skills.*

| Top-up & VNPay | Achievements |
|---|---|
| <img src="./screenshots/reader-mode.png" width="400" alt="Manga & Novel Reader"/> | <img src="./screenshots/wallet-rewards.png" width="400" alt="VNPAY & Gamification"/> |

| Tax & Accounting Dashboard |
|---|---|
| <img src="./screenshots/accounting-tax.png" width="400" alt="Accounting Panel"/> | <img src="./screenshots/ai-chat.png" width="400" alt="AI Interface"/> |

---

## Tech Stack
- **Framework:** Next.js (App Router, TypeScript)
- **Styling & UI:** Tailwind CSS, Lucide Icons
- **State Management:** Zustand / Redux Toolkit *(Choose the one you actually used)*
- **Real-Time Interaction:** Socket.IO Client
- **Authentication & Services:** Firebase (Auth, Cloud Messaging)

---

## Key Client Features

### 1. Immersive Reading Modes
- Optimized **Comic/Manga Viewer** with infinite scroll and lazy-loading for heavy images.
- Customizable **Light Novel Reader** featuring font adjustments, dark/light themes, and responsive layout for mobile screens.

### 2. Gamified Engagement & Rewards
- Dedicated user dashboard for tracking **Daily Check-ins**, unlocking **Achievements**, and managing user points.

### 3. Integrated FinTech & Tax Interfaces
- Smooth **VNPAY Checkout workflows** with direct user interface redirect handling.
- Comprehensive **Author/Accountant Workspace** to monitor earnings, calculate automated withholding tax deductions, and export payroll/tax data.

### 4. Interactive & AI Features
- Real-time comment sections and system push notifications via **Socket.IO** and **Firebase Cloud Messaging**.
- Built-in **AI Helper interface** interacting with the backend for content lookup and automated chat responses.

---

## Environment Variables (.env.local)

Create a `.env.local` file in the root directory and configure the following:

```env
# API Gateway Endpoint
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Authentication (Google & Firebase)
NEXT_PUBLIC_GG_ID=your_google_client_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_PROJECT_ID=your_project_id
NEXT_PUBLIC_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_APP_ID=your_app_id
NEXT_PUBLIC_MEASUREMENT_ID=your_measurement_id
