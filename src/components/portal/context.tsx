"use client";

import { createContext, useContext } from "react";
import type { FailureMode } from "@/lib/twin";

export type Horizon = "2026" | "2126";

import type { Tab } from "./tabs";
export type { Tab } from "./tabs";

export interface PortalCtx {
  horizon: Horizon;
  setHorizon: (h: Horizon) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;
  simulate: (nodeId: string, mode?: FailureMode) => void;
  sim: { nodeId: string; mode: FailureMode } | null;
}

export const PortalContext = createContext<PortalCtx | null>(null);

export function usePortal(): PortalCtx {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal în afara PortalApp");
  return ctx;
}
