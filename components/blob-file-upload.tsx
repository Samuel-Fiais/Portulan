"use client";

import { useRef, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { FileUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { uploadBlobFile } from "@/lib/blob-client";
import { validateBlobFile } from "@/lib/blob-storage";
import { cn } from "@/lib/utils";

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export function BlobFileUpload({
  documentId,
  onUploaded,
  disabled = false,
  label = "Enviar arquivo",
  size = "default",
  className,
}: {
  documentId: string;
  onUploaded: (payload: { url: string; name: string }) => void;
  disabled?: boolean;
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const validation = validateBlobFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadBlobFile({ file, documentId });
      onUploaded({ url, name: file.name });
      toast.success("Arquivo enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn("shrink-0", className)}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <LoaderCircle className="animate-spin" /> : <FileUp />}
        {label}
      </Button>
    </>
  );
}
