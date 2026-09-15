# Smart Campus Visitor Management System

A full-stack, mobile-first campus visitor management platform built with a **Bare React Native CLI** mobile application and a **Node.js / Express.js / Supabase** backend. 

Instead of disposable visitor slips, administrators generate durable physical/digital **QR badges** (`V-001`, `V-002`, etc.). Security officers scan badges using the mobile app to quickly check visitors in and out—automatically recycling tokens for future visitors.

---

## Project Structure

```
Smart-visitor/
├── server/                           # Backend API Server (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Supabase & Local JSON DB connector
│   │   ├── controllers/
│   │   │   ├── authController.js     # User authentication
│   │   │   ├── tokenController.js    # Reusable QR token management
│   │   │   └── visitController.js    # Visitor check-in, check-out & logs
│   │   └── routes/
│   │       ├── authRoutes.js         # /api/auth
│   │       ├── tokenRoutes.js        # /api/tokens
│   │       ├── visitRoutes.js        # /api/visits
│   │       └── index.js              # Aggregated API router
│   ├── data/
│   │   └── local_db.json             # Persistent local storage fallback
│   ├── sql/
│   │   └── schema.sql                # PostgreSQL database schema
│   ├── scripts/
│   │   └── test_flow.js              # Automated 12-step integration test
│   ├── server.js                     # Server entry point
│   ├── package.json
│   └── .env.example
│
└── mobile/                           # Bare React Native Mobile App (No Expo)
    ├── src/
    │   ├── constants/
    │   │   ├── theme.js              # Colors, typography, badge themes
    │   │   └── config.js             # API URLs & host resolution (10.0.2.2)
    │   ├── components/
    │   │   ├── QRCodeDisplay.js      # Native vector SVG QR generator
    │   │   └── QRScanner.js          # Native mobile camera scanner & tester
    │   ├── screens/
    │   │   ├── LoginScreen.js        # Admin & Security login
    │   │   ├── AdminPortal.js        # Token generation & audit archives
    │   │   └── SecurityPortal.js     # Gatekeeper scanner & check-in/out
    │   └── services/
    │       └── api.js                # REST API client
    ├── android/                      # Native Android project (Gradle)
    ├── App.js                        # App navigation & role management
    ├── app.json                      # React Native metadata
    ├── index.js                      # AppRegistry root mount
    └── package.json
```

---

## Getting Started

### 1. Start the Backend API
```powershell
cd server
npm install
npm start
```
The server will start on `http://localhost:5000`. By default, it runs with a zero-config persistent local store (`data/local_db.json`). To connect to Supabase, add your credentials in `server/.env`.

To run the automated verification test:
```powershell
npm test
```

### 2. Run the Mobile App (React Native CLI)
```powershell
cd mobile
npm install
npm start
```

In a separate terminal, launch on your target platform:

**Android**:
```powershell
npm run android
```

**iOS (macOS / Xcode)**:
```bash
cd ios && pod install && cd ..
npm run ios
```

---

## Credentials
- **Admin**: `username: admin`, `password: admin123`
- **Security**: `username: security`, `password: security123`
