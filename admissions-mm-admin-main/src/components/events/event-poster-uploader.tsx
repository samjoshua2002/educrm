"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EventPosterUploaderProps {
  posterUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "image" | "pdf" | "other";
  onChange: (data: {
    posterUrl?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: "image" | "pdf" | "other";
  }) => void;
}

export function EventPosterUploader({
  posterUrl,
  attachmentUrl,
  attachmentName,
  attachmentType,
  onChange,
}: EventPosterUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayPreview = localPreview || (!imageError ? posterUrl || (attachmentType === "image" ? attachmentUrl : undefined) : undefined);
  const isPdf = attachmentType === "pdf" || attachmentName?.toLowerCase().endsWith(".pdf") || attachmentUrl?.toLowerCase().includes(".pdf");

  React.useEffect(() => {
    setImageError(false);
  }, [posterUrl, attachmentUrl]);

  async function handleFile(file: File) {
    if (!file) return;

    const isImageFile = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    // Local instant preview via FileReader
    if (isImageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setLocalPreview(reader.result);
          setImageError(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setLocalPreview(null);
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "eventPosters");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }

      // Exact match with applications/new: use data.url
      const finalUrl = data.url as string;
      onChange({
        posterUrl: isImageFile ? finalUrl : undefined,
        attachmentUrl: finalUrl,
        attachmentName: file.name,
        attachmentType: isImageFile ? "image" : isPdfFile ? "pdf" : "other",
      });

      toast.success(`Uploaded ${file.name} to R2 Cloud!`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`Upload failed: ${err.message || "Could not upload file to storage"}`);
    } finally {
      setIsUploading(false);
    }
  }

  function handleClear() {
    setLocalPreview(null);
    setImageError(false);
    onChange({
      posterUrl: "",
      attachmentUrl: "",
      attachmentName: "",
      attachmentType: "other",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={isUploading}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
          e.target.value = "";
        }}
      />

      {Boolean(displayPreview || attachmentUrl || localPreview) ? (
        <div className="flex items-center justify-between p-2.5 rounded-[8px] border border-input bg-muted/20 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {displayPreview ? (
              <a
                href={attachmentUrl || posterUrl || displayPreview}
                target="_blank"
                rel="noreferrer"
                className="relative size-10 rounded-[6px] overflow-hidden border border-border shrink-0 bg-muted/40 hover:opacity-85 transition-opacity"
                title="View full poster"
              >
                <img
                  src={displayPreview}
                  alt=""
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              </a>
            ) : (
              <div className="size-10 rounded-[6px] border border-border shrink-0 bg-muted/40 flex items-center justify-center text-muted-foreground">
                <FileText className="size-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-foreground truncate max-w-[260px] md:max-w-md">
                {attachmentName || "Uploaded_Attachment"}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> R2 Cloud
                </span>
                <span>·</span>
                <span className="uppercase">{isPdf ? "PDF Document" : "Poster Banner"}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Upload className="size-3.5 mr-1 text-primary" />
              )}
              Change
            </Button>

            {Boolean(attachmentUrl || posterUrl) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <a
                  href={attachmentUrl || posterUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open file in new tab"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              title="Remove attachment"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="cursor-pointer border border-dashed border-input hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-[8px] h-[40px] px-3 flex items-center justify-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Uploading to R2 Cloud...</span>
            </>
          ) : (
            <>
              <Upload className="size-4 text-primary" />
              <span>Upload / Attach Poster or Circular PDF (Cloudflare R2)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
