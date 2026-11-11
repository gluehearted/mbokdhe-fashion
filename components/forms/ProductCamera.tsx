"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface ProductCameraHandle { close: () => void }
interface Props {
  disabled: boolean;
  hasPhoto: boolean;
  onCapture: (file: File) => Promise<void>;
  onError: (message: string | null) => void;
}
type Facing = "user" | "environment";

// Device hints choose the initial camera. Actual authorized devices determine switching support.
function isHandheld() {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return nav.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

export default forwardRef<ProductCameraHandle, Props>(function ProductCamera({ disabled, hasPhoto, onCapture, onError }, ref) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);
  const [canSwitch, setCanSwitch] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const captureLock = useRef(false);

  const stopTracks = () => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  };
  const close = () => {
    generation.current++;
    stopTracks();
    setOpen(false); setOpening(false); setReady(false);
  };
  useImperativeHandle(ref, () => ({ close }));

  useEffect(() => {
    alive.current = true;
    const requestGeneration = generation;
    const leave = () => { generation.current++; stopTracks(); setOpen(false); setOpening(false); setReady(false); };
    window.addEventListener("pagehide", leave);
    return () => {
      alive.current = false; requestGeneration.current++; stopTracks();
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  const start = async (requested?: Facing) => {
    if (disabled || captureLock.current) return;
    const ticket = ++generation.current;
    stopTracks();
    const handheld = isHandheld();
    const nextFacing = requested ?? (handheld ? "environment" : "user");
    setOpen(true); setOpening(true); setReady(false); setCanSwitch(false); onError(null);
    let acquired: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Kamera web memerlukan HTTPS dan browser yang mendukung kamera. Gunakan Galeri jika tidak tersedia.");
      }
      acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, ...(handheld ? { facingMode: { ideal: nextFacing } } : {}) },
      });
      if (!alive.current || ticket !== generation.current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const actual = acquired.getVideoTracks()[0]?.getSettings().facingMode;
      setFacing(actual === "user" || actual === "environment" ? actual : nextFacing);
      // Some browsers hide non-active cameras; enumeration is a hint, never persisted or logged.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (ticket !== generation.current || !alive.current) return;
        setCanSwitch(handheld && devices.filter(device => device.kind === "videoinput").length > 1);
      } catch { /* Preview still works if enumeration is unavailable. */ }
      if (ticket !== generation.current || !alive.current) return;
      if (video.current) {
        video.current.srcObject = acquired;
        await video.current.play();
      }
    } catch (error) {
      acquired?.getTracks().forEach(track => track.stop());
      if (ticket !== generation.current || !alive.current) return;
      stopTracks(); setOpen(false);
      const name = error instanceof Error ? error.name : "";
      onError(name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera melalui pengaturan browser atau pilih Galeri."
        : name === "NotFoundError" ? "Kamera tidak ditemukan. Pilih foto melalui Galeri."
        : name === "NotReadableError" ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
        : error instanceof Error && error.message.startsWith("Kamera web") ? error.message
        : "Kamera gagal dibuka. Coba kembali atau pilih Galeri.");
    } finally {
      if (alive.current && ticket === generation.current) setOpening(false);
    }
  };

  const capture = async () => {
    const element = video.current;
    if (disabled || opening || !ready || captureLock.current || !element?.videoWidth) return;
    captureLock.current = true;
    const ticket = generation.current;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth; canvas.height = element.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(element, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!alive.current || ticket !== generation.current) return;
      if (!blob) throw new Error();
      close();
      await onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
    } catch {
      if (alive.current && ticket === generation.current) onError("Foto belum berhasil diambil. Tunggu preview siap lalu coba lagi.");
    } finally { captureLock.current = false; }
  };

  return <>
    <button type="button" disabled={disabled} onClick={() => open ? close() : void start()} className="py-2 px-2 border border-slate-300 dark:border-slate-700 rounded font-bold uppercase disabled:opacity-50">
      {open ? "Tutup Kamera" : hasPhoto ? "Ambil Ulang Foto" : "Buka Kamera"}
    </button>
    {open && <div className="col-span-2 order-last space-y-2 border rounded p-2" aria-label="Kamera produk">
      <video ref={video} autoPlay muted playsInline onCanPlay={() => setReady(true)} className="w-full max-h-72 bg-black rounded object-contain" />
      <p role="status">{opening ? "Membuka kamera…" : canSwitch ? `Kamera ${facing === "environment" ? "belakang" : "depan"}` : "Kamera perangkat"}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || opening || !ready} onClick={() => void capture()} className="border rounded px-3 py-2 disabled:opacity-50">Jepret Foto</button>
        {canSwitch && <button type="button" disabled={disabled || opening} onClick={() => void start(facing === "environment" ? "user" : "environment")} className="border rounded px-3 py-2">Ganti Kamera</button>}
        <button type="button" onClick={close} className="border rounded px-3 py-2">Batal Kamera</button>
      </div>
    </div>}
  </>;
});
