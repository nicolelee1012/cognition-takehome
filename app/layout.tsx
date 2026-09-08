import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/client/session";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Internal Operations Console",
  description: "Prototype internal tools console for KYC reviews and refunds",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
