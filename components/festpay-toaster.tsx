"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function FestpayToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      theme={theme}
      richColors
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "festpay-toast",
          title: "festpay-toast-title",
          description: "festpay-toast-description",
        },
      }}
    />
  );
}
