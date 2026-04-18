# 🍽️ SmartDine-Pro

![SmartDine-Pro Banner](https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80)

**SmartDine-Pro** is a modern, real-time, cloud-synchronized restaurant management and self-ordering platform built for peak operational efficiency. Designed to bridge the gap between dining customers and kitchen staff, it eliminates traditional wait-times using table-specific QR codes, live synchronization, and a zero-friction multi-device architecture.

---

## ✨ Features

### 🚀 Zero-Friction Customer Experience (PWA)
- **Instant Table Menus:** Scan a QR code (e.g., Table 5) to jump straight into the beautifully designed digital menu on an exact table allocation. No app downloads required.
- **Dynamic Cart & Ordering:** Easily customize quantities and place orders that instantly ping the kitchen display without waiting for a server.
- **Real-Time Order Tracking:** Customers watch their order progress directly from their phone (`Received` ➔ `Cooking` ➔ `Ready` ➔ `Served`).

### 👨‍🍳 Dedicated Kitchen & Service Displays
- **Service Panel (Waiter UI):** Streamlined interface for waitstaff to monitor active and ready orders dynamically. Includes a pulse-alert for items ready to be marched to the table.
- **Immediate State Synchronization:** Firebase Firestore guarantees that once the chef pushes "Ready", it lights up on the waiter's iPad and the customer's phone within milliseconds.

### 💼 Master Management Console (Staff Auth)
- **Bird’s Eye Billing:** The management console provides live updates mapping gross revenue, active capacity, and outstanding ticket sums.
- **Live Menu Pricing Engine:** Update item costs and availability on-the-fly and watch the customer's remote mobile screens update natively without page refreshes.
- **Daily Financial Exports:** Generate a comprehensive End-of-Day (EOD) sales CSV report for flawless accounting.
- **Secure Access:** Locked behind a centralized 4-digit organizational PIN (configured as `5258`).

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React, Vite (configured as a Multi-Page App for isolated entry points)
- **Styling:** Vanilla CSS 3 with dynamic keyframes and a premium UI glassmorphism design language.
- **Backend/Database:** Google Firebase (Firestore Database)
- **Hosting:** Firebase Cloud Hosting configured with Single-Page rewrites for deep-linking. 

---

## ☁️ Deployment & Usage

This project is deployed to Google's highly available serverless infrastructure.

1. **Access the Application Suite:**
   - **Customer Entry:** [https://smartdine-pro.web.app](https://smartdine-pro.web.app)
   - **Management Console:** [https://smartdine-pro.web.app/staff.html](https://smartdine-pro.web.app/staff.html)
   - **Waiter Display:** [https://smartdine-pro.web.app/waiter.html](https://smartdine-pro.web.app/waiter.html)

2. **Local Development:**
   ```bash
   npm install
   npm run dev
   ```

3. **Production Cloud Build:**
   ```bash
   npm run build
   npx firebase-tools deploy
   ```

---
*Built with modern cloud architecture by Karthik.*
