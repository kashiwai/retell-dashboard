import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { getTenantConfig } from "@/config/tenant.config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// テナント設定を取得
const tenant = getTenantConfig();

export const metadata: Metadata = {
  title: `${tenant.name} - ダッシュボード`,
  description: `${tenant.name}の通話管理システム`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --tenant-primary: ${tenant.primaryColor};
              --tenant-secondary: ${tenant.secondaryColor || '#f0f0f0'};
            }
            .tenant-primary-bg {
              background-color: var(--tenant-primary) !important;
            }
            .tenant-primary-text {
              color: var(--tenant-primary) !important;
            }
            .tenant-secondary-bg {
              background-color: var(--tenant-secondary) !important;
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
