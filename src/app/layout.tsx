import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in to GitHub · GitHub",
  description: "GitHub login page clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
