import type { Metadata } from "next";
import { PortulanToaster } from "@/components/portulan-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portulan", template: "%s · Portulan" },
  description: "Workspace para documentos e relatórios técnicos navegáveis.",
  icons: {
    icon: "/portulan-logo.png",
    apple: "/portulan-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('portulan-theme')||localStorage.getItem('festpay-docs-theme');if(t&&localStorage.getItem('festpay-docs-theme')){localStorage.setItem('portulan-theme',t);localStorage.removeItem('festpay-docs-theme')}var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <PortulanToaster />
      </body>
    </html>
  );
}
