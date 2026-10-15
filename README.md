# QRaksha

> **A physical-trust layer for UPI QR codes — verify whether the QR in front of you was actually supposed to be there.**

---

## 1. Problem

### PS Number: `<PS 8>`

### PS Title: `<EASY PAY AND SAFE PAY>`

UPI applications can verify **who receives the money after a QR is scanned**, but they cannot verify whether the **physical QR sticker is genuine, cloned, replaced, or moved to another location**.

QRaksha addresses this gap by allowing merchants to register a QR and continuously prove that the **same QR belongs at the registered physical location**.

Common attacks include:

- **QR Replacement** — a fake QR is pasted over the genuine QR.
- **QR Cloning** — a genuine QR is copied and placed elsewhere.
- **QR Relocation** — a genuine QR is moved to another physical location.
- **Physical Tampering** — the payment surface is altered.

---

## 2. What It Does

QRaksha provides a verification layer before a customer makes a UPI payment.

### Merchant Flow

1. Merchant completes identity verification using **GST/Udyam or proof-of-possession**.
2. Merchant registers the physical QR.
3. Reference image and GPS location are captured.
4. The image is converted into an embedding and the raw photo is discarded.
5. A credential is created and its hash is anchored on a public blockchain.
6. Merchant periodically performs self-audits using **QR + photo + GPS**.
7. Trust increases through longevity, clean audits and scan diversity.

### Customer Flow

1. Customer scans the shop QR using QRaksha.
2. QRaksha checks:
   - QR identity
   - Registered location
   - Visual evidence
   - Scan behaviour
3. The system produces:
   - **VERIFIED**
   - **RECENTLY REGISTERED / UNVERIFIED**
   - **WARNING**

The key idea is:

> **UPI tells you who receives the money. QRaksha tells you whether the QR in front of you was supposed to be there.**

---

## 3. Architecture

```text
                    QRaksha
                       │
        ┌──────────────┴──────────────┐
        │                             │
   Merchant PWA                 Customer PWA
        │                             │
        └──────────────┬──────────────┘
                       ↓
              Next.js / React
                       ↓
          Node.js + Express + TS
                       ↓
              Agent Orchestrator
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
 Identity Agent   Context Agent    Vision Agent
       │               │                │
       └───────────────┼────────────────┘
                       ↓
                Misbinding Agent
                       ↓
                  Trust Agent
                       ↓
                 Final Verdict
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
      Supabase/PostgreSQL     Blockchain
             │                   │
         pgvector          Polygon Amoy
             │              / Sepolia
             ↓                   ↓
       Audit + Data          Hash Anchor
```

### Data & Security

- **Supabase PostgreSQL** stores operational data.
- **pgvector** stores image embeddings.
- Sensitive identity information is isolated in a separate schema.
- **RLS** controls database access.
- Raw photos are purged after vector extraction.
- Gemini receives only allow-listed data.
- Blockchain stores only the credential fingerprint/hash, not PII or photos.

The verification architecture uses deterministic checks as hard gates and AI-based signals as supporting evidence. final_qr

---

## 4. How to Run It

### Prerequisites

- Node.js
- npm
- Supabase project
- Required environment variables
- Gemini API credentials
- EVM testnet configuration for blockchain anchoring

### Installation

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_DIRECTORY>

npm install
```

If the project contains separate frontend/backend applications:

```bash
cd apps/web
npm install

cd ../api
npm install
```

### Environment Variables

Create the required `.env` files and configure:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=

JWT_SECRET=

BLOCKCHAIN_RPC_URL=
RELAYER_PRIVATE_KEY=
```

> **Note:** Use the actual variable names from the repository. The uploaded architecture document specifies the technologies and flow but does not provide the repository's exact environment-variable names.

### Start the Application

```bash
npm run dev
```

For separate frontend/backend projects, use the corresponding `npm run dev` command in each application.

---

## 5. How to Run the Demo

### Demo 1 — QR Replacement

1. Register a merchant and their genuine QR.
2. Run a successful audit.
3. Replace the registered QR with a different QR.
4. Scan the new QR using QRaksha.
5. QRaksha compares the scanned payload with the registered QR.
6. The mismatch produces a **WARNING**.

**Expected result:**

```text
Registered QR ≠ Scanned QR
          ↓
      WARNING
```

This is the replacement demo described in the project architecture. final_qr

---

### Demo 2 — QR Relocation

This is the **killer demo**.

1. Register QR-A at Shop A.
2. Run a successful audit.
3. Physically move the genuine QR-A somewhere else.
4. Scan QR-A from the new location.
5. The QR payload is still valid.
6. Context/GPS detects that the QR is outside its registered radius.
7. QRaksha returns **WARNING**.

```text
Genuine QR
     +
Wrong physical location
     ↓
   WARNING
```

This demonstrates something normal UPI verification does not check. final_qr

---

### Blockchain Demo

From the merchant dashboard:

1. Open **Blockchain Anchor Confirmed**.
2. Show the **Polygon Amoy** network.
3. Show the transaction hash.
4. Open the public block explorer.
5. Demonstrate that the credential fingerprint was anchored on-chain.

The blockchain stores the SHA-256 fingerprint of:

```text
credential_id + merchant_id + qr_payload_hash + created_at
```

Only the hash is anchored; the actual application data remains in the database. final_qr

---

## 6. Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js / React** | PWA and user interface |
| **Tailwind CSS** | UI styling |
| **Node.js + Express** | Backend API |
| **TypeScript** | Backend type safety |
| **Supabase PostgreSQL** | Main application database |
| **pgvector** | Image/vector embeddings |
| **Google Gemini 2.0 Flash** | Vision and multimodal analysis |
| **Zod** | Request/data validation |
| **JWT** | Authentication |
| **RLS** | Database access control |
| **Polygon Amoy / Sepolia** | Blockchain testnet |
| **ethers.js** | Blockchain interaction |
| **Public Block Explorer** | Independent blockchain verification |
| **Sentry / JSON Logs** | Monitoring and logging |

The stack and component roles are specified in the project architecture. final_qr

---

## 7. Team Members

- ** VANSH SHUKLA ** — CYBERSECURITY & BLOCKCHAIN
- ** HARSHIL SHARMA **— AGENTIC AI
- ** KUSHAL KUMAR ** — BACKEND
- ** TAJINDER SINGH DURSAL ** — FRONTEND

> Replace the placeholders with your actual team members and roles. The uploaded PDF does not contain the complete team-member list.

---

## Reliability

QRaksha does **not claim 100% fraud prevention**.

Its reliability comes from **layered verification**:

- Identity verification
- QR-to-merchant binding
- Location verification
- Visual evidence
- Scan behaviour
- Trust ramp
- Immutable audit history
- Blockchain-based tamper-evident credential anchoring

Identity and Context are treated as hard gates, while Vision and Attestation provide supporting evidence. If a critical verification service is unavailable, the system fails closed instead of approving the QR. final_qr

> **Deterministic checks are the gate, AI is the evidence, and blockchain is the tamper-evident trust anchor.**
