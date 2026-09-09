import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { PortulanToaster } from "@/components/portulan-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Portulan", template: "%s · Portulan" },
  description: "Workspace para documentos e relatórios técnicos navegáveis.",
  icons: {
    icon: "/portulan-mark.png",
    apple: "/portulan-mark.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      style={{
        "--font-ibm-plex-sans": ibmPlexSans.style.fontFamily,
        "--font-jetbrains-mono": jetbrainsMono.style.fontFamily,
      } as CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('portulan-theme')||localStorage.getItem('festpay-docs-theme');if(t&&localStorage.getItem('festpay-docs-theme')){localStorage.setItem('portulan-theme',t);localStorage.removeItem('festpay-docs-theme')}var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AuthSessionProvider session={session}>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthSessionProvider>
        <PortulanToaster />
      </body>
    </html>
  );
}
