import React from 'react';
import { History, Download, Calendar, ArrowRight, MessageSquare } from 'lucide-react';

const SessionHistory = ({ recentSentences, isConnected }) => {
  
  // Format Date to nice local string
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const handleDownloadHistory = () => {
    if (!recentSentences || recentSentences.length === 0) return;
    
    // Prepare JSON data
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recentSentences, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `asl_translation_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card/30 p-5 shadow-glass h-full">
      <div className="flex items-center justify-between mb-4 border-b border-dark-border/40 pb-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-300 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Translation History & Logs
        </h3>
        {recentSentences && recentSentences.length > 0 && (
          <button
            onClick={handleDownloadHistory}
            className="inline-flex items-center gap-1 text-xs bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-dark-border transition-all duration-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export Logs
          </button>
        )}
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
        {recentSentences && recentSentences.length > 0 ? (
          recentSentences.map((session, index) => (
            <div 
              key={session.session_id || index}
              className="flex flex-col gap-2 rounded-xl bg-dark-bg/40 border border-dark-border/40 p-4 transition-all duration-200 hover:border-primary/20"
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatTime(session.start_time)}
                </span>
                <span className="bg-primary/10 text-primary-light px-2 py-0.5 rounded-md font-medium border border-primary/15">
                  {session.total_gestures} signs ({Math.round(session.average_confidence * 100)}%)
                </span>
              </div>
              
              <div className="flex items-start gap-2 mt-1">
                <MessageSquare className="h-4 w-4 text-accent/60 mt-1 flex-shrink-0" />
                <p className="text-sm text-gray-200 font-medium leading-relaxed select-all">
                  {session.final_text}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <History className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">No translated sentences logged yet</p>
            <p className="text-[10px] text-gray-500 max-w-xs mt-1">
              Once you start signing stable letters and completing words, they will save to the database and list here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
