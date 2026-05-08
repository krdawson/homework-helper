
import React, { useRef, useEffect, useState } from 'react';
import { resizeImage } from '../utils/imageProcessing';

interface CameraViewProps {
  onCapture: (base64Data: string) => void;
  onCancel: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const track = mediaStream.getVideoTracks()[0];
        // Check if torch is supported
        // Note: some browsers require a delay or certain conditions to read capabilities
        setTimeout(() => {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        }, 500);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please ensure you have granted permission.");
        onCancel();
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleFlash = async () => {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    try {
      const newFlashState = !flashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setFlashOn(newFlashState);
    } catch (err) {
      console.error("Error toggling flash:", err);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    
    try {
      const { base64 } = await resizeImage(videoRef.current);
      onCapture(base64);
      
      // Ensure we stop the stream after capture
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error("Error capturing photo:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="h-full w-full object-cover"
        />
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <button 
            onClick={onCancel}
            className="p-2 rounded-full bg-white/20 text-white backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {hasTorch && (
            <button 
              onClick={toggleFlash}
              className={`p-3 rounded-full backdrop-blur-md transition-colors ${
                flashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={flashOn ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          )}
        </div>

        {/* Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[85%] h-[60%] border-2 border-white/30 rounded-3xl border-dashed"></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-8 flex justify-center items-center gap-12">
        <div className="w-12 h-12"></div> {/* Spacer */}
        <button 
          onClick={capturePhoto}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform"
        >
          <div className="w-full h-full bg-white rounded-full"></div>
        </button>
        <div className="w-12 h-12 flex items-center justify-center">
           {/* Placeholder for future gallery access if needed */}
        </div>
      </div>
    </div>
  );
};

export default CameraView;
