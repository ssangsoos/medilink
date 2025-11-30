// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // 👈 🚨 [핵심] 이 줄이 있어야 디자인이 적용됩니다!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "메디링크",
  description: "의료 전문가와 병원을 연결하는 실시간 매칭 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}