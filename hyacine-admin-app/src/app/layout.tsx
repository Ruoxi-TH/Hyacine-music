import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "风堇音乐管理后台",
  description: "Hyacine Music Admin Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}