import React, { useState, useRef, useEffect } from 'react';
import { MapPin, X, Check, AlertTriangle, RefreshCw, Navigation, Building2, Coffee, Play } from 'lucide-react';
import { LocationData, ActionType } from '../types';

interface ActionFlowProps {
  type: ActionType;
  targetLocation: { latitude: number; longitude: number; name: string };
  onComplete: (photo: string, location: LocationData, analysis: string, distance: number) => void;
  onCancel: () => void;
}

enum Step {
  INIT_LOCATION = 0,
  CAMERA = 1,
  CONFIRM = 2,
}

// Haversine formula to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

export const ActionFlow: React.FC<ActionFlowProps> = ({ type, targetLocation, onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>(Step.INIT_LOCATION);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // 1. Watch Location for accuracy and distance
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Teie seade ei toeta geolokatsiooni. Tööaja arvestamine pole võimalik.");
      return;
    }

    const geoOptions = { 
      enableHighAccuracy: true, 
      timeout: 20000, 
      maximumAge: 0 
    };

    // Use watchPosition to track improvements in accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocation(newLocation);

        // Calculate distance from site center
        const dist = calculateDistance(
          newLocation.latitude, 
          newLocation.longitude, 
          targetLocation.latitude, 
          targetLocation.longitude
        );
        setDistance(dist);

        // Auto-advance if accuracy is good enough (<= 100m) and we are in the location step
        if (position.coords.accuracy <= 100 && step === Step.INIT_LOCATION) {
           setStep(Step.CAMERA);
        }
      },
      (err) => {
        console.error("GPS Error:", err);
        if (err.code === 1) { // PERMISSION_DENIED
          setError("Keelasite asukoha tuvastamise. Tööaja alustamiseks/lõpetamiseks on GPS andmed kohustuslikud.");
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          // Don't error immediately on unavailable, keep trying via watch
        } 
      },
      geoOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [step, targetLocation]);

  // 2. Initialize Camera ONLY when step advances
  useEffect(() => {
    if (step === Step.CAMERA && !photo) {
      startCamera();
    }
    return () => stopCamera();
  }, [step, photo]);

  const startCamera = async () => {
    try {
      // Force environment (rear) camera if available
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         setError("Keelasite kaamera kasutamise. Tööaja fikseerimiseks on kohustuslik teha reaalajas pilt objektist.");
      } else {
         setError("Kaamera käivitamine ebaõnnestus. Palun veenduge, et kaameral on load antud.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhoto(dataUrl);
        stopCamera();
        setStep(Step.CONFIRM);
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setStep(Step.CAMERA);
  };

  const handleSubmit = () => {
    if (photo && location && distance !== null) {
      // Pass a static string or basic verification text instead of AI analysis
      onComplete(photo, location, "Foto ja GPS koordinaadid fikseeritud", distance);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'START': return 'Töö alustamine';
      case 'STOP': return 'Töö lõpetamine';
      case 'PAUSE': return 'Pausi alustamine';
      case 'RESUME': return 'Töö jätkamine';
      default: return 'Tegevus';
    }
  };

  // RENDER HELPERS

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-white text-center backdrop-blur-sm">
        <div className="bg-red-500/10 p-4 rounded-full mb-6 border border-red-500/20">
           <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Toiming peatatud</h2>
        <p className="mb-8 text-slate-300 max-w-xs mx-auto leading-relaxed">{error}</p>
        <button 
          onClick={onCancel}
          className="w-full max-w-xs bg-slate-700 hover:bg-slate-600 active:bg-slate-800 py-4 rounded-xl font-bold transition-all"
        >
          Sulge ja tühista
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-white font-semibold shadow-sm drop-shadow-md">
            {getTitle()}
          </h2>
          <p className="text-xs text-slate-300 flex items-center gap-1">
             <Building2 className="w-3 h-3" />
             {targetLocation.name}
          </p>
        </div>
        <button onClick={onCancel} className="bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-md text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
        {/* Step 0: Location Wait Screen */}
        {step === Step.INIT_LOCATION && (
          <div className="text-white flex flex-col items-center px-6 text-center w-full max-w-sm">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
               <div className="relative w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                  <Navigation className={`w-10 h-10 ${location ? 'text-blue-400' : 'text-slate-500'}`} />
               </div>
            </div>
            
            <h3 className="text-xl font-bold mb-6">Tuvastan asukohta...</h3>
            
            {location ? (
              <div className="bg-slate-800/80 p-6 rounded-2xl w-full border border-slate-700 backdrop-blur-sm space-y-4">
                 
                 {/* Accuracy Meter */}
                 <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-slate-400 text-sm">Hinnanguline täpsus</span>
                        <span className={`text-xl font-mono font-bold ${location.accuracy <= 100 ? 'text-green-400' : 'text-amber-400'}`}>
                        {Math.round(location.accuracy)}m
                        </span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                        className={`h-full transition-all duration-500 ${location.accuracy <= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (100 / location.accuracy) * 100)}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                        <span>Soovituslik: 100m</span>
                    </div>
                 </div>

                 {/* Distance Display */}
                 <div className="pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                       <span className="text-slate-400 text-sm">Kaugus objektist</span>
                       <span className="text-xl font-mono font-bold text-white">{distance}m</span>
                    </div>
                 </div>

                 {location.accuracy > 100 && (
                   <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-left">
                      <p className="text-amber-200 text-sm flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Oota, GPS täpne asukoht pole veel saavutatud.
                      </p>
                   </div>
                 )}
              </div>
            ) : (
              <p className="text-slate-400">Oodake GPS signaali...</p>
            )}

            {/* Override button if GPS is taking too long */}
            {location && location.accuracy > 100 && (
               <button 
                onClick={() => setStep(Step.CAMERA)}
                className="mt-8 text-slate-500 underline text-sm hover:text-slate-300"
               >
                 Jätka ebatäpse asukohaga
               </button>
            )}
          </div>
        )}

        {/* Step 1: Camera View */}
        {step === Step.CAMERA && (
           <>
            {!photo && (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            )}
            {photo && (
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Overlay Grid */}
            {!photo && (
               <div className="absolute inset-0 pointer-events-none opacity-30">
                  <div className="w-full h-full border-[20px] border-black/20"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-lg"></div>
               </div>
            )}
            {/* Live GPS info overlay */}
            <div className="absolute top-16 left-0 right-0 p-4 pointer-events-none flex justify-center gap-2">
               <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white border border-white/10 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-300">
                     <Navigation className="w-3 h-3" />
                     {location ? Math.round(location.accuracy) : '?'}m täpsus
                  </span>
                  <div className="w-px h-3 bg-white/20"></div>
                  <span className="flex items-center gap-1 font-bold text-white">
                     <MapPin className="w-3 h-3 text-blue-400" />
                     {distance !== null ? `${distance}m objektist` : 'Arvutan...'}
                  </span>
               </div>
            </div>
           </>
        )}

        {/* Step 2: Confirm Screen */}
        {step === Step.CONFIRM && photo && (
           <div className="w-full h-full flex flex-col bg-slate-900">
              <div className="flex-1 relative">
                <img src={photo} alt="Confirmation" className="w-full h-full object-cover opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent p-6 pt-20">
                   <div className="flex items-start gap-3 mb-4">
                      <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30">
                        <MapPin className="w-6 h-6 text-green-400 shrink-0" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">Asukoht fikseeritud</p>
                        <p className="text-slate-300 text-sm mt-1 flex flex-col gap-1">
                           <span>Kaugus objektist: <strong className="text-white">{distance}m</strong></span>
                           <span className="text-xs text-slate-500">Täpsus: {location ? Math.round(location.accuracy) : 0}m</span>
                        </p>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-slate-900 p-6 pb-8 border-t border-slate-800 z-20">
        {step === Step.CAMERA && (
          <div className="flex flex-col items-center">
             <p className="text-slate-400 text-sm mb-4">Tehke foto objektist</p>
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-xl shadow-blue-500/10 ring-4 ring-transparent hover:ring-blue-500/50"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full border-2 border-white"></div>
            </button>
          </div>
        )}

        {step === Step.CONFIRM && (
          <div className="flex gap-4">
            <button 
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800 text-white font-semibold active:bg-slate-700 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-5 h-5" />
              Uuesti
            </button>
            <button 
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 text-white font-bold text-lg active:bg-green-700 shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] hover:bg-green-500"
            >
              <Check className="w-6 h-6" />
              Kinnita
            </button>
          </div>
        )}
      </div>
    </div>
  );
};