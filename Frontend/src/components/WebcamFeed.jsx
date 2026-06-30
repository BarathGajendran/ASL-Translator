import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Loader2, Sparkles, Maximize2, Sliders, Check, Settings, Info } from 'lucide-react';

const WebcamFeed = ({ onLandmarksDetected, isConnected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [handsLoaded, setHandsLoaded] = useState(false);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  
  // Throttle frame processing to reduce WebSocket overhead (approx. 10 FPS)
  const lastProcessedTime = useRef(0);
  const processInterval = 100; // ms

  const isConnectedRef = useRef(isConnected);
  const onLandmarksDetectedRef = useRef(onLandmarksDetected);
  const isActiveRef = useRef(isActive);
  
  // Ref to store last tracked coordinates for user gesture calibration
  const lastLandmarksRef = useRef(null);

  // Calibration wizard state
  const [selectedLabel, setSelectedLabel] = useState('a');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const classes = [
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    'space', 'delete'
  ];

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    onLandmarksDetectedRef.current = onLandmarksDetected;
  }, [onLandmarksDetected]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    // Check if MediaPipe is loaded from index.html CDN
    const checkMediaPipe = setInterval(() => {
      if (window.Hands && window.Camera) {
        setHandsLoaded(true);
        clearInterval(checkMediaPipe);
      }
    }, 500);

    return () => {
      clearInterval(checkMediaPipe);
      stopCamera();
    };
  }, []);

  const initializeMediaPipe = () => {
    if (!window.Hands) return;

    setIsModelLoading(true);
    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);
    handsRef.current = hands;
  };

  const startCamera = async () => {
    if (!handsRef.current) {
      initializeMediaPipe();
    }
    
    setIsActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { max: 30 } },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start MediaPipe Camera utility
      if (window.Camera && videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && isActiveRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        cameraRef.current = camera;
        await camera.start();
        setIsModelLoading(false);
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setIsActive(false);
      setIsModelLoading(false);
      alert("Could not access camera. Please verify permissions.");
    }
  };

  const stopCamera = () => {
    setIsActive(false);
    lastLandmarksRef.current = null;
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the skeleton
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Store reference to latest landmarks for user calibration
      lastLandmarksRef.current = landmarks;
      
      // Draw hand skeleton overlay
      drawHandSkeleton(ctx, landmarks);

      // Throttled WebSocket send
      const now = Date.now();
      if (now - lastProcessedTime.current > processInterval && isConnectedRef.current) {
        onLandmarksDetectedRef.current(landmarks);
        lastProcessedTime.current = now;
      }
    } else {
      lastLandmarksRef.current = null;
    }
  };

  const drawHandSkeleton = (ctx, landmarks) => {
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm base
    ];

    // Draw connections
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'; // Accent Neon Cyan
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#3B82F6';
    
    connections.forEach(([i, j]) => {
      const pt1 = landmarks[i];
      const pt2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(pt1.x * w, pt1.y * h);
      ctx.lineTo(pt2.x * w, pt2.y * h);
      ctx.stroke();
    });

    // Draw landmark joints
    ctx.shadowBlur = 0; // reset shadow
    landmarks.forEach((pt, idx) => {
      ctx.beginPath();
      if (idx === 0) {
        ctx.fillStyle = '#EC4899'; // Pink for wrist
        ctx.arc(pt.x * w, pt.y * h, 7, 0, 2 * Math.PI);
      } else if (idx % 4 === 0) {
        ctx.fillStyle = '#FBBF24'; // Yellow for tips
        ctx.arc(pt.x * w, pt.y * h, 6, 0, 2 * Math.PI);
      } else {
        ctx.fillStyle = '#10B981'; // Green for normal joints
        ctx.arc(pt.x * w, pt.y * h, 4, 0, 2 * Math.PI);
      }
      ctx.fill();
    });
  };

  // Full Screen Feature
  const toggleFullscreen = () => {
    const container = document.getElementById('webcam-view-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Capture Pose Sample API Call
  const handleRecordGesture = async () => {
    if (!lastLandmarksRef.current) {
      setStatusMessage('⚠️ No hand detected. Hold your hand in front of the camera.');
      return;
    }
    
    setIsRecording(true);
    setStatusMessage('');
    
    try {
      const response = await fetch('/api/custom-gesture/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: selectedLabel,
          landmarks: lastLandmarksRef.current
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setRecordSuccess(true);
        setStatusMessage(`✅ Logged custom sample for '${selectedLabel.toUpperCase()}'!`);
        setTimeout(() => setRecordSuccess(false), 2000);
      } else {
        setStatusMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setStatusMessage('❌ Server connection failed.');
    } finally {
      setIsRecording(false);
    }
  };

  // Retrain Classifier API Call
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainSuccess(false);
    setStatusMessage('🧠 Retraining CNN model in background...');
    
    try {
      const response = await fetch('/api/custom-gesture/train', {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        setTrainSuccess(true);
        setStatusMessage('🚀 Retraining successful! Classifier reloaded.');
        setTimeout(() => setTrainSuccess(false), 3000);
      } else {
        setStatusMessage(`❌ Retraining failed: ${data.error}`);
      }
    } catch (err) {
      setStatusMessage('❌ Retraining connection failed.');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card/30 p-4 shadow-glass flex flex-col gap-4">
      {/* Glow highlight */}
      <div className="absolute -left-16 -top-16 -z-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"></div>
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-wide text-gray-100 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-light animate-pulse" />
          Webcam Tracking Hub
        </h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isActive 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
          {isActive ? 'Active' : 'Offline'}
        </span>
      </div>

      {/* Webcam View Frame */}
      <div 
        id="webcam-view-container" 
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-dark-border bg-black/80 flex items-center justify-center group"
      >
        {/* Loading Spinner */}
        {isModelLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-300">Initializing Hand Tracking Mesh...</p>
          </div>
        )}

        {/* Video stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
          playsInline
          muted
          autoPlay
        />

        {/* Landmarks canvas overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 z-10 h-full w-full object-cover scale-x-[-1] pointer-events-none"
        />

        {/* Floating overlays when camera is active */}
        {isActive && (
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/85 border border-white/10 hover:border-white/20 text-white transition-all shadow-glass"
              title="Toggle Full Screen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Standby screen */}
        {!isActive && !isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-bg/60 p-6 text-center">
            <CameraOff className="h-14 w-14 text-gray-500 mb-3" />
            <h4 className="text-md font-semibold text-gray-200">Camera Feed is Offline</h4>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Start the camera stream to begin real-time hand gesture tracking.
            </p>
          </div>
        )}
      </div>

      {/* Main Action Start/Stop Controls */}
      <div className="flex gap-3">
        {!isActive ? (
          <button
            onClick={startCamera}
            disabled={!handsLoaded}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-white px-4 py-3 font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            Start Camera Feed
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 hover:border-transparent px-4 py-3 font-semibold transition-all duration-300"
          >
            <CameraOff className="h-5 w-5" />
            Stop Camera Feed
          </button>
        )}
      </div>

      {/* Custom Gesture Calibration Portal (shows when camera is active) */}
      {isActive && (
        <div className="rounded-xl border border-dark-border/80 bg-dark-bg/40 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-dark-border/40 pb-2">
            <Sliders className="h-4 w-4 text-primary-light" />
            <h4 className="text-sm font-semibold text-gray-200">Interactive Gesture Calibration</h4>
          </div>

          <div className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1">
            <Info className="h-4 w-4 text-primary-light flex-shrink-0" />
            <span>If letters aren't detecting correctly, hold the hand pose, select the label below, and record to calibrate!</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Target Sign</label>
              <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="w-full bg-dark-hover/80 text-gray-200 text-sm rounded-lg p-2 border border-dark-border focus:outline-none focus:border-primary"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex-2 flex gap-2 w-full sm:w-auto items-end h-[38px] mt-auto">
              <button
                onClick={handleRecordGesture}
                disabled={isRecording}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-dark-hover border border-dark-border text-xs text-gray-200 hover:text-white hover:bg-dark-border/60 px-3 py-2 font-semibold transition-all"
              >
                {isRecording ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : recordSuccess ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                Record Pose
              </button>
              
              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/30 px-3 py-2 font-semibold text-xs transition-all"
              >
                {isTraining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : trainSuccess ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                Retrain AI
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="text-xs font-semibold text-gray-300 bg-black/20 p-2 rounded-lg border border-dark-border/40 mt-1">
              {statusMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
