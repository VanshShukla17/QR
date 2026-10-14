interface VerifyPageProps {
  params: Promise<{
    credentialId: string;
  }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { credentialId } = await params;

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-2">Public Credential Verification</h1>
      <p className="text-sm text-gray-500 mb-4">Credential ID: {credentialId}</p>
      <p className="text-gray-600 dark:text-gray-400">
        Review public audit records and blockchain testnet anchor details.
      </p>
    </main>
  );
}
