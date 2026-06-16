import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CloudGuard - CSPM",
  description: "Production-grade AWS Cloud Security Posture Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", inter.variable, jetbrains.variable, "font-sans")}>
      <body className="font-sans antialiased text-foreground flex h-screen overflow-hidden bg-background">
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background relative">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
