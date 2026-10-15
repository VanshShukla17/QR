import Link from "next/link";
import { ArrowLeft, Shield } from "@phosphor-icons/react/dist/ssr";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCredentialDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/registry"
          aria-label="Back to registry"
          className="p-2 rounded-lg bg-background border border-border"
        >
          <ArrowLeft className="w-5 h-5 text-text" weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text">Credential Audit Record</h1>
          <p className="text-xs font-mono text-muted">{id}</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" weight="duotone" />
          <h2 className="text-sm font-bold text-text">Metadata & History</h2>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Admin views credential metadata, audit log timestamps, and blockchain anchor
          status. Sensitive identity documents are isolated in the separate identity
          schema.
        </p>
      </div>
    </main>
  );
}
