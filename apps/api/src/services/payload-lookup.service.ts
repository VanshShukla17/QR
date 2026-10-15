import crypto from "crypto";
import { normalizeQrPayload } from "@qraksha/shared";

import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";

export interface RegisteredQrLookupResult {
  id: string; // registered_qr_id
  credentialId: string;
  qrPayloadHash: string;
  boundLat: number;
  boundLng: number;
  boundRadiusM: number;
  referenceEmbedding?: number[];
  merchantId?: string;
  credentialStatus?: string;
  trustTier?: string;
  trustScore?: number;
}

interface CacheEntry {
  result: RegisteredQrLookupResult | null;
  cachedAt: number;
  ttlMs: number;
}

/**
 * PayloadLookupService provides fast QR payload hash lookup
 * with an in-memory read-through cache per ARCHITECTURE.md Section 3 & 5.
 */
export class PayloadLookupService {
  private cache = new Map<string, CacheEntry>();
  private readonly positiveTtlMs: number;
  private readonly negativeTtlMs: number;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = supabaseAdmin,
    positiveTtlMs = 5 * 60 * 1000, // 5 minutes for positive hits
    negativeTtlMs = 15 * 1000 // 15 seconds for negative "not found" cache
  ) {
    this.positiveTtlMs = positiveTtlMs;
    this.negativeTtlMs = negativeTtlMs;
  }

  /**
   * Computes SHA-256 hash of a string payload.
   */
  hashPayload(qrPayload: string): string {
    return crypto.createHash("sha256").update(qrPayload).digest("hex");
  }

  /**
   * Computes canonical normalized hash of a QR payload.
   */
  hashNormalizedPayload(qrPayload: string): string {
    return this.hashPayload(normalizeQrPayload(qrPayload));
  }

  /**
   * Looks up a registered QR record by its raw payload string or precomputed hash.
   * Performs dual-lookup:
   * 1. Normalized hash lookup first
   * 2. Fall back to raw-payload hash (preserves compatibility with legacy rows)
   * Returns null cleanly for unrecognized payloads.
   */
  async lookupByPayload(
    qrPayload: string,
    isAlreadyHashed = false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any
  ): Promise<RegisteredQrLookupResult | null> {
    if (!qrPayload) return null;

    if (isAlreadyHashed) {
      return this.lookupByHash(qrPayload, dbOverride);
    }

    const trimmed = qrPayload.trim();
    const normalized = normalizeQrPayload(trimmed);
    const normalizedHash = this.hashPayload(normalized);
    const rawHash = this.hashPayload(trimmed);

    // 1. Hot-path in-memory cache lookup: normalized first, then raw
    const cachedNormalized = this.getCached(normalizedHash);
    if (cachedNormalized !== undefined) {
      return cachedNormalized;
    }
    if (rawHash !== normalizedHash) {
      const cachedRaw = this.getCached(rawHash);
      if (cachedRaw !== undefined) {
        return cachedRaw;
      }
    }

    // 2. Query database for registered_qr record
    let result: RegisteredQrLookupResult | null = null;
    let dbSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        // Try normalized hash first
        result = await this.queryDatabase(normalizedHash, dbOverride);
        if (!result && rawHash !== normalizedHash) {
          // Fall back to raw payload hash for existing legacy registrations
          result = await this.queryDatabase(rawHash, dbOverride);
        }
        dbSuccess = true;
      } catch (_dbError) {
        // DB error occurred - do NOT cache failures caused by connectivity/query errors!
        result = null;
        dbSuccess = false;
      }
    }

    // 3. Cache result: only cache if DB query succeeded cleanly
    if (dbSuccess) {
      this.setCache(normalizedHash, result);
      if (rawHash !== normalizedHash) {
        this.setCache(rawHash, result);
      }
    }

    return result;
  }

  /**
   * Lookup directly by SHA-256 hash
   */
  async lookupByHash(
    hash: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any
  ): Promise<RegisteredQrLookupResult | null> {
    const cached = this.getCached(hash);
    if (cached !== undefined) {
      return cached;
    }

    let result: RegisteredQrLookupResult | null = null;
    let dbSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        result = await this.queryDatabase(hash, dbOverride);
        dbSuccess = true;
      } catch (_dbError) {
        result = null;
        dbSuccess = false;
      }
    }

    if (dbSuccess) {
      this.setCache(hash, result);
    }

    return result;
  }

  private getCached(hash: string): RegisteredQrLookupResult | null | undefined {
    const entry = this.cache.get(hash);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.cachedAt > entry.ttlMs;
    if (isExpired) {
      this.cache.delete(hash);
      return undefined;
    }

    return entry.result;
  }

  public setCache(hash: string, result: RegisteredQrLookupResult | null): void {
    const ttlMs = result === null ? this.negativeTtlMs : this.positiveTtlMs;
    this.cache.set(hash, {
      result,
      cachedAt: Date.now(),
      ttlMs,
    });
  }

  private async queryDatabase(
    hash: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any
  ): Promise<RegisteredQrLookupResult | null> {
    const dbClient = dbOverride || this.db;
    const { data: qrData, error: qrError } = await dbClient
      .schema("comparison")
      .from("registered_qr")
      .select(
        `
        id,
        credential_id,
        qr_payload_hash,
        bound_lat,
        bound_lng,
        bound_radius_m
      `
      )
      .eq("qr_payload_hash", hash)
      .maybeSingle();

    if (qrError) {
      throw qrError;
    }

    if (!qrData) {
      return null;
    }

    // Fetch associated credential metadata and embedding
    const [credResult, embResult] = await Promise.all([
      dbClient
        .schema("comparison")
        .from("merchant_credential")
        .select("id, merchant_id, status, trust_tier, trust_score")
        .eq("id", qrData.credential_id)
        .maybeSingle(),
      dbClient
        .schema("comparison")
        .from("reference_embedding")
        .select("embedding")
        .eq("registered_qr_id", qrData.id)
        .maybeSingle(),
    ]);

    const credential = credResult.data;
    const embeddingData = embResult.data;

    let referenceEmbedding: number[] | undefined;
    if (embeddingData?.embedding) {
      referenceEmbedding =
        typeof embeddingData.embedding === "string"
          ? JSON.parse(embeddingData.embedding)
          : embeddingData.embedding;
    }

    return {
      id: qrData.id,
      credentialId: qrData.credential_id,
      qrPayloadHash: qrData.qr_payload_hash,
      boundLat: qrData.bound_lat,
      boundLng: qrData.bound_lng,
      boundRadiusM: qrData.bound_radius_m,
      referenceEmbedding,
      merchantId: credential?.merchant_id,
      credentialStatus: credential?.status,
      trustTier: credential?.trust_tier,
      trustScore: credential?.trust_score,
    };
  }

  /**
   * Explicitly sets or primes the cache for a given payload hash.
   */
  primeCache(qrPayloadHash: string, result: RegisteredQrLookupResult): void {
    this.setCache(qrPayloadHash, result);
  }

  /**
   * Invalidates one or all cache entries.
   */
  invalidateCache(qrPayloadHash?: string): void {
    if (qrPayloadHash) {
      this.cache.delete(qrPayloadHash);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Invalidates any cached entries matching a credential ID (e.g. after suspend/revoke).
   */
  invalidateCredential(credentialId: string): void {
    for (const [hash, entry] of this.cache.entries()) {
      if (entry.result?.credentialId === credentialId) {
        this.cache.delete(hash);
      }
    }
  }

  /**
   * Returns current cache size for diagnostics.
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export const payloadLookupService = new PayloadLookupService();
