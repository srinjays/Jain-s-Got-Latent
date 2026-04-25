import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jain's Got Latent",
  description: "The funniest technical competition Jain University has ever seen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
