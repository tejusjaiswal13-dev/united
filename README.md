 (JanVichar) - Indian PIL Filing Portal

JanVichar is a high-performance, AI-powered platform designed for Indian citizens to collaboratively draft, track, and manage Public Interest Litigations (PILs). It bridges the gap between civic grievances and judicial recourse through community engagement and advanced technology.

## 🚀 Key Improvements 

- **Performance Optimization:** Replaced heavy 3D Spline/Three.js scenes with ultra-lightweight CSS-based animations, reducing bundle size and improving TTI (Time to Interactive).
- **User Experience:** Added character counters and validation feedback loops in the PIL creation process.
- **Architectural Cleanup:** Cleaned up project dependencies and fixed multiple SEO/A11y issues.
- **AI Integration:** Enhanced duplicate detection and legal feasibility checks using Gemini 2.5 Flash.

## ✨ Features

- **Google Authentication:** Secure login using Firebase Auth.
- **PIL Creation:** Multi-step form for drafting PILs with real-time AI-powered character counting and validation.
- **Semantic Duplicate Detection:** AI-driven search to suggest similar existing petitions for consolidation.
- **Real-time Tracker:** Live dashboard of all filed PILs with community support counters.
- **Unified Issue Threads:** Automatically group similar petitions into cohesive threads for stronger legal standing.
- **PDF Export:** Generate court-ready PDF documents from your drafted content.
- **Dark/Light Mode:** Premium UI with high-contrast modes for accessibility.

## 🛠 Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4.
- **Backend:** Firebase (Authentication, Firestore, Storage).
- **AI:** Google Gemini API (@google/generative-ai).
- **Icons:** Lucide React.
- **Animations:** Framer Motion.

## 📦 Getting Started

### Prerequisites

- Node.js 20+ installed.
- A Firebase project with Firestore and Storage enabled.
- A Google Gemini API Key.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tejusjaiswal13-dev/stackoverflowedYukti.git
   cd new
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```env
<<<<<<< HEAD
  
=======
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=... 
   NEXT_PUBLIC_GEMINI_API_KEY=...
>>>>>>> 4f891b4 (feat: remove 3D elements, optimize performance and improve PIL creation UX)
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📈 Roadmap

1. **Phase 1: Feature Enhancements**
   - Add multilingual support (Hindi, Marathi, etc.) for PIL drafting.
   - Implement social sharing previews (Open Graph).

2. **Phase 2: Performance & Scalability**
   - Further optimize image delivery using Next.js Image component.
   - Implement edge-caching for PIL feeds.

3. **Phase 3: Community & Maintenance**
   - Establish a documented contribution guide for legal experts.
   - Set up automated E2E testing with Playwright.

## 📄 License

This project is open-source and intended for social impact. Handle data and legal drafts responsibly.

---
*Created by [tejusjaiswal13-dev](https://github.com/tejusjaiswal13-dev)*
