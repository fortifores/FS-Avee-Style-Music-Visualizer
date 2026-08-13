import React, { useState, useEffect, useRef } from 'react';

export function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export const ColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
  const [hsl, setHsl] = useState(() => hexToHsl(color));
  const latestHsl = useRef(hsl);
  latestHsl.current = hsl;
  
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    const newHsl = hexToHsl(color);
    if (Math.abs(newHsl.h - hsl.h) > 1 || Math.abs(newHsl.s - hsl.s) > 1 || Math.abs(newHsl.l - hsl.l) > 1) {
       setHsl(newHsl);
    }
  }, [color]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value;
    setHexInput(value);

    const isValid = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value);
    if (isValid) {
      const newHsl = hexToHsl(value);
      setHsl(newHsl);
      onChange(value);
    }
  };

  const handleWheelUpdate = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    
    let h = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    
    const radius = rect.width / 2;
    let distance = Math.sqrt(x*x + y*y);
    if (distance > radius) distance = radius;
    
    let s = (distance / radius) * 100;
    
    const current = latestHsl.current;
    const next = { ...current, h, s };
    setHsl(next);
    onChange(hslToHex(next.h, next.s, next.l));
  };

  const handleLightnessUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const l = Number(e.target.value);
    const current = latestHsl.current;
    const next = { ...current, l };
    setHsl(next);
    onChange(hslToHex(next.h, next.s, next.l));
  };

  const wheelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleUp = () => { isDragging.current = false; };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging.current) {
        handleWheelUpdate(e);
      }
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    handleWheelUpdate(e);
  };

  const angleRad = (hsl.h - 90) * Math.PI / 180;
  const distance = (hsl.s / 100) * 100; // 0 to 100 max
  const thumbX = 100 + Math.cos(angleRad) * distance;
  const thumbY = 100 + Math.sin(angleRad) * distance;

  return (
    <div className="flex flex-col items-center gap-6 py-4 bg-black/40 rounded-xl p-4 border border-white/5 mt-2">
      <div 
        ref={wheelRef}
        onMouseDown={handleDown}
        onTouchStart={handleDown}
        className="relative w-[200px] h-[200px] rounded-full cursor-pointer shadow-lg border border-white/10"
        style={{
          background: `
            radial-gradient(circle closest-side, #ffffff 0%, transparent 100%),
            conic-gradient(from 90deg in hsl, red, yellow, lime, aqua, blue, fuchsia, red)
          `
        }}
      >
        <div 
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{
            left: `${thumbX}px`,
            top: `${thumbY}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: hslToHex(hsl.h, hsl.s, 50)
          }}
        />
      </div>
      
      <div className="w-full px-2">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={hsl.l}
          onChange={handleLightnessUpdate}
          className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
          style={{
            background: `linear-gradient(to right, #000000, ${hslToHex(hsl.h, hsl.s, 50)}, #ffffff)`
          }}
        />
      </div>

      <div className="w-full px-2 flex items-center gap-2">
        <span className="text-gray-400 text-sm font-mono">#</span>
        <input
          type="text"
          value={hexInput.replace('#', '')}
          onChange={(e) => handleHexInputChange({ ...e, target: { ...e.target, value: '#' + e.target.value } } as any)}
          maxLength={6}
          placeholder="ff6928"
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono uppercase outline-none focus:border-white/30"
        />
      </div>
    </div>
  );
};
