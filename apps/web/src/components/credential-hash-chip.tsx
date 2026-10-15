"use client";

import React, { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

export function CredentialHashChip({
  hash = "0x9f3ac7b4e8832a10d9f0012c8b8712e5699c21e",
  batch = "Batch Anchor #19042",
}: {
  hash?: string;
  batch?: string;
}) {
  const [copiedHash, setCopiedHash] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="p-4 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-medium text-ink">
          ANCHOR CREDENTIAL HASH:
        </span>
        <button
          onClick={copyHash}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#FFEDE6] border border-[rgba(26,13,9,0.2)] text-xs font-mono text-brand-deep hover:bg-white transition-colors cursor-pointer"
          title="Click to copy credential hash"
        >
          <span>{hash}</span>
          {copiedHash ? (
            <Check className="w-3.5 h-3.5 text-ok" weight="bold" />
          ) : (
            <Copy className="w-3.5 h-3.5" weight="bold" />
          )}
        </button>
      </div>
      <div className="text-[11px] font-mono text-[#5E4036] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-ok" />
        <span>Polygon Amoy Verified • {batch}</span>
      </div>
    </div>
  );
}
