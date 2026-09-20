import { demoMode } from "../services/demo";
import { useEffect, useRef, useState } from "react";
import { call, errorMessage } from "../services/api";
export function CameraUpload({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function choose(next: File) {
    setError("");
    setSaved(false);
    if (!["image/jpeg", "image/png", "application/pdf"].includes(next.type)) {
      setError("Choose a JPG, PNG or PDF.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("The file must be smaller than 10 MB.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    stop();
  }
  async function openCamera() {
    setError("");
    try {
      stop();
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCamera(true);
    } catch {
      setError(
        "Camera access is unavailable or was denied. Allow camera access in your browser, or choose a file.",
      );
    }
  }
  useEffect(() => {
    if (camera && video.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() =>
          setError("Camera could not start. Choose a file instead."),
        );
    }
  }, [camera]);
  function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob)
          choose(new File([blob], "certificate.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url, key } = await call<{ url: string; key: string }>(
        "prepareCertificate",
        { type: file.type, size: file.size },
      );
      const result = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed. Please retry.");
      await call("submitCertificate", { key });
      await onSaved();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="upload-panel">
      <h2>Your registration document</h2>
      <p>Take a clear photo or upload a document for review.</p>
      {demoMode && <p>Use fictional documents only. <a href="/demo-certificate.pdf" download>Download a sample certificate</a> to try the upload.</p>}
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) choose(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <div className="action-row">
        <button
          type="button"
          className="button ghost"
          disabled={busy}
          onClick={() => void openCamera()}
        >
          Take a photo
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          Choose file
        </button>
      </div>
      {camera && (
        <div className="camera-preview">
          <video ref={video} autoPlay muted playsInline />
          <div className="action-row">
            <button type="button" className="button primary" onClick={capture}>
              Capture photo
            </button>
            <button type="button" className="button ghost" onClick={stop}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {file && !camera && (
        <div className="file-preview">
          {file.type.startsWith("image/") && (
            <img src={preview} alt="Captured registration document" />
          )}
          <p>
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <div className="action-row">
            <button
              type="button"
              className="button primary"
              disabled={busy || saved}
              onClick={() => void upload()}
            >
              {saved
                ? "Saved for review"
                : busy
                  ? "Uploading…"
                  : demoMode ? "Start demo verification" : "Submit for verification"}
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setSaved(false);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p className="microcopy">
        JPG, PNG or PDF · up to 10 MB. {demoMode ? "Demo only: saving completes simulated verification." : "Uploading does not automatically verify your credentials."}
      </p>
    </section>
  );
}
