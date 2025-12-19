## Fanforge — Demo site

This repository contains a small demo site with a simple Express backend for collecting subscriptions and basic visit tracking.

Pages:
- `index.html` — landing page with "Proceed" button
- `enter-email.html` — collect an email address
- `plans.html` — show Monthly/Yearly plans and "Pay Now" actions

Run locally (recommended: full demo)
1. Ensure Node.js (LTS) is installed and available in your shell (`node -v` and `npm -v`).
2. From the project folder in PowerShell:

```powershell
cd 'C:\Users\Zirlen\OneDrive\Desktop\Project FANDOM'
npm install
npm start
```

3. Open `http://localhost:3000` in your browser.

What the backend provides
- `POST /subscribe` — receive `{ email, plan }`; saves deduplicated subscriptions to `subscriptions.json`.
- `POST /visit` — background visit tracking used for total and unique counts (client ids are hashed server-side).
- Admin endpoints (protected):
	- `GET /subscriptions` — list subscriptions
	- `DELETE /subscriptions/:email` — delete a subscription
	- `GET /counts` — returns plan counts and visit totals
	- `GET /export/visits.csv` — download visit stats CSV

Admin security
- Set `ADMIN_TOKEN` (preferred) or `ADMIN_USER`/`ADMIN_PASS` to protect admin endpoints. The admin UI (`admin.html`) accepts a token and sends it as `x-admin-token` header.
- For quick local development, the server accepts `devtoken` if no admin env variables are set. Don't use `devtoken` in production.

Visit tracking (current behavior)
- The server stores visit data in `visits.json` (file-based storage). This JSON contains `total` and an `ids` map of hashed client ids to last-seen timestamps.
- The server hashes client ids (SHA-256) before storing; raw client ids are never saved.
- The server prunes old ids by age (default 90 days) and enforces a maximum number of ids (default 10,000). Configure with `VISIT_RETENTION_DAYS` and `VISIT_MAX_IDS` environment variables.

Notes about the JSON fallback
- To avoid native build requirements on Windows (e.g., `better-sqlite3`), this project currently uses a JSON file (`visits.json`) for visit tracking. This is sufficient for small to moderate usage (hundreds to low thousands of visitors).
- Tradeoffs: file-based storage is simpler but less robust under concurrent write load. For heavier usage, consider installing the Visual Studio Build Tools and switching back to SQLite (I can help with migration).

If you want me to switch to SQLite storage instead (requires native module builds), say so and I will outline the steps to install build tools and update the project.

If anything in the repo needs updates or you want me to run `npm install` and start the server, tell me and I will guide the exact commands to run in PowerShell.

## 🚀 Recent System Updates: The HUD Overhaul (2025)

The FanForge front-end has been upgraded to a **Cyberpunk HUD (Head-Up Display)** interface. This update focuses on high-immersion user onboarding and a "Glassmorphism" aesthetic.

### 🛠 Tech Stack Enhancements
* **UI/UX:** Glassmorphism (Backdrop-blur) and Neon-Cyan color system.
* **Animations:** Hardware-accelerated CSS keyframes for "System Scans" and digital glitch effects.
* **Interactive Logic:** Asynchronous JavaScript Typewriter engine for real-time system feedback.
* **Typography:** Switched to `Orbitron` (Headers) and `Inter` (Body) via Google Fonts.
* **Sensory Design:** Integrated localized audio triggers for digital tactile feedback.

### ⚡ Key Features Added
1.  **Founder Access Sequence:** A multi-stage success overlay that triggers upon waitlist submission.
2.  **Digital Scan Line:** An automated CSS scanning animation that simulates a security check.
3.  **Typewriter UI:** Real-time character rendering for "Founder IDs" and "Priority Access" status.
4.  **Audio Anchoring:** Digital "chirp" sound effects to confirm user interactions.

### 📂 File Structure Modifications
* `styles.css`: Centralized all HUD design variables and animation keyframes.
* `frontpage.html`: Integrated the success overlay architecture and audio assets.
* `scripts.js`: Added the `typeWriter` engine and `triggerSuccessSequence` logic.
