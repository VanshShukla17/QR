export type IdentityTier = "gst_verified" | "baseline";

export type CredentialStatus =
  "pending_activation" | "recently_registered" | "active" | "suspended";

export type TrustTier = "verified" | "unverified" | "warning";

export type AuditVerdict = "VERIFIED" | "RECENTLY_REGISTERED" | "WARNING";

export type VerdictReason =
  "OK" | "UNKNOWN_QR" | "LOCATION_MISMATCH" | "MISBINDING" | "CREDENTIAL_SUSPENDED";

export interface MerchantStatsResult {
  activeQrs: number;
  cleanAudits: number;
  totalAudits: number;
  flaggedAudits: number;
}

export type AnchorStatus = "pending" | "confirmed" | "failed";

export type DisputeStatus = "open" | "resolved_upheld" | "resolved_rejected";

export interface AgentOutput {
  status: "pass" | "warn" | "fail" | "error";
  score?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineAgentOutputs {
  qrDecode?: AgentOutput;
  identity?: AgentOutput & {
    isRegistered?: boolean;
    credentialId?: string;
    merchantId?: string;
  };
  vision?: AgentOutput;
  context?: AgentOutput;
  attestation?: AgentOutput;
  misbinding?: AgentOutput & { isMisbound?: boolean };
  trust?: AgentOutput;
}

export interface RegisterIdentityResult {
  merchantId: string;
  displayName: string;
  identityTier: IdentityTier;
  contactPhone: string;
  kycAddress: string;
  identityId: string;
  otpConfirmed: boolean;
}

export interface RegisterReferenceResult {
  credentialId: string;
  merchantId: string;
  registeredQrId: string;
  status: CredentialStatus;
  trustTier: TrustTier;
  locationVariance: boolean;
  qrPayloadHash: string;
  boundLocation: {
    latitude: number;
    longitude: number;
    boundRadiusM: number;
  };
  embeddingDimension: number;
}

export interface ProofOfPossessionResult {
  credentialId: string;
  status: CredentialStatus;
  verifiedAt: string;
  amountInr: number;
  simulationPassed: boolean;
  message: string;
}

export interface BlockchainAnchor {
  id: string;
  credentialId: string;
  txHash: string | null;
  network: string;
  status: AnchorStatus;
  credentialHash: string;
  attempts: number;
  lastError?: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  explorerUrl?: string | null;
}

export interface VerifyCredentialResult {
  credentialId: string;
  merchantId: string;
  displayName: string;
  status: CredentialStatus;
  trustTier: TrustTier;
  trustScore: number;
  activatedAt: string | null;
  boundLocation?: {
    latitude: number;
    longitude: number;
    boundRadiusM: number;
  };
  canonicalCredentialHash: string;
  anchor: BlockchainAnchor | null;
  verifiedOnChain: boolean;
}

export interface Dispute {
  id: string;
  credentialId: string;
  filedByMerchantId?: string | null;
  status: DisputeStatus;
  evidenceSummary: string;
  resolvedByAdminId?: string | null;
  resolutionReason?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface FileDisputeResult {
  dispute: Dispute;
  targetCredentialId: string;
  previousTrustTier: TrustTier;
  newTrustTier: TrustTier;
  message: string;
}

export interface AdminDisputeItem extends Dispute {
  targetMerchantName?: string;
  targetMerchantPhone?: string;
  targetTrustTier?: TrustTier;
  targetStatus?: CredentialStatus;
  filerMerchantName?: string;
}

export interface ResolveDisputeResult {
  dispute: Dispute;
  targetCredentialId: string;
  newTrustTier: TrustTier;
  newStatus: CredentialStatus;
  message: string;
}

export interface AdminCredentialItem {
  id: string;
  merchantId: string;
  merchantName: string;
  contactPhone?: string;
  identityTier?: IdentityTier;
  status: CredentialStatus;
  trustTier: TrustTier;
  trustScore: number;
  qrCount: number;
  activatedAt: string | null;
  createdAt: string;
  latestAnchorStatus?: AnchorStatus | null;
  latestAnchorTxHash?: string | null;
}

export interface AdminCredentialsListResult {
  credentials: AdminCredentialItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDisputesListResult {
  disputes: AdminDisputeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SeedRegistryResult {
  message: string;
  seededCount: number;
  merchants: Array<{
    name: string;
    credentialId: string;
    trustTier: TrustTier;
    status: CredentialStatus;
  }>;
}
