import React from "react";
import { LoginButton } from "../modules/auth/LoginButton";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header style={{ height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <div style={{ fontWeight: 700 }}>宠物投毒地图</div>
        <LoginButton />
      </header>
      {children}
    </div>
  );
}
