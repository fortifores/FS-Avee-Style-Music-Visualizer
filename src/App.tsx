import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, Play, Pause, RefreshCw, Volume2, VolumeX, Edit2, Download, Loader2 } from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ColorPicker } from './components/ColorPicker';
import { cn } from './lib/utils';

const ControlSlider = ({ label, value, onChange, max = 200, min = 0 }: { label: string, value: number, onChange: (v: number) => void, max?: number, min?: number }) => (
  <div className="flex flex-col gap-1 mb-3">
    <div className="flex justify-between text-xs text-gray-400">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-1 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f2fe] cursor-pointer" />
  </div>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(true);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Customization State
  const [showCustomization, setShowCustomization] = useState(false);
  const [customTab, setCustomTab] = useState<'image' | 'waves' | 'particles'>('image');
  
  const [mainImgUrl, setMainImgUrl] = useState('');
  const [mainLeft, setMainLeft] = useState(0);
  const [mainRight, setMainRight] = useState(0);
  const [mainUp, setMainUp] = useState(0);
  const [mainDown, setMainDown] = useState(0);
  const [mainImgZoom, setMainImgZoom] = useState(0);

  const [bgImgUrl, setBgImgUrl] = useState('');
  const [bgLeft, setBgLeft] = useState(0);
  const [bgRight, setBgRight] = useState(0);
  const [bgUp, setBgUp] = useState(0);
  const [bgDown, setBgDown] = useState(0);
  const [bgImgZoom, setBgImgZoom] = useState(0);
  const [bgDimming, setBgDimming] = useState(50);
  const [bgCinematic, setBgCinematic] = useState(false);

  const [frontWaveColor, setFrontWaveColor] = useState('#00f2fe');
  const [backWaveColor, setBackWaveColor] = useState('#4facfe');
  const [editingColor, setEditingColor] = useState<'front' | 'back' | 'first' | 'second' | null>(null);

  // Waves state
  const [infillWaves, setInfillWaves] = useState(false);

  // Particles state
  const [followWaves, setFollowWaves] = useState(true);
  const [firstRowColor, setFirstRowColor] = useState('#00f2fe');
  const [secondRowColor, setSecondRowColor] = useState('#4facfe');
  const [showFollowInfo, setShowFollowInfo] = useState(false);

  // Error state
  const [audioError, setAudioError] = useState('');
  const [mainImgError, setMainImgError] = useState('');
  const [bgImgError, setBgImgError] = useState('');

  // Export state
  const [isRecording, setIsRecording] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFps, setExportFps] = useState(60);
  const [exportBitrate, setExportBitrate] = useState(18); // Mbps
  const [exportCodec, setExportCodec] = useState('video/webm;codecs=vp9,opus');

  // Audio link state
  const [audioLink, setAudioLink] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const audioCallbackRef = (node: HTMLAudioElement | null) => {
    audioRef.current = node;
    setAudioElement(node);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const oldUrl = fileUrl;
      const url = URL.createObjectURL(selected);
      setFile(selected);
      setFileUrl(url);
      setIsPlaying(true);
      setShowPlayer(true);
      setIsRecording(false);
      if (oldUrl && !oldUrl.startsWith('http')) {
        setTimeout(() => URL.revokeObjectURL(oldUrl), 100);
      }
    }
  };

  const handleLinkSubmit = () => {
    if (!audioLink) return;
    if (!audioLink.startsWith('https://')) {
      setAudioError('You should paste the link to your file here https://');
      return;
    }
    setAudioError('');
    const oldUrl = fileUrl;
    setFile({ name: audioLink.split('/').pop() || 'Remote Track' } as File);
    setFileUrl(audioLink);
    setIsPlaying(true);
    setShowPlayer(true);
    setIsRecording(false);
    if (oldUrl && !oldUrl.startsWith('http')) {
      setTimeout(() => URL.revokeObjectURL(oldUrl), 100);
    }
  };

  const resetTrack = () => {
    setIsPlaying(false);
    setIsRecording(false);
    const oldUrl = fileUrl;
    setFile(null);
    setFileUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (oldUrl && !oldUrl.startsWith('http')) {
      setTimeout(() => URL.revokeObjectURL(oldUrl), 100);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, fileUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && fileUrl) {
      setShowPlayer(prev => !prev);
      if (showCustomization) {
        setShowCustomization(false);
      }
    }
  };

  const startRecording = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsRecording(true);
      setIsPlaying(true);
    }
  };

  const handleRecordingComplete = (blob: Blob) => {
    setIsRecording(false);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let ext = 'webm';
    if (blob.type.includes('mp4')) ext = 'mp4';
    a.download = `${file?.name.replace(/\.[^/.]+$/, "") || "export"}_visualizer.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div 
      className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden relative flex flex-col items-center justify-center"
      onClick={handleBackgroundClick}
    >
      
      {/* Background Visualizer Layer */}
      {fileUrl && (
        <div className="absolute inset-0 pointer-events-none z-10" onClick={handleBackgroundClick}>
          <AudioVisualizer 
            audioElement={audioElement} 
            mainImgUrl={mainImgUrl}
            mainImgOffsetX={mainRight - mainLeft}
            mainImgOffsetY={mainDown - mainUp}
            bgImgUrl={bgImgUrl}
            bgOffsetX={bgRight - bgLeft}
            bgOffsetY={bgDown - bgUp}
            bgDimming={bgDimming}
            bgCinematic={bgCinematic}
            mainImgZoom={mainImgZoom}
            bgImgZoom={bgImgZoom}
            isRecording={isRecording}
            exportSettings={{ fps: exportFps, bitrate: exportBitrate * 1000000, mimeType: exportCodec }}
            onRecordingComplete={handleRecordingComplete}
            frontWaveColor={frontWaveColor}
            backWaveColor={backWaveColor}
            infillWaves={infillWaves}
            followWaves={followWaves}
            firstRowColor={firstRowColor}
            secondRowColor={secondRowColor}
            onMainImgError={() => setMainImgError("File not found :(\nCheck your image file and insert it again.")}
            onBgImgError={() => setBgImgError("File not found :(\nCheck your image file and insert it again.")}
          />
        </div>
      )}

      {/* Hidden Audio Element */}
      {fileUrl && (
        <audio
          ref={audioCallbackRef}
          src={fileUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            setIsRecording(false);
          }}
          onError={() => {
            resetTrack();
            setAudioError("File not found :(\nCheck your file and paste the correct link.");
          }}
          crossOrigin="anonymous"
          className="hidden"
          key={fileUrl}
        />
      )}

      {/* Export Button (Top Left) */}
      <button
        onClick={() => setShowExportModal(true)}
        title="Export Video"
        disabled={isRecording}
        className={cn(
          "absolute top-6 left-6 z-40 p-3 rounded-full backdrop-blur-md transition-all duration-500 shadow-lg border border-white/10",
          isRecording ? "text-[#00f2fe] bg-white/10 animate-pulse" : "text-white bg-white/10 hover:bg-white/20",
          (showPlayer && fileUrl) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <Download className="w-5 h-5" />
      </button>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
          <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 w-[400px] animate-in fade-in zoom-in-95 duration-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-medium text-white mb-6">Export to video file</h2>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Frames Per Second (FPS)</label>
                <select value={exportFps} onChange={e => setExportFps(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f2fe] appearance-none cursor-pointer">
                  <option className="bg-[#111116] text-white" value={30}>30 FPS</option>
                  <option className="bg-[#111116] text-white" value={60}>60 FPS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Video Bitrate (Mbps)</label>
                <input type="range" min={1} max={50} value={exportBitrate} onChange={e => setExportBitrate(Number(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f2fe] cursor-pointer" />
                <div className="text-right text-xs text-gray-400 mt-2 font-mono">{exportBitrate} Mbps</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Codec / Format</label>
                <select value={exportCodec} onChange={e => setExportCodec(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f2fe] appearance-none cursor-pointer">
                  <option className="bg-[#111116] text-white" value="video/webm;codecs=vp9,opus">WebM (VP9) - Recommended</option>
                  <option className="bg-[#111116] text-white" value="video/webm;codecs=h264,opus">WebM (H.264)</option>
                  <option className="bg-[#111116] text-white" value="video/mp4">MP4 (If supported)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowExportModal(false);
                  startRecording();
                }} 
                className="px-6 py-2 rounded-lg text-sm font-medium bg-[#00f2fe] text-black hover:bg-[#4facfe] transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customization Toggle Button */}
      <button
        className={cn(
          "absolute top-6 right-6 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-500 text-white shadow-lg",
          (showPlayer && fileUrl) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
        onClick={(e) => { e.stopPropagation(); setShowCustomization(!showCustomization); }}
      >
        <Edit2 className="w-5 h-5" />
      </button>

      {/* Customization Panel */}
      <div 
        className={cn(
          "absolute right-6 top-20 w-80 max-h-[calc(100vh-140px)] overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 z-40 transition-all duration-500 transform custom-scrollbar",
          (showPlayer && showCustomization && fileUrl) ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
          <button onClick={() => setCustomTab('image')} className={cn("pb-2 -mb-[9px] border-b-2 transition-colors font-medium text-sm", customTab === 'image' ? "border-[#00f2fe] text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>Image</button>
          <button onClick={() => setCustomTab('waves')} className={cn("pb-2 -mb-[9px] border-b-2 transition-colors font-medium text-sm", customTab === 'waves' ? "border-[#00f2fe] text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>Waves</button>
          <button onClick={() => setCustomTab('particles')} className={cn("pb-2 -mb-[9px] border-b-2 transition-colors font-medium text-sm", customTab === 'particles' ? "border-[#00f2fe] text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>Particles</button>
        </div>
        
        {customTab === 'image' && (
          <div className="animate-in fade-in duration-300">
            {/* Main Image Settings */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Insert the link to the main image here</label>
                <input 
                  type="text" 
                  placeholder="Main img URL"
                  value={mainImgUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMainImgUrl(val);
                    if (val && !val.startsWith('https://')) {
                      setMainImgError('You need to insert the correct link to the image here.');
                    } else {
                      setMainImgError('');
                    }
                  }}
                  className={cn(
                    "w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none",
                    mainImgError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00f2fe]"
                  )}
                />
                {mainImgError && <p className="text-xs text-red-500 mt-1 whitespace-pre-line">{mainImgError}</p>}
              </div>
              
              <div className="pt-2">
                {mainImgUrl && !mainImgError && (
                  <>
                    <ControlSlider label="Left" value={mainLeft} onChange={setMainLeft} max={500} />
                    <ControlSlider label="Right" value={mainRight} onChange={setMainRight} max={500} />
                    <ControlSlider label="Up" value={mainUp} onChange={setMainUp} max={500} />
                    <ControlSlider label="Down" value={mainDown} onChange={setMainDown} max={500} />
                    <ControlSlider label="Increase and decrease" value={mainImgZoom} onChange={setMainImgZoom} min={-100} max={100} />
                  </>
                )}
              </div>
            </div>

            <hr className="border-white/10 mb-8" />

            {/* Background Image Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Insert the link to the background image here</label>
                <input 
                  type="text" 
                  placeholder="Background img URL"
                  value={bgImgUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBgImgUrl(val);
                    if (val && !val.startsWith('https://')) {
                      setBgImgError('You need to insert the correct link to the image here.');
                    } else {
                      setBgImgError('');
                    }
                  }}
                  className={cn(
                    "w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none",
                    bgImgError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00f2fe]"
                  )}
                />
                {bgImgError && <p className="text-xs text-red-500 mt-1 whitespace-pre-line">{bgImgError}</p>}
              </div>
              
              <div className="pt-2">
                {bgImgUrl && !bgImgError && (
                  <>
                    <ControlSlider label="Left" value={bgLeft} onChange={setBgLeft} max={500} />
                    <ControlSlider label="Right" value={bgRight} onChange={setBgRight} max={500} />
                    <ControlSlider label="Up" value={bgUp} onChange={setBgUp} max={500} />
                    <ControlSlider label="Down" value={bgDown} onChange={setBgDown} max={500} />
                    <ControlSlider label="Increase and decrease" value={bgImgZoom} onChange={setBgImgZoom} min={-100} max={100} />
                    
                    <div className="mt-6">
                      <ControlSlider label="Dimming Level (%)" value={bgDimming} onChange={setBgDimming} max={100} />
                    </div>

                    <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={bgCinematic}
                          onChange={(e) => setBgCinematic(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "block w-10 h-6 rounded-full transition-colors",
                          bgCinematic ? "bg-[#00f2fe]" : "bg-gray-600"
                        )}></div>
                        <div className={cn(
                          "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform",
                          bgCinematic ? "transform translate-x-4" : ""
                        )}></div>
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Cinematic Blur</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {customTab === 'waves' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            {/* Infill between waves */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-sm font-medium text-gray-200">Infill between waves</span>
              <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={infillWaves}
                  onChange={(e) => setInfillWaves(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#00f2fe] cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => setEditingColor(editingColor === 'front' ? null : 'front')}
                className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors border border-white/5"
              >
                <span className="text-sm font-medium text-gray-200">front wave color</span>
                <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: frontWaveColor }} />
              </button>
              {editingColor === 'front' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <ColorPicker color={frontWaveColor} onChange={setFrontWaveColor} />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => setEditingColor(editingColor === 'back' ? null : 'back')}
                className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors border border-white/5"
              >
                <span className="text-sm font-medium text-gray-200">back wave color</span>
                <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: backWaveColor }} />
              </button>
              {editingColor === 'back' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <ColorPicker color={backWaveColor} onChange={setBackWaveColor} />
                </div>
              )}
            </div>
          </div>
        )}

        {customTab === 'particles' && (
          <div className="animate-in fade-in duration-300 space-y-4" onClick={() => setShowFollowInfo(false)}>
            {/* Follow the Waves */}
            <div className="relative">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">Follow the Waves</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFollowInfo(v => !v); }}
                    className="w-4 h-4 rounded-full border border-gray-500 text-gray-400 text-[10px] leading-none flex items-center justify-center hover:border-white hover:text-white transition-colors"
                  >
                    i
                  </button>
                </div>

                <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={followWaves}
                    onChange={(e) => setFollowWaves(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#00f2fe] cursor-pointer"
                  />
                </label>
              </div>

              {showFollowInfo && (
                <div
                  className="absolute z-10 top-full mt-2 left-0 right-0 bg-black/90 border border-white/10 rounded-lg p-3 text-xs text-gray-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  Particles change their color according to the waves.
                </div>
              )}
            </div>

            {/* First-row particles */}
            <div className={cn("space-y-2 transition-opacity", followWaves ? "opacity-40 pointer-events-none" : "opacity-100")}>
              <button
                onClick={() => setEditingColor(editingColor === 'first' ? null : 'first')}
                disabled={followWaves}
                className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors border border-white/5 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium text-gray-200">First-row particles</span>
                <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: firstRowColor }} />
              </button>
              {editingColor === 'first' && !followWaves && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <ColorPicker color={firstRowColor} onChange={setFirstRowColor} />
                </div>
              )}
            </div>

            {/* Second-row particles */}
            <div className={cn("space-y-2 transition-opacity", followWaves ? "opacity-40 pointer-events-none" : "opacity-100")}>
              <button
                onClick={() => setEditingColor(editingColor === 'second' ? null : 'second')}
                disabled={followWaves}
                className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors border border-white/5 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium text-gray-200">Second-row particles</span>
                <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: secondRowColor }} />
              </button>
              {editingColor === 'second' && !followWaves && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <ColorPicker color={secondRowColor} onChange={setSecondRowColor} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UI Overlay */}
      {!fileUrl && (
        <div className="z-10 flex flex-col items-center justify-center w-full max-w-xl p-8">
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,242,254,0.3)] mb-8">
              <Music className="w-10 h-10 text-[#0a0a0f]" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-light tracking-tight">Audio Visualizer</h1>
              <p className="text-gray-400 text-lg font-light">
                Avee-style circular reactive spectrum.
              </p>
            </div>

            <div className="mt-8 space-y-4 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full relative group overflow-hidden rounded-full bg-white text-black px-8 py-4 font-medium tracking-wide hover:scale-105 transition-all duration-300 flex items-center justify-center"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#00f2fe] to-[#4facfe] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                  <Upload className="w-5 h-5" />
                  Select Audio File
                </span>
              </button>

              <div className="relative group flex items-center mt-4">
                <input
                  type="text"
                  placeholder="Paste the link to the track here..."
                  value={audioLink}
                  onChange={(e) => {
                    setAudioLink(e.target.value);
                    if (audioError) setAudioError('');
                  }}
                  className={cn(
                    "w-full bg-white/5 border rounded-l-full px-6 py-4 text-sm text-white focus:outline-none placeholder:text-gray-500",
                    audioError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00f2fe]"
                  )}
                />
                <button 
                  onClick={handleLinkSubmit}
                  className="bg-[#00f2fe] text-black px-8 py-4 rounded-r-full font-medium hover:bg-[#4facfe] transition-colors border border-transparent"
                >
                  Play
                </button>
              </div>
              {audioError ? (
                <p className="text-xs text-red-500 text-left px-4 mt-2 whitespace-pre-line">{audioError}</p>
              ) : (
                <p className="text-xs text-gray-500 text-left px-4 mt-2">*Support for Cloudinary links</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Bottom Bar */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-between transition-transform duration-500 z-30",
          showPlayer && fileUrl ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Metadata */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          <div className="w-14 h-14 rounded bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/5 relative overflow-hidden">
             {mainImgUrl ? (
               <img src={mainImgUrl} alt="Cover" className="w-full h-full object-cover" />
             ) : (
               <Music className="w-6 h-6 text-gray-400" />
             )}
             {isRecording && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-5 h-5 text-[#00f2fe] animate-spin mb-1" />
                  <span className="text-[9px] font-bold text-[#00f2fe] uppercase tracking-wider">Rec</span>
                </div>
             )}
          </div>
          <div className="flex flex-col truncate text-left">
            <span className="font-medium text-white text-sm truncate">
              {file?.name.replace(/\.[^/.]+$/, "") || "Unknown Track"}
            </span>
            <span className="text-xs text-gray-400 mt-1 truncate">
              {isRecording ? <span className="text-[#00f2fe] animate-pulse">Exporting video...</span> : "Local Audio"}
            </span>
          </div>
        </div>
        
        {/* Center: Controls & Progress */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-8">
          <div className="flex items-center gap-6 mb-2">
            <button
              onClick={() => {
                if (isRecording) setIsRecording(false);
                setIsPlaying(!isPlaying);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              disabled={isRecording}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 translate-x-[1px]" fill="currentColor" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-full text-xs text-gray-400 font-medium">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                if (isRecording) return;
                handleSeek(e);
              }}
              className="flex-1 h-1 bg-gray-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Actions */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
          <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-1 bg-gray-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform cursor-pointer"
          />
          <div className="w-px h-6 bg-white/10 mx-2"></div>

          <button
            onClick={resetTrack}
            title="Change Track"
            disabled={isRecording}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/mpeg, audio/wav, audio/ogg, audio/*"
        className="hidden"
      />
    </div>
  );
}
