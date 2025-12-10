import React, { useState, useEffect } from 'react';
import { Play, Square, History, User, HardHat, Clock, MapPin, Coffee, PlayCircle, LogOut } from 'lucide-react';
import { ActionFlow } from './components/ActionFlow';
import { HistoryItem } from './components/HistoryItem';
import { WorkStatus, WorkSession, ActionType, LocationData, PauseEntry } from './types';

// Objekt: Pärnu, Laine 6a
const PROJECT_LOCATION = {
  latitude: 58.358500, 
  longitude: 24.536500,
  name: "Pärnu, Laine 6a"
};

const MOCK_HISTORY: WorkSession[] = [
  {
    id: 'prev-1',
    startTime: Date.now() - 86400000, // Yesterday
    endTime: Date.now() - 86400000 + 28800000, // +8h
    startLocation: { latitude: 58.358510, longitude: 24.536520, accuracy: 5, timestamp: Date.now() - 86400000 },
    startDistance: 12, // 12 meters
    startPhoto: 'https://picsum.photos/400/300?grayscale',
    startAnalysis: 'Foto ja GPS koordinaadid fikseeritud',
    endPhoto: 'https://picsum.photos/400/300?blur=2',
    endLocation: { latitude: 58.358500, longitude: 24.536500, accuracy: 10, timestamp: Date.now() },
    endDistance: 5,
    pauses: [],
    totalTimeMs: 28800000
  }
];

