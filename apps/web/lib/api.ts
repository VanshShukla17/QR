import type {
  ApiErrorEnvelope,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
} from "@qraksha/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  disputeUrl?: string;

  constructor(envelope: ApiErrorEnvelope["error"]) {
    super(envelope.message || envelope.code);
    this.name = "ApiError";
    this.code = envelope.code;
    this.details = envelope.details;
    this.disputeUrl = envelope.disputeUrl;
  }
}

export async function registerIdentity(
  payload: RegisterIdentityRequest
): Promise<RegisterIdentityResponse["data"]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/merchants/register/identity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok) {
    if (body?.error) {
      throw new ApiError(body.error);
    }
    throw new Error(`Request failed with status ${res.status}`);
  }

  return body.data;
}
