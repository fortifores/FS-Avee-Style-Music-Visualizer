import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  mainImgUrl?: string;
  mainImgOffsetX?: number;
  mainImgOffsetY?: number;
  bgImgUrl?: string;
  bgOffsetX?: number;
  bgOffsetY?: number;
  bgDimming?: number;
  bgCinematic?: boolean;
  mainImgZoom?: number;
  bgImgZoom?: number;
  isRecording?: boolean;
  exportSettings?: {
    fps: number;
    bitrate: number;
    mimeType: string;
  };
  onRecordingComplete?: (blob: Blob) => void;
  frontWaveColor?: string;
  backWaveColor?: string;
  infillWaves?: boolean;
  followWaves?: boolean;
  firstRowColor?: string;
  secondRowColor?: string;
  onMainImgError?: () => void;
  onBgImgError?: () => void;
}

interface Particle {

  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const getSmoothBin = (data: Uint8Array, index: number, windowSize: number = 2) => {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, index - windowSize); i <= Math.min(data.length - 1, index + windowSize); i++) {
    sum += data[i];
    count++;
  }
  return sum / count;
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioElement,
  mainImgUrl,
  mainImgOffsetX = 0,
  mainImgOffsetY = 0,
  bgImgUrl,
  bgOffsetX = 0,
  bgOffsetY = 0,
  bgDimming = 50,
  bgCinematic = false,
  mainImgZoom = 0,
  bgImgZoom = 0,
  isRecording = false,
  exportSettings,
  onRecordingComplete,
  frontWaveColor = '#00f2fe',
  backWaveColor = '#4facfe',
  infillWaves = false,
  followWaves = true,
  firstRowColor = '#00f2fe',
  secondRowColor = '#4facfe',
  onMainImgError,
  onBgImgError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceConnected = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const currentRadiusRef = useRef(150);
  const mainImageRef = useRef<HTMLImageElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Load main image
  useEffect(() => {
    if (mainImgUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = mainImgUrl;
      img.onload = () => {
        mainImageRef.current = img;
      };
      img.onerror = () => {
        mainImageRef.current = null;
        if (onMainImgError) onMainImgError();
      };
    } else {
      mainImageRef.current = null;
    }
  }, [mainImgUrl]);

  // Load background image
  useEffect(() => {
    if (bgImgUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = bgImgUrl;
      img.onload = () => {
        bgImageRef.current = img;
      };
      img.onerror = () => {
        bgImageRef.current = null;
        if (onBgImgError) onBgImgError();
      };
    } else {
      bgImageRef.current = null;
    }
  }, [bgImgUrl]);

  // Setup Web Audio API
  useEffect(() => {
    if (!audioElement) return;

    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (!sourceConnected.current && audioCtxRef.current && analyserRef.current) {
      try {
        sourceRef.current = audioCtxRef.current.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
        sourceConnected.current = true;
      } catch (e) {
        console.error('Audio routing error:', e);
      }
    }
  }, [audioElement]);

  // Resume context if needed when playing starts
  useEffect(() => {
    if (!audioElement) return;
    const onPlay = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    audioElement.addEventListener('play', onPlay);
    return () => audioElement.removeEventListener('play', onPlay);
  }, [audioElement]);

  // Recording Logic
  useEffect(() => {
    if (isRecording && !mediaRecorderRef.current) {
        const canvas = canvasRef.current;
        const audioCtx = audioCtxRef.current;
        if (!canvas || !audioCtx) return;

        // Force 1080p resolution for recording
        canvas.width = 1920;
        canvas.height = 1080;

        const fps = exportSettings?.fps || 60;
        const canvasStream = canvas.captureStream(fps);
        
        const dest = audioCtx.createMediaStreamDestination();
        if (sourceRef.current) {
            sourceRef.current.connect(dest);
        }

        const tracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
        const combinedStream = new MediaStream(tracks);

        let options = { 
          videoBitsPerSecond: exportSettings?.bitrate || 18000000, 
          audioBitsPerSecond: 384000 
        };
        
        let mimeType = exportSettings?.mimeType || '';
        
        // Fallback if the selected codec is not supported by the browser
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          const types = [
              'video/mp4',
              'video/webm;codecs=h264,opus',
              'video/webm;codecs=vp9,opus',
              'video/webm'
          ];
          for (const type of types) {
              if (MediaRecorder.isTypeSupported(type)) {
                  mimeType = type;
                  break;
              }
          }
        }
        
        const recorder = new MediaRecorder(combinedStream, { ...options, mimeType });
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            onRecordingComplete?.(blob);
            chunksRef.current = [];
            mediaRecorderRef.current = null;
            
            if (sourceRef.current) {
                try {
                    sourceRef.current.disconnect(dest);
                } catch(e) {}
            }
            
            // Restore canvas size
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth * window.devicePixelRatio;
                canvasRef.current.height = window.innerHeight * window.devicePixelRatio;
            }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
    } else if (!isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
    }
  }, [isRecording, onRecordingComplete, exportSettings]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current && !isRecordingRef.current) {
        canvasRef.current.width = window.innerWidth * window.devicePixelRatio;
        canvasRef.current.height = window.innerHeight * window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render Loop
  useEffect(() => {
    let animationId: number;
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    const render = () => {
      animationId = requestAnimationFrame(render);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const analyser = analyserRef.current;
      
      if (!canvas || !ctx || !analyser) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Update offscreen canvas size if needed
      if (offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
          offscreenCanvas.width = width;
          offscreenCanvas.height = height;
      }

      // Draw background
      ctx.globalCompositeOperation = 'source-over';
      if (bgImageRef.current) {
        const img = bgImageRef.current;
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight;
        
        const bgScale = 1 + (bgImgZoom || 0) / 100;
        
        if (bgCinematic) {
           ctx.save();
           ctx.filter = 'blur(40px)';
           ctx.globalAlpha = 0.6;
           
           if (canvasAspect > imgAspect) {
               drawWidth = width * bgScale;
               drawHeight = (width / imgAspect) * bgScale;
           } else {
               drawHeight = height * bgScale;
               drawWidth = (height * imgAspect) * bgScale;
           }
           ctx.drawImage(img, width/2 - drawWidth/2, height/2 - drawHeight/2, drawWidth, drawHeight);
           ctx.restore();
           
           if (canvasAspect > imgAspect) {
               drawHeight = height * bgScale;
               drawWidth = (height * imgAspect) * bgScale;
           } else {
               drawWidth = width * bgScale;
               drawHeight = (width / imgAspect) * bgScale;
           }
        } else {
           if (canvasAspect > imgAspect) {
               drawWidth = width * bgScale;
               drawHeight = (width / imgAspect) * bgScale;
           } else {
               drawHeight = height * bgScale;
               drawWidth = (height * imgAspect) * bgScale;
           }
        }
        
        ctx.save();
        ctx.drawImage(
            img, 
            width/2 - drawWidth/2 + bgOffsetX, 
            height/2 - drawHeight/2 + bgOffsetY, 
            drawWidth, 
            drawHeight
        );
        ctx.restore();
        
        ctx.fillStyle = `rgba(10, 10, 15, ${bgDimming / 100})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);
      }

      // Visualizer logic
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      let bassSum = 0;
      for (let i = 0; i < 5; i++) bassSum += dataArray[i];
      const bass = bassSum / 5;

      const baseRadius = Math.min(width, height) * 0.15;
      const targetRadius = baseRadius + (bass / 255) * (baseRadius * 0.5);
      currentRadiusRef.current += (targetRadius - currentRadiusRef.current) * 0.15;
      const radius = currentRadiusRef.current;

      // Draw trails onto offscreen canvas
      if (offscreenCtx) {
          offscreenCtx.globalCompositeOperation = 'destination-out';
          offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          offscreenCtx.fillRect(0, 0, width, height);
          offscreenCtx.globalCompositeOperation = 'source-over';

          if (bass > 210 && Math.random() > 0.4) {
            for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 5 + (bass / 255) * 5;
              const isBlue = Math.random() > 0.5;
              particlesRef.current.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                maxLife: 40 + Math.random() * 60,
                color: followWaves
                  ? (isBlue ? backWaveColor : frontWaveColor)
                  : (isBlue ? secondRowColor : firstRowColor),
                size: 1 + Math.random() * 3
              });
            }
          }

          particlesRef.current.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            if (p.life >= p.maxLife) {
              particlesRef.current.splice(index, 1);
            } else {
              offscreenCtx.beginPath();
              offscreenCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              offscreenCtx.fillStyle = p.color;
              offscreenCtx.globalAlpha = 1 - p.life / p.maxLife;
              offscreenCtx.shadowBlur = 10;
              offscreenCtx.shadowColor = p.color;
              offscreenCtx.fill();
            }
          });
          offscreenCtx.globalAlpha = 1.0;
          offscreenCtx.shadowBlur = 0;

          const drawWave = (
            data: Uint8Array,
            waveRadius: number,
            color: string,
            fillColor: string,
            scale: number,
            lineWidth: number,
            fill: boolean
          ) => {
            offscreenCtx.beginPath();
            offscreenCtx.strokeStyle = color;
            offscreenCtx.lineWidth = lineWidth * window.devicePixelRatio;
            offscreenCtx.shadowBlur = 20;
            offscreenCtx.shadowColor = color;

            const numBins = 70;
            for (let i = 0; i < numBins; i++) {
              const angle = -Math.PI / 2 + (i / (numBins - 1)) * Math.PI;
              const val = getSmoothBin(data, i, 2);
              const amp = (val / 255) * scale;
              const r = waveRadius + amp;
              const x = centerX + Math.cos(angle) * r;
              const y = centerY + Math.sin(angle) * r;

              if (i === 0) offscreenCtx.moveTo(x, y);
              else offscreenCtx.lineTo(x, y);
            }

            for (let i = numBins - 1; i >= 0; i--) {
              const angle = Math.PI / 2 + ((numBins - 1 - i) / (numBins - 1)) * Math.PI;
              const val = getSmoothBin(data, i, 2);
              const amp = (val / 255) * scale;
              const r = waveRadius + amp;
              const x = centerX + Math.cos(angle) * r;
              const y = centerY + Math.sin(angle) * r;
              offscreenCtx.lineTo(x, y);
            }

            offscreenCtx.closePath();
            
            if (fill) {
              offscreenCtx.fillStyle = fillColor;
              offscreenCtx.fill();
            }
            
            offscreenCtx.stroke();
            offscreenCtx.shadowBlur = 0;
          };

          const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16) || 0;
            const g = parseInt(hex.slice(3, 5), 16) || 0;
            const b = parseInt(hex.slice(5, 7), 16) || 0;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };

          const waveScale = Math.min(width, height) * 0.15;
          
          // Draw back wave first (darker/outer wave)
          drawWave(dataArray, radius, frontWaveColor, hexToRgba(frontWaveColor, 0.6), waveScale, 3, infillWaves);
          
          // Draw front wave second (lighter/inner wave)
          drawWave(dataArray, radius * 0.95, backWaveColor, hexToRgba(backWaveColor, 0.4), waveScale * 0.5, 1.5, infillWaves);
      }

      // Draw offscreen canvas to main canvas
      ctx.drawImage(offscreenCanvas, 0, 0);

      // Draw Center Core Hole
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
      ctx.clip();
      
      if (mainImageRef.current) {
        const img = mainImageRef.current;
        const size = (radius - 4) * 2;
        
        const imgAspect = img.width / img.height;
        let drawWidth = size;
        let drawHeight = size;
        
        if (imgAspect > 1) {
            drawWidth = size * imgAspect;
        } else {
            drawHeight = size / imgAspect;
        }
        
        const mainScale = 1 + (mainImgZoom || 0) / 100;
        drawWidth *= mainScale;
        drawHeight *= mainScale;
        
        ctx.drawImage(
            img, 
            centerX - drawWidth/2 + mainImgOffsetX, 
            centerY - drawHeight/2 + mainImgOffsetY, 
            drawWidth, 
            drawHeight
        );
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fill();
      }
      
      ctx.restore();
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [mainImgOffsetX, mainImgOffsetY, bgOffsetX, bgOffsetY, bgDimming, bgCinematic, mainImgZoom, bgImgZoom, frontWaveColor, backWaveColor, infillWaves, followWaves, firstRowColor, secondRowColor]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};


