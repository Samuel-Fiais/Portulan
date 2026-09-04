"use client";

import { useRef, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { ImageUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { uploadBlobImage } from "@/lib/blob-client";
import type { BlobUploadPurpose } from "@/lib/blob-storage";
import { validateBlobImage } from "@/lib/blob-storage";
import { cn } from "@/lib/utils";

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export function BlobImageUpload({
  purpose,
  documentId,
  templateId,
  onUploaded,
  disabled = false,
  label = "Enviar imagem",
  size = "default",
  className,
}: {
  purpose: Extract<BlobUploadPurpose, "template-logo" | "report-image">;
  documentId?: string;
  templateId?: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const validation = validateBlobImage(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadBlobImage({ file, purpose, documentId, templateId });
      onUploaded(url);
      toast.success("Imagem enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
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
        {uploading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
        {label}
      </Button>
    </>
  );
}
