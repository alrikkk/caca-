"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Camera, RefreshCw, AlertCircle, X, Check } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignored
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start device camera
  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setCapturedPreview(null);
    setCapturedBlob(null);

    // Verify browser mediaDevices support
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setError("Camera access is not supported on this browser. Please upload a photo instead.");
      setIsLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsLoading(false);
    } catch (err: any) {
      console.warn("Camera getUserMedia error:", err);
      stopCamera();
      setError("Camera access was unavailable. You can upload a photo instead.");
      setIsLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Use square aspect ratio centered
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const startX = ((video.videoWidth || 480) - size) / 2;
    const startY = ((video.videoHeight || 480) - size) / 2;

    canvas.width = size;
    canvas.height = size;

    // Draw frame (mirror horizontal for natural selfie feel)
    context.save();
    context.scale(-1, 1);
    context.drawImage(
      video,
      startX,
      startY,
      size,
      size,
      -size,
      0,
      size,
      size
    );
    context.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const previewUrl = URL.createObjectURL(blob);
          setCapturedPreview(previewUrl);
          stopCamera();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
      setCapturedBlob(null);
    }
    startCamera();
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera_avatar_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopCamera();
    onCapture(file);
    onClose();
  };

  const handleClose = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    stopCamera();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="TAKE PROFILE PHOTO"
      className="max-w-md"
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Viewfinder Frame */}
        <div className="relative aspect-square w-full bg-ink border-hard overflow-hidden flex items-center justify-center">
          {/* Live Video */}
          {!capturedPreview && (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          )}

          {/* Captured Snapshot Preview */}
          {capturedPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedPreview}
              alt="Captured avatar"
              className="w-full h-full object-cover"
            />
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading Indicator */}
          {isLoading && !error && !capturedPreview && (
            <div className="absolute inset-0 bg-ink/80 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
              <Camera className="w-8 h-8 animate-pulse text-caca-lime" />
              <p className="text-xs uppercase font-bold">STARTING CAMERA...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-white p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <p className="text-xs font-bold text-ink uppercase leading-relaxed">
                {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="text-xs mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>TRY AGAIN</span>
              </Button>
            </div>
          )}

          {/* Viewfinder Target Guidelines */}
          {!capturedPreview && !error && !isLoading && (
            <div className="absolute inset-4 border border-dashed border-white/40 pointer-events-none rounded-full" />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {!capturedPreview ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleClose}
                className="flex-1 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span>CANCEL</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleTakeSnapshot}
                disabled={isLoading || Boolean(error)}
                className="flex-1 text-xs bg-caca-lime hover:bg-caca-lime/90 text-ink"
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                <span>TAKE PHOTO</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleRetake}
                className="flex-1 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>RETAKE</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmPhoto}
                className="flex-1 text-xs bg-caca-lime hover:bg-caca-lime/90 text-ink"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                <span>USE THIS PHOTO</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
