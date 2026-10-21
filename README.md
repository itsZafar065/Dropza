# DROPZA — Full-Stack File Sharing Platform
> **"Drop it. Share it. Done."**

Dropza is a production-oriented, privacy-conscious file sharing and device-to-device streaming platform inspired by the core functionality of AirForShare, built with an original brand identity, architecture, and user experience.

---

## 🚀 Key Features

1. **Private Cloud File Sharing (`/share`)**
   - Direct-to-storage uploads via short-lived, restricted presigned `PUT` URLs.
   - Cryptographically signed HMAC tokens on local storage fallback to prevent unauthorized access.
   - Strict path traversal prevention ensuring storage keys never break out of storage bounds.
   - Server-side verification of actual storage object size and existence before publication.
   - Unpredictable 32-byte cryptographic share tokens with deterministic SHA-256 database lookups.
   - Configurable self-destruct timers (1 hour, 24 hours, 7 days).
   - Optional bcrypt password protection with brute-force attack prevention (lockout after 5 failed attempts).
   - Download limit controls (e.g. burn after 1 download).
   - Real-time client progress, upload cancellation, and instant link revocation.
   - Mobile QR code generation for every share link.

2. **Direct Device-to-Device WebRTC Transfer (`/transfer`)**
   - Zero-cloud, peer-to-peer file streaming directly over encrypted WebRTC `RTCDataChannel`s.
   - Persistent `TransferRoom` database records with optional 4-digit PIN protection.
   - 6-character short room codes (e.g. `K7N9XP`) and one-click camera QR code pairing.
   - Binary chunking (64KB ArrayBuffer slices) with DataChannel backpressure management (`bufferedAmount` & `bufferedamountlow`).
   - Receiver approval prompt: preview filename, size, and MIME type before accepting bytes.
   - Live transfer progress and connection diagnostic logs.
   - Graceful fallback: when corporate NAT/firewalls block direct P2P transport, Dropza gracefully explains the TURN relay requirement and offers an explicit alternative to use encrypted Cloud Sharing.

3. **Text & URL Sharing (`/text`)**
   - Instant cross-device snippet sharing for clipboard text, code, passwords, and links.
   - URL auto-detection with safe hostname metadata previews.
   - Strict XSS protection (user content rendered safely without raw markup).
   - Burn-after-reading view limits and password protection with brute-force protection.
   - Snippet revocation endpoint (`/api/text/[token]/revoke`) and public abuse reporting modal.

4. **Account & Guest Workflows**
   - **Guest Mode**: Instant sharing with no registration required (50MB cloud upload limit).
   - **Authenticated Accounts**: Register with email/password to unlock 2GB upload quotas and access `/dashboard` to monitor active links, track downloads, revoke links, and delete files.

5. **Security & Moderation**
   - Sliding-window rate limiting on all API endpoints.
   - Restricted executable file uploads (.exe, .bat, .msi, etc.) for guests.
   - Production Content Security Policy (CSP), HSTS, and frame protections.
   - One-way salted SHA-256 IP hashing for privacy-compliant download logging and abuse prevention.
   - Public abuse reporting modal (`/api/abuse`) with categorized reasons for files, share links, and text snippets.
   - Automated cleanup endpoint (`/api/cron/cleanup`) for purging expired files from S3 and revoking stale links.

---

## 🛠 Technology Stack & Dependencies

| Dependency | Purpose |
| :--- | :--- |
| **Next.js 14 (App Router)** | Modern full-stack framework with React Server Components and typed Route Handlers. |
| **TypeScript** | Strict compile-time type safety across frontend, backend, and signaling. |
| **Tailwind CSS** | Custom design system with dark obsidian (`#0B120E`, `#111C15`), mint light, and emerald (`#10B981`, `#059669`). |
| **Prisma ORM** | Type-safe database queries, schema migrations, and relational modeling. |
| **PostgreSQL / SQLite** | Production PostgreSQL support with instant zero-config SQLite local development option. |
| **NextAuth.js (Auth.js)** | Session and JWT authentication with bcrypt password verification. |
| **@aws-sdk/client-s3** | S3-compatible object storage operations (AWS S3, MinIO, Cloudflare R2, Wasabi). |
| **@aws-sdk/s3-request-presigner** | Generates restricted 15-minute upload and 5-minute download presigned URLs. |
| **ws (WebSocket)** | Dedicated, low-latency signaling service for WebRTC discovery and negotiation. |
| **WebRTC DataChannels** | Browser-native peer-to-peer binary streaming with backpressure handling. |
| **qrcode** | High-resolution canvas/dataURL QR code generation for instant mobile handoff. |
| **Zod** | Runtime request body schema validation and parameter sanitization. |
| **Vitest** | Fast automated unit and integration test runner. |

---

