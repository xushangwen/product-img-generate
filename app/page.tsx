"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  Sparkles,
  ImageIcon,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type GenerationState = "idle" | "generating" | "done" | "error";

function resizeImageToBase64(
  file: File,
  maxWidth = 1920,
  quality = 0.88
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("图片处理失败"));
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const base64 = dataUrl.split(",")[1];
            resolve({ base64, mimeType: "image/jpeg" });
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

export default function Home() {
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedMimeType, setGeneratedMimeType] = useState("image/png");
  const [state, setState] = useState<GenerationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传 JPG、PNG 或 WEBP 格式的图片");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalPreview(e.target?.result as string);
      setOriginalFile(file);
      setGeneratedImage(null);
      setError(null);
      setState("idle");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleGenerate = async () => {
    if (!originalFile) return;
    setState("generating");
    setError(null);
    setGeneratedImage(null);

    try {
      const { base64, mimeType } = await resizeImageToBase64(originalFile);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败，请重试");

      setGeneratedImage(`data:${data.mimeType};base64,${data.imageData}`);
      setGeneratedMimeType(data.mimeType);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setState("error");
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const ext = generatedMimeType.split("/")[1] || "png";
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `product-pro-${Date.now()}.${ext}`;
    a.click();
  };

  const handleClear = () => {
    setOriginalPreview(null);
    setOriginalFile(null);
    setGeneratedImage(null);
    setState("idle");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canGenerate = !!originalFile && state !== "generating";

  return (
    <main className="min-h-screen bg-[#0C0C0C] text-white select-none">
      {/* Header */}
      <header className="border-b border-white/[0.05] px-6 md:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm font-semibold tracking-[0.15em] text-white/80 uppercase">
              Product Vision
            </span>
          </div>
          <span className="text-[11px] text-white/20 tracking-wider">
            Powered by Gemini
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white/90 mb-2.5">
            产品图像专业化
          </h1>
          <p className="text-sm text-white/35">
            上传产品实拍图 · AI 生成专业棚拍效果 · 浅灰背景 · 5:3 高清输出
          </p>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_1fr] gap-5 items-start">
          {/* ── Left: Upload ── */}
          <div>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.18em] mb-3">
              原始图片
            </p>
            {!originalPreview ? (
              <div
                className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-white/30 bg-white/[0.04]"
                    : "border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]"
                }`}
                style={{ aspectRatio: "5/3" }}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-11 h-11 rounded-full border border-white/[0.08] flex items-center justify-center">
                    <Upload className="w-4.5 h-4.5 text-white/25" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/45 mb-1">
                      拖放图片或点击上传
                    </p>
                    <p className="text-xs text-white/20">
                      JPG · PNG · WEBP
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFile(e.target.files[0])
                  }
                />
              </div>
            ) : (
              <div
                className="relative rounded-2xl overflow-hidden bg-[#141414]"
                style={{ aspectRatio: "5/3" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreview}
                  alt="原始图片"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            )}
          </div>

          {/* ── Center: Action ── */}
          <div className="flex flex-col items-center justify-center lg:pt-10 gap-3">
            <button
              onClick={
                state === "done" ? () => handleGenerate() : handleGenerate
              }
              disabled={!canGenerate}
              className={`flex flex-col items-center gap-2 w-full lg:w-auto px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200 ${
                !canGenerate
                  ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90 active:scale-95 shadow-xl shadow-white/[0.08] cursor-pointer"
              }`}
            >
              {state === "generating" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">生成中</span>
                </>
              ) : state === "done" ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-xs">重新生成</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">开始生成</span>
                </>
              )}
            </button>
            {state === "generating" && (
              <p className="text-[11px] text-white/25 text-center leading-relaxed">
                约需
                <br />
                30–60 秒
              </p>
            )}
          </div>

          {/* ── Right: Result ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.18em]">
                生成结果
              </p>
              {state === "done" && generatedImage && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/80 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  下载
                </button>
              )}
            </div>

            <div
              className="relative rounded-2xl overflow-hidden bg-[#141414] border border-white/[0.04]"
              style={{ aspectRatio: "5/3" }}
            >
              {state === "idle" && !generatedImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                  <ImageIcon className="w-7 h-7 text-white/[0.08]" />
                  <p className="text-[11px] text-white/20">等待生成</p>
                </div>
              )}

              {state === "generating" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border border-white/[0.08] flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-white/[0.05] animate-ping" />
                  </div>
                  <p className="text-[11px] text-white/25">
                    AI 正在精修图像…
                  </p>
                </div>
              )}

              {state === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                  <AlertCircle className="w-7 h-7 text-red-400/40" />
                  <p className="text-xs text-red-400/60 text-center leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              {generatedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={generatedImage}
                  alt="生成结果"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {state === "done" && generatedImage && (
              <button
                onClick={handleDownload}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] transition-colors text-sm text-white/60 hover:text-white/90"
              >
                <Download className="w-4 h-4" />
                保存图片
              </button>
            )}
          </div>
        </div>

        {/* Footer tips */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-white/15">
          <span>严格保留产品原始细节</span>
          <span>·</span>
          <span>浅灰色专业摄影背景</span>
          <span>·</span>
          <span>5:3 比例高清输出</span>
        </div>
      </div>
    </main>
  );
}
