import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}): Promise<Metadata> {
  const { credentialId } = await params;
  return {
    title: `Verify Merchant Credential ${credentialId} — QRaksha`,
    description: `Public tamper-evident verification for merchant credential ${credentialId} anchored on Polygon Amoy.`,
    openGraph: {
      title: `QRaksha Credential Verification — ${credentialId}`,
      description: `Verify physical UPI QR sticker authenticity and blockchain proof for credential ${credentialId}.`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `QRaksha Credential Verification — ${credentialId}`,
      description: `Public verification of physical UPI QR sticker authenticity for credential ${credentialId}.`,
    },
    robots: {
      index: true,
      follow: false,
    },
  };
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
