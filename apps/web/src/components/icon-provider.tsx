"use client";

import { IconContext } from "@phosphor-icons/react";

// Phosphor's context API is client-only, so the app-wide icon default lives in this small
// client boundary. Bold is the default (buttons/nav); feature/section icons opt into
// weight="duotone" explicitly. Server components import from "@phosphor-icons/react/dist/ssr"
// and must pass `weight` themselves because they can't read this context.
const ICON_DEFAULTS = { weight: "bold", mirrored: false } as const;

export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={ICON_DEFAULTS}>{children}</IconContext.Provider>;
}
