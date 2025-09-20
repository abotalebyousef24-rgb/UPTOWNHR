// File: src/app/providers.tsx

"use client";

import React from "react";
import NextAuthProvider from "@/components/providers/NextAuthProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  // We wrap all children with our new NextAuthProvider
  // If you add other providers in the future (like for themes or data fetching),
  // you would add them here as well.
  return <NextAuthProvider>{children}</NextAuthProvider>;
};

export default Providers;