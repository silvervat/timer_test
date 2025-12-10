import React from 'react';
import { WorkSession } from '../types';
import { Clock, MapPin, Target, Coffee } from 'lucide-react';

interface HistoryItemProps {
  session: WorkSession;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ session }) => {
  const startDate = new Date(session.startTime);
  const endDate = session.endTime ? new Date(session.endTime) : null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const duration = session.totalTimeMs 
    ? Math.floor(session.totalTimeMs / 1000 / 60) 
    : 0;
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const pauseCount = session.pauses ? session.pauses.length : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-slate-800">{formatDate(startDate)}</h4>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(startDate)} - {endDate ? formatTime(endDate) : 'Kestab...'}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {hours}h {minutes}m
          </span>
          {pauseCount > 0 && (
             <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                <Coffee className="w-3 h-3" /> {pauseCount} pausi
             </span>
          )}
        </div>
      </div>

      {/* Locations & Distances */}
      <div className="text-xs text-slate-600 space-y-1 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-1">
             <MapPin className="w-3 h-3 mt-0.5 text-green-600" />
             <span>Algus</span>
          </div>
          {session.startDistance !== undefined && (
             <div className="flex items-center gap-1 text-slate-500 font-medium">
                <Target className="w-3 h-3" />
                <span>{session.startDistance}m objektist</span>
             </div>
          )}
        </div>
        
        {session.endLocation && (
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-1">
               <MapPin className="w-3 h-3 mt-0.5 text-red-600" />
               <span>Lõpp</span>
            </div>
            {session.endDistance !== undefined && (
               <div className="flex items-center gap-1 text-slate-500 font-medium">
                  <Target className="w-3 h-3" />
                  <span>{session.endDistance}m objektist</span>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="flex gap-2 mt-2 border-t border-slate-100 pt-2">
         {session.startPhoto && (
            <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
               <img src={session.startPhoto} alt="Start" className="w-full h-full object-cover" />
               <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white text-center py-0.5">Start</div>
            </div>
         )}
         {session.endPhoto && (
            <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
               <img src={session.endPhoto} alt="End" className="w-full h-full object-cover" />
               <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white text-center py-0.5">Lõpp</div>
            </div>
         )}
         
         <div className="flex-1 flex items-center justify-end">
            <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
               <span className="font-semibold text-slate-600">Rivest Secure</span>
               <br/>
               GPS Verified
            </div>
         </div>
      </div>
    </div>
  );
};