export default function App() {
  const [status, setStatus] = useState<WorkStatus>(WorkStatus.IDLE);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [history, setHistory] = useState<WorkSession[]>(MOCK_HISTORY);
  
  // UI State
  const [showActionFlow, setShowActionFlow] = useState<ActionType | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Helper to calculate total paused time based on a session's pauses
  const calculateTotalPausedTime = (pauses: PauseEntry[]): number => {
    let total = 0;
    const now = Date.now();
    pauses.forEach(pause => {
      const end = pause.endTime || now;
      total += (end - pause.startTime);
    });
    return total;
  };

  // Timer Effect
  useEffect(() => {
    let interval: number;
    
    // Only tick if WORKING (not PAUSED, not IDLE)
    if (status === WorkStatus.WORKING && currentSession) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const totalDuration = now - currentSession.startTime;
        const pausedDuration = calculateTotalPausedTime(currentSession.pauses);
        setElapsedTime(totalDuration - pausedDuration);
      }, 1000);
    } 
    // If paused, just show the time accumulated until the pause started
    else if (status === WorkStatus.PAUSED && currentSession) {
       const now = Date.now();
       const totalDuration = now - currentSession.startTime;
       const pausedDuration = calculateTotalPausedTime(currentSession.pauses);
       setElapsedTime(totalDuration - pausedDuration);
    } 
    else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [status, currentSession]);

  const handleStartWork = () => {
    setShowActionFlow('START');
  };

  const handleStopWork = () => {
    setShowActionFlow('STOP');
  };

  const handlePauseWork = () => {
    setShowActionFlow('PAUSE');
  };

  const handleResumeWork = () => {
    setShowActionFlow('RESUME');
  };

  const onActionComplete = (photo: string, location: LocationData, analysis: string, distance: number) => {
    if (showActionFlow === 'START') {
      const newSession: WorkSession = {
        id: Date.now().toString(),
        startTime: Date.now(),
        startLocation: location,
        startDistance: distance,
        startPhoto: photo,
        startAnalysis: analysis,
        pauses: []
      };
      setCurrentSession(newSession);
      setStatus(WorkStatus.WORKING);

    } else if (showActionFlow === 'PAUSE' && currentSession) {
      const newPause: PauseEntry = {
         startTime: Date.now(),
         startLocation: location,
         startPhoto: photo,
         startDistance: distance
      };
      const updatedSession = {
         ...currentSession,
         pauses: [...currentSession.pauses, newPause]
      };
      setCurrentSession(updatedSession);
      setStatus(WorkStatus.PAUSED);

    } else if (showActionFlow === 'RESUME' && currentSession) {
      // Close the last open pause
      const updatedPauses = [...currentSession.pauses];
      const lastPauseIndex = updatedPauses.length - 1;
      if (lastPauseIndex >= 0) {
         updatedPauses[lastPauseIndex] = {
            ...updatedPauses[lastPauseIndex],
            endTime: Date.now(),
            endLocation: location,
            endPhoto: photo,
            endDistance: distance
         };
      }
      const updatedSession = {
         ...currentSession,
         pauses: updatedPauses
      };
      setCurrentSession(updatedSession);
      setStatus(WorkStatus.WORKING);

    } else if (showActionFlow === 'STOP' && currentSession) {
      const endTime = Date.now();
      
      // If stopping from PAUSED state, we must close the open pause first
      let updatedPauses = [...currentSession.pauses];
      const lastPauseIndex = updatedPauses.length - 1;
      
      if (lastPauseIndex >= 0 && !updatedPauses[lastPauseIndex].endTime) {
         updatedPauses[lastPauseIndex] = {
            ...updatedPauses[lastPauseIndex],
            endTime: endTime,
            endLocation: location, // End of pause location is same as End of work
            endPhoto: photo,       // End of pause photo is same as End of work
            endDistance: distance
         };
      }

      // Calculate final net time
      // We calculate paused time using the now-closed pauses
      const totalPaused = updatedPauses.reduce((acc, p) => {
         // p.endTime should exist now, but fallback to endTime just in case
         return acc + ((p.endTime || endTime) - p.startTime);
      }, 0);
      
      const totalTimeMs = (endTime - currentSession.startTime) - totalPaused;

      const finishedSession: WorkSession = {
        ...currentSession,
        pauses: updatedPauses,
        endTime: endTime,
        endLocation: location,
        endDistance: distance,
        endPhoto: photo,
        endAnalysis: analysis,
        totalTimeMs: totalTimeMs,
      };
      setHistory(prev => [finishedSession, ...prev]);
      setCurrentSession(null);
      setStatus(WorkStatus.IDLE);
    }
    setShowActionFlow(null);
  };

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
     if (status === WorkStatus.WORKING) return 'bg-green-500';
     if (status === WorkStatus.PAUSED) return 'bg-amber-500';
     return 'bg-slate-500';
  };

  const getStatusText = () => {
     if (status === WorkStatus.WORKING) return 'Töötamine Aktiivne';
     if (status === WorkStatus.PAUSED) return 'Pausil';
     return 'Ootel / Puhkus';
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-xl z-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <HardHat className="w-32 h-32 transform rotate-12" />
        </div>
        
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <HardHat className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight">Rivest Platform</h1>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {PROJECT_LOCATION.name}
                </p>
             </div>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
             <User className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        {/* Status Card */}
        <div className="flex flex-col items-center justify-center mt-2">
           <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${status === WorkStatus.WORKING ? 'bg-green-500/20 text-green-400 border-green-500/30' : status === WorkStatus.PAUSED ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
              <span className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === WorkStatus.WORKING ? 'animate-pulse' : ''}`}></span>
              {getStatusText()}
           </span>
           
           <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums text-white drop-shadow-lg">
              {formatElapsedTime(elapsedTime)}
           </div>
           <p className="text-slate-400 text-sm mt-1">
              {status === WorkStatus.PAUSED ? 'Tööaeg (paus ei loe)' : 'Kulunud tööaeg'}
           </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 -mt-6 z-10 overflow-y-auto no-scrollbar pb-24">
        
        {/* Action Button Area */}
        <div className="mb-8 flex justify-center">
           {status === WorkStatus.IDLE && (
             <button 
               onClick={handleStartWork}
               className="group relative w-full max-w-sm bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl p-4 shadow-xl shadow-blue-900/20 transition-all hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="flex items-center justify-center gap-4">
                   <div className="bg-white/20 p-3 rounded-xl">
                      <Play className="w-8 h-8 fill-current" />
                   </div>
                   <div className="text-left">
                      <span className="block text-2xl font-bold">Alusta tööd</span>
                      <span className="text-blue-200 text-sm">Registreeri algus + Asukoht</span>
                   </div>
                </div>
             </button>
           )}

           {status === WorkStatus.WORKING && (
             <div className="flex gap-3 w-full max-w-sm">
                <button 
                  onClick={handlePauseWork}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white rounded-2xl p-4 shadow-xl shadow-amber-900/20 transition-all hover:-translate-y-1 active:scale-[0.98] flex flex-col items-center justify-center gap-1"
                >
                   <Coffee className="w-6 h-6 mb-1" />
                   <span className="font-bold">Tee paus</span>
                   <span className="text-xs text-amber-100">Pausi algus</span>
                </button>
                
                <button 
                  onClick={handleStopWork}
                  className="flex-[1.5] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-2xl p-4 shadow-xl shadow-red-900/20 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center gap-3 justify-center"
                >
                   <div className="bg-white/20 p-2 rounded-lg">
                      <Square className="w-6 h-6 fill-current" />
                   </div>
                   <div className="text-left">
                      <span className="block font-bold text-lg">Lõpeta</span>
                      <span className="text-red-200 text-xs">Raport</span>
                   </div>
                </button>
             </div>
           )}

           {status === WorkStatus.PAUSED && (
             <div className="flex gap-3 w-full max-w-sm">
               <button 
                 onClick={handleStopWork}
                 className="flex-1 bg-red-600/10 hover:bg-red-600/20 active:bg-red-600/30 text-red-600 border border-red-600/20 rounded-2xl p-4 transition-all hover:-translate-y-1 active:scale-[0.98] flex flex-col items-center justify-center gap-1"
               >
                  <Square className="w-6 h-6 mb-1 fill-current" />
                  <span className="font-bold">Lõpeta</span>
                  <span className="text-[10px] opacity-70">Lõpeta päev</span>
               </button>

               <button 
                 onClick={handleResumeWork}
                 className="flex-[2] group bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-2xl p-4 shadow-xl shadow-green-900/20 transition-all hover:-translate-y-1 active:scale-[0.98]"
               >
                  <div className="flex items-center justify-center gap-3">
                     <div className="bg-white/20 p-2 rounded-lg">
                        <PlayCircle className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <span className="block font-bold text-lg">Jätka tööd</span>
                        <span className="text-green-200 text-sm">Paus läbi + Asukoht</span>
                     </div>
                  </div>
               </button>
             </div>
           )}
        </div>

        {/* Recent History Section */}
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-4 px-2">
             <History className="w-5 h-5 text-slate-500" />
             <h3 className="text-lg font-bold text-slate-800">Viimased logid</h3>
          </div>
          
          <div className="space-y-4">
             {history.length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                   <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                   <p>Ajalugu puudub</p>
                </div>
             )}
             {history.map(session => (
               <HistoryItem key={session.id} session={session} />
             ))}
          </div>
        </div>
      </main>

      {/* Action Flow Overlay (Modal) */}
      {showActionFlow && (
        <ActionFlow 
          type={showActionFlow}
          targetLocation={PROJECT_LOCATION}
          onComplete={onActionComplete}
          onCancel={() => setShowActionFlow(null)}
        />
      )}

    </div>
  );
}