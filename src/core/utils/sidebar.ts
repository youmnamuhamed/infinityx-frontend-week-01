// src/core/utils/sidebar.ts
"use server";

import { cookies } from "next/headers";
import {
  LayoutGrid,
  Rocket,
  BarChart2,
  GitBranch,
  Users,
  ShieldCheck,
  Puzzle,
  Settings,
} from "lucide-react";

const SIDEBAR_COOKIE_KEY = "ix-sidebar-state";

export async function setSidebarState(state: "collapsed" | "expanded") {
  const cookieStore = await cookies();
  cookieStore.set(SIDEBAR_COOKIE_KEY, state, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}