## 📂 Project Structure

```text
Dropza/
├── prisma/
│   ├── schema.prisma             # Active Prisma schema (SQLite dev / PostgreSQL prod)
│   ├── schema.postgresql.prisma  # PostgreSQL schema with native enums
│   └── seed.ts                   # Seed script with genuine physical quickstart guide
├── signaling/
│   ├── server.ts                 # Dedicated Node.js WebSocket signaling service (port 3001)
│   ├── room-manager.ts           # Peer discovery, room isolation & timeout engine
│   └── types.ts                  # Protocol message definitions
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Sign-in page
│   │   ├── (auth)/register/      # Account registration page
│   │   ├── api/
│   │   │   ├── abuse/            # Abuse report submission (files, shares, text)
│   │   │   ├── auth/             # NextAuth route handler & user registration
│   │   │   ├── cron/cleanup/     # Automated file purge & link revocation cron
│   │   │   ├── share/            # Public share metadata, download, & revocation
│   │   │   ├── storage/local/    # Cryptographically signed local storage fallback
│   │   │   ├── text/             # Text snippet creation, retrieval, & revocation
│   │   │   ├── transfer/room/    # Persistent transfer room creation, verification & PIN join
│   │   │   ├── uploads/          # Presigned upload initiate & complete validation
│   │   │   └── user/files/       # User dashboard file listing & deletion
│   │   ├── dashboard/            # User files & links management
│   │   ├── faq/                  # Frequently Asked Questions
│   │   ├── privacy/              # Privacy Policy
│   │   ├── s/[token]/            # Public file download page
│   │   ├── settings/             # Persistent user settings & preferences
│   │   ├── share/                # Cloud file sharing upload interface
│   │   ├── terms/                # Terms of Service
│   │   ├── text/                 # Text & URL sharing interface
│   │   ├── transfer/             # Direct WebRTC device-to-device transfer
│   │   ├── layout.tsx            # Root layout with Navbar, Footer & Providers
│   │   └── page.tsx              # Homepage with hero, quick dropzone & features
│   ├── components/
│   │   ├── common/QrCodeDisplay  # Reusable QR code component
│   │   ├── layout/               # Navbar & Footer
│   │   └── ui/                   # Button, Input, Card, Modal, Progress, Toast
│   └── lib/
│       ├── auth.ts               # NextAuth options & credentials provider
│       ├── crypto.ts             # Cryptographic tokens, hashing & room codes
│       ├── prisma.ts             # PrismaClient singleton
│       ├── ratelimit.ts          # In-memory sliding window rate limiter
│       ├── s3.ts                 # S3 client & HMAC presigned URL generator
│       ├── utils.ts              # Formatting & sanitization helpers
│       ├── validations.ts        # Zod validation schemas & blocked extensions
│       └── webrtc/               # WebRTC client & binary chunker
└── tests/                        # Vitest automated test suites (10 suites, 27 tests)
```

---

## 🏃 Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```
   > **Default Seed Accounts:**
   > - Demo User: `user@dropza.local` / `Password123!`
   > - Administrator: `admin@dropza.local` / `AdminPass123!`

3. **Start the WebRTC Signaling Service:**
   ```bash
   npm run signaling
   ```
   Runs on `ws://localhost:3001`.

4. **Start the Next.js Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Run the Automated Tests:**
   ```bash
   npm run test
   ```

---

## 🌐 Object Storage & STUN/TURN Guide

### 1. S3-Compatible Storage Setup
- **AWS S3**: Create a private bucket. Apply a lifecycle rule to automatically abort incomplete multipart uploads after 7 days. Configure CORS to allow `PUT` and `GET` requests from your frontend origin.
- **Cloudflare R2**: Set `S3_ENDPOINT` to `https://<account_id>.r2.cloudflarestorage.com`. R2 features zero egress fees, making it an ideal choice for file distribution.
- **MinIO**: For self-hosted deployments, run MinIO via Docker and set `S3_FORCE_PATH_STYLE="true"`.

### 2. STUN & TURN Configuration
WebRTC relies on STUN to discover public IP addresses. When both peers are behind symmetric NATs or restrictive corporate firewalls, a **TURN relay** is required.
Add TURN credentials in `NEXT_PUBLIC_ICE_SERVERS`:
```json
[
  { "urls": "stun:stun.l.google.com:19302" },
  {
    "urls": "turn:turn.yourdomain.com:3478",
    "username": "dropza-user",
    "credential": "secure-turn-password"
  }
]
```

---

## 🧹 Automated Cleanup & Maintenance

To automatically purge expired files and revoke old links, schedule a recurring cron job against `/api/cron/cleanup`:
```bash
curl -X POST https://yourdomain.com/api/cron/cleanup \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Recommended frequency: Every 15 minutes.
