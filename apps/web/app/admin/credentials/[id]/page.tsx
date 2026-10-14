interface AdminCredentialDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminCredentialDetailPage({
  params,
}: AdminCredentialDetailPageProps) {
  const { id } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-2">Credential Details</h1>
      <p className="text-sm text-gray-500 mb-4">Credential ID: {id}</p>
      <p className="text-gray-600 dark:text-gray-400">
        Review audit timeline, registered QRs, and blockchain anchoring records.
      </p>
    </main>
  );
}
