"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Keyboard, Upload as UploadIcon, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent, Input } from "@/shared/ui";
import {
  validateOnboardingFile,
  type OnboardingAllowedFileType,
} from "@/modules/people/onboarding/constants/allowed-file-types";

/** The three ways a signatory can provide a signature. */
type SignatureMode = "draw" | "type" | "upload";

/** Signature images may only be JPEG/PNG (no PDF), per the clearance spec. */
const SIGNATURE_FILE_TYPES: OnboardingAllowedFileType[] = ["jpg", "jpeg", "png"];

/** Canvas dimensions for the drawn/typed signature, and the cap for uploaded images. */
const SIGNATURE_WIDTH = 600;
const SIGNATURE_HEIGHT = 150;
const UPLOAD_MAX_DIM = 600;

const INK_COLOR = "#101828";
const BACKGROUND_COLOR = "#ffffff";

/**
 * Lets a signatory provide a signature by drawing on a canvas, typing their name, or
 * uploading a JPEG/PNG image. Reports the signature as a **white-background PNG data URL**
 * through `onChange` (or `null` when absent), ready to persist with the signed clearance.
 * Every mode flattens onto a white background so the stored image renders consistently.
 */
export function SignatureCapture({ onChange }: { onChange: (value: string | null) => void }) {
  const [mode, setMode] = useState<SignatureMode>("draw");

  // ── Draw ──────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  // ── Type ──────────────────────────────────────────────────────────────────
  const [typed, setTyped] = useState("");

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Size the canvas backing store to its rendered box and paint it white so exported
  // strokes sit on a white background. Runs whenever the Draw tab (re)mounts its content.
  useEffect(() => {
    if (mode !== "draw") return;
    prepareCanvas();
  }, [mode]);

  /** Switches input mode, discarding any signature captured in the previous mode. */
  function switchMode(next: SignatureMode) {
    resetCurrent();
    setMode(next);
  }

  /** Clears whatever signature the active mode holds and reports "no signature". */
  function resetCurrent() {
    if (mode === "draw") prepareCanvas();
    if (mode === "type") setTyped("");
    if (mode === "upload") clearUpload();
    onChange(null);
  }

  // ── Draw handlers ───────────────────────────────────────────────────────────

  /** Resizes the canvas to its rendered box and fills it white (also clears strokes). */
  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth || SIGNATURE_WIDTH;
    canvas.height = canvas.clientHeight || SIGNATURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    hasDrawnRef.current = false;
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasDrawnRef.current) onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  // ── Type handlers ────────────────────────────────────────────────────────────

  function handleTyped(value: string) {
    setTyped(value);
    onChange(value.trim() ? typedSignatureToDataUrl(value.trim()) : null);
  }

  // ── Upload handlers ──────────────────────────────────────────────────────────

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const error = await validateOnboardingFile(file, SIGNATURE_FILE_TYPES);
    if (error) {
      clearUpload();
      setUploadError(error);
      onChange(null);
      return;
    }
    try {
      const dataUrl = await imageFileToWhitePng(file);
      setUploadError(null);
      setUploadName(file.name);
      setUploadPreview(dataUrl);
      onChange(dataUrl);
    } catch {
      clearUpload();
      setUploadError("Could not read the image.");
      onChange(null);
    }
  }

  function clearUpload() {
    setUploadPreview(null);
    setUploadName(null);
    setUploadError(null);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-[color:var(--text-primary)]">Add Signature</p>
      <Tabs value={mode} onValueChange={(v) => switchMode(v as SignatureMode)}>
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="draw" className="gap-1.5">
            <Pencil size={14} aria-hidden="true" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-1.5">
            <Keyboard size={14} aria-hidden="true" />
            Type
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5">
            <UploadIcon size={14} aria-hidden="true" />
            Upload
          </TabsTrigger>
        </TabsList>

        <div className="relative mt-2 rounded-lg border border-[color:var(--border-primary)] bg-white">
          <button
            type="button"
            onClick={resetCurrent}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-blue)] hover:underline"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset
          </button>

          <TabsContent value="draw" className="mt-0">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="block h-[150px] w-full touch-none rounded-lg"
              aria-label="Draw your signature"
            />
          </TabsContent>

          <TabsContent value="type" className="mt-0">
            <div className="flex h-[150px] flex-col justify-center gap-3 px-4 pt-8">
              <Input
                value={typed}
                onChange={(e) => handleTyped(e.target.value)}
                placeholder="Type your full name"
                maxLength={100}
                aria-label="Type your signature"
              />
              {typed.trim() ? (
                <p
                  className="truncate text-2xl text-[color:var(--text-primary)]"
                  style={{ fontFamily: "'Brush Script MT', cursive" }}
                >
                  {typed.trim()}
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="flex h-[150px] flex-col items-center justify-center gap-2 px-4 pt-8">
              {uploadPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt={uploadName ?? "Signature preview"}
                    className="max-h-[90px] max-w-full object-contain"
                  />
                  <p className="max-w-full truncate text-xs text-[color:var(--text-tertiary)]">
                    {uploadName}
                  </p>
                </>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1.5 text-center">
                  <UploadIcon
                    size={22}
                    className="text-[color:var(--text-tertiary)]"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-[color:var(--text-secondary)]">
                    Upload signature image
                  </span>
                  <span className="text-xs text-[color:var(--text-tertiary)]">JPEG or PNG</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                </label>
              )}
              {uploadError ? (
                <p className="text-xs text-[color:var(--color-error-500)]">{uploadError}</p>
              ) : null}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/** Renders typed text as a cursive signature on a white background and returns a PNG data URL. */
function typedSignatureToDataUrl(text: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIGNATURE_WIDTH;
  canvas.height = SIGNATURE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = INK_COLOR;
  ctx.font = "48px 'Brush Script MT', cursive";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, canvas.height / 2, canvas.width - 40);
  return canvas.toDataURL("image/png");
}

/**
 * Loads an uploaded image, flattens it onto a white background (downscaled to fit
 * `UPLOAD_MAX_DIM`), and returns a PNG data URL so the stored signature is normalized
 * and small enough for the server's data-URL size limit.
 */
function imageFileToWhitePng(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, UPLOAD_MAX_DIM / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };
    img.src = objectUrl;
  });
}
