# VIKAS MESSAGE AUTOMATOR
**Custom WhatsApp Business Messaging & CRM Suite for Vikas Automobiles**
*Authorized HP Lubricants Distributor & C&F Agent, Satna, Madhya Pradesh, India*
*Office Contact: +91 9827003016*

---

## 1. Overview
**Vikas Message Automator** is a self-hosted, local-first customer communication and messaging automation platform built specifically for Vikas Automobiles. It allows managing customer relationships across Satna, Rewa, Maihar, Nagod, and surrounding industrial/agricultural hubs without recurring monthly software subscriptions, paid third-party messaging gateways, or cloud database fees.

### Key Capabilities
- **Local WhatsApp QR Pairing**: Connect your existing WhatsApp Business number directly by scanning the QR code via *Linked Devices*.
- **Zero-Budget Architecture**: Operates on your local Windows PC with SQLite/JSON local database. No cloud subscriptions or credit card requirements.
- **Statutory Consent Manager**: Strict permission tracking (`OPTED_IN`, `PENDING`, `NOT_GIVEN`, `OPTED_OUT`, `EXPIRED`, `BLOCKED`). Automatic opt-out detection for `STOP`, `UNSUBSCRIBE`, `CANCEL`, etc.
- **Smart Message Pacing**: Local rate regulation, batch pause delays, dynamic jitter, and working-hours enforcement (09:00 - 20:00) to protect your WhatsApp account.
- **HP Lubricants CRM**: Segregated records for Mechanics, Workshops, Automobile Dealers, Retailers, Industrial Fleet Owners, and Distributors.
- **Automated Keywords & Auto-Replies**: Instant canned replies for `PRICE`, `CATALOGUE`, `DEALER`, `LOCATION`, `ORDER`, and `SUPPORT`.
- **Campaign Safety Screen**: Pre-dispatch compliance analysis guaranteeing promotional messages only reach verifiable `OPTED_IN` contacts.

---

## 2. Windows 10 / 11 Quick Installation

### Step 1: Install Node.js
If not already installed, download and install Node.js (version 18 or higher) from:
👉 https://nodejs.org/

### Step 2: Run the Installer
In the project folder, simply double-click:
```bat
install.bat
```
This automatically sets up all required open-source packages in your local environment.

### Step 3: Start the Application
Double-click:
```bat
start.bat
```
This launches the local server and opens your default browser at:
`http://localhost:3000`

### Step 4: Pair WhatsApp Business
1. In the sidebar, navigate to **WhatsApp Connection**.
2. Click **Connect WhatsApp**.
3. Open WhatsApp Business on your phone → tap **Settings (or 3 dots)** → **Linked Devices** → **Link a Device**.
4. Point your camera at the screen to scan the QR code.
5. Your session will pair, showing status **Connected** with Vikas Automobiles' active number.

---

## 3. Transparency & Technical Disclosures

### WhatsApp Web Protocol Notice
- Meta does not offer a free official WhatsApp Business API. Official Meta APIs require per-conversation business fees.
- This application connects via WhatsApp Web multi-device pairing protocols running locally on your computer.
- **Zero Spam Policy**: Sending unsolicited marketing messages to unconsented recipients carries risk of account ban or restrictions. To protect your business number:
  1. Always obtain explicit opt-in consent before promotional broadcasts.
  2. Maintain reasonable pacing (10–20 seconds per message) using the **Smart Message Pacing Engine**.
  3. All contacts who reply `STOP` are immediately placed on the suppression list.

---

## 4. Batch Script Reference

| Batch Script | Purpose |
|--------------|---------|
| `install.bat` | Installs all local dependencies and sets up the local data directory. |
| `start.bat` | Launches the local background engine and opens `http://localhost:3000`. |
| `stop.bat` | Gracefully shuts down the background server and frees port 3000. |
| `backup.bat` | Generates a timestamped JSON snapshot of your entire database in `backups/`. |

---

## 5. Vikas Automobiles Details
- **Company**: VIKAS AUTOMOBILES
- **Role**: HP Lube Distributor & C&F Agent
- **Location**: Satna, Madhya Pradesh 485001, India
- **Phone**: +91 9827003016
