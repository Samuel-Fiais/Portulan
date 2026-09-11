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
            __html: `(function(){try{var papers={carta:1,pergaminho:1,nevoa:1,costa:1,lacre:1,personalizado:1};var t=localStorage.getItem('portulan-theme')||localStorage.getItem('festpay-docs-theme');if(t&&localStorage.getItem('festpay-docs-theme')){localStorage.setItem('portulan-theme',t);localStorage.removeItem('festpay-docs-theme')}var paper='carta';var ink='#1a2847';var dark=matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||t==='light'){dark=t==='dark'}else if(t){var p=t.split(':');if(papers[p[0]])paper=p[0];if(p[1]==='dark'||p[1]==='light')dark=p[1]==='dark';if(p[2]&&/^#[0-9a-fA-F]{6}$/.test(p[2]))ink=p[2].toLowerCase()}var r=parseInt(ink.slice(1,3),16),g=parseInt(ink.slice(3,5),16),b=parseInt(ink.slice(5,7),16);var fg=(0.2126*r+0.7152*g+0.0722*b)/255>=0.45?'#0a0a0a':'#ffffff';var el=document.documentElement;el.classList.toggle('dark',dark);el.setAttribute('data-theme',paper);el.setAttribute('data-user-ink',ink);el.style.setProperty('--user-ink',ink);el.style.setProperty('--user-ink-fg',fg)}catch(e){}})()`,
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
