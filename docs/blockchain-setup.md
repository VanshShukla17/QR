# Blockchain Credential Anchoring Setup (Polygon Amoy Testnet)

QRaksha provides tamper-evident record-keeping by anchoring credential hashes onto a public blockchain testnet. Whenever a merchant credential is created, activated, or materially updated (e.g., new QR sticker registered, location bound), QRaksha writes the canonical cryptographic hash of that credential into the `data` field of a public EVM transaction.

Anyone—merchants, customers, or auditors—can recompute the credential hash from published registry metadata and independently verify that it matches the on-chain transaction data on PolygonScan.

---

## 1. Network Parameters

QRaksha targets the **Polygon Amoy Testnet** (with fallback support for Ethereum Sepolia).

| Parameter            | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| **Network Name**     | Polygon Amoy Testnet                                                     |
| **Chain ID**         | `80002`                                                                  |
| **Public RPC URL**   | `https://rpc-amoy.polygon.technology`                                    |
| **Alternative RPCs** | Alchemy (`https://polygon-amoy.g.alchemy.com/v2/...`), Infura, QuickNode |
| **Native Currency**  | `POL` (formerly MATIC)                                                   |
| **Block Explorer**   | `https://amoy.polygonscan.com`                                           |

---

## 2. Custodial Signing Wallet Setup

Anchoring is executed server-side by QRaksha's custodial signing wallet so merchants do **not** need crypto wallets, browser extensions, or native gas tokens to participate.

> **Security Rule:** Never commit private keys to version control. Keys must live in environment variables or a cloud secrets manager (Render/AWS SSM/Vault).

### Generating a New Wallet

You can generate a fresh EVM wallet address and private key using `ethers.js`:

```bash
node -e "const { ethers } = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

Sample output:

```text
Address: 0x8a92842C2366113bE11A89b6574f075d52E46244
Private Key: 0x... (64 hex characters)
```

---

## 3. Funding the Wallet via Faucets

Test transactions require tiny fractions of testnet `POL` gas tokens (typically < 0.001 POL per transaction).

1. Visit the **Polygon Faucet**: [https://faucet.polygon.technology/](https://faucet.polygon.technology/)
2. Select **Polygon Amoy**.
3. Enter your generated wallet address.
4. Click **Submit**. You will receive 0.2–0.5 testnet `POL`.
5. Check your balance on [Amoy PolygonScan](https://amoy.polygonscan.com).

_(Alternative faucets: Alchemy Polygon Amoy Faucet, Chainlink Faucets)._

---

## 4. Environment Variables Configuration

In `apps/api/.env` (and in your production host settings, e.g. Render / Railway):

```bash
# Blockchain Anchoring (Polygon Amoy)
CHAIN_RPC_URL="https://rpc-amoy.polygon.technology"
CHAIN_PRIVATE_KEY="0xYOUR_64_HEX_CHAR_PRIVATE_KEY_HERE"
CHAIN_NETWORK="amoy"
```

In development or CI environments where live testnet keys are not configured, QRaksha's `BlockchainAnchorService` gracefully simulates anchoring with realistic mock hashes and explorer URLs, preventing build or test disruptions.

---

## 5. How Credential Anchoring Works

### Canonical Hash Calculation

The credential metadata is deterministically serialized and hashed with Keccak-256 (`ethers.keccak256`):

```typescript
const canonicalData = {
  credentialId,
  merchantId,
  qrPayloadHash,
  boundLocation: { latitude, longitude, boundRadiusM },
  status,
  activatedAt,
};

// Deterministic key sort + Keccak-256
const canonicalString = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());
const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
// Result: 0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

### Zero-Value Data Transaction

No custom smart contracts or gas-heavy storage contracts are required. The server submits a standard EVM transaction with `value = 0` and the 32-byte `credentialHash` passed in the `data` field:

```typescript
const tx = await wallet.sendTransaction({
  to: wallet.address, // Sent to self
  value: 0n,
  data: credentialHash, // 0x... payload embedded directly in transaction input data
});
```

### Public Independent Verification

Anyone can verify the record:

1. Open the transaction on [Amoy PolygonScan](https://amoy.polygonscan.com/tx/<txHash>).
2. Scroll to the **Input Data** section.
3. Compare the hex string with the recomputed Keccak-256 hash of the credential's metadata.
4. If the hashes match, the credential is mathematically guaranteed to have existed in that exact state on or before that block timestamp.

---

## 6. Async Retry Queue Architecture

To ensure network volatility, gas price spikes, or testnet RPC hiccups never block merchant registration or self-audit:

1. Anchoring jobs are enqueued asynchronously.
2. The queue processes attempts using **exponential backoff** across **5 maximum attempts**:
   - Attempt 1: Immediate
   - Attempt 2: +2 seconds
   - Attempt 3: +4 seconds
   - Attempt 4: +8 seconds
   - Attempt 5: +16 seconds
3. Each attempt records `attempts`, `last_error`, and `submitted_at` in `comparison.blockchain_anchor`.
4. If all 5 attempts fail, the anchor status is marked `failed` and logged for administrative investigation without crashing the parent process.
