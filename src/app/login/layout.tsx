import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "TIGIP — Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[var(--section)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
