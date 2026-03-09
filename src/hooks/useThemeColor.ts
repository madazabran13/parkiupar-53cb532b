import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ThemeColorPreset {
  name: string;
  label: string;
  hue: number;
  saturation: number;
  lightness: number;
}

export const COLOR_PRESETS: ThemeColorPreset[] = [
  { name: 'blue', label: 'Azul', hue: 221, saturation: 83, lightness: 53 },
  { name: 'red', label: 'Rojo', hue: 0, saturation: 72, lightness: 51 },
  { name: 'green', label: 'Verde', hue: 142, saturation: 71, lightness: 45 },
  { name: 'purple', label: 'Morado', hue: 262, saturation: 83, lightness: 58 },
  { name: 'cyan', label: 'Cian', hue: 189, saturation: 94, lightness: 43 },
  { name: 'orange', label: 'Naranja', hue: 25, saturation: 95, lightness: 53 },
];

const STORAGE_KEY_PREFIX = 'theme-color-';

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export interface ThemeColorData {
  preset?: string;
  hue: number;
  saturation: number;
  lightness: number;
}

function applyThemeColor(hue: number, sat: number, light: number) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  // Light mode
  const lightPrimary = `${hue} ${sat}% ${light}%`;
  // Dark mode: increase lightness, boost saturation for vibrancy
  const darkLight = Math.min(light + 12, 72);
  const darkSat = Math.min(sat + 10, 100);
  const darkPrimary = `${hue} ${darkSat}% ${darkLight}%`;

  const primary = isDark ? darkPrimary : lightPrimary;
  const primaryFg = isDark ? `${hue} 0% 100%` : `${hue} 0% 98%`;

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', primaryFg);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-primary-foreground', primaryFg);
  root.style.setProperty('--sidebar-ring', primary);
}

const DEFAULT: ThemeColorData = { preset: 'blue', hue: 221, saturation: 83, lightness: 53 };

export function useThemeColor() {
  const { user } = useAuth();
  // Saved = what's persisted in localStorage
  const [savedData, setSavedData] = useState<ThemeColorData>(DEFAULT);
  // Preview = what's currently shown (may differ from saved)
  const [previewData, setPreviewData] = useState<ThemeColorData>(DEFAULT);
  const [isDirty, setIsDirty] = useState(false);

  // Load saved color on mount/user change
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(getStorageKey(user.id));
      if (saved) {
        const parsed = JSON.parse(saved) as ThemeColorData;
        setSavedData(parsed);
        setPreviewData(parsed);
        applyThemeColor(parsed.hue, parsed.saturation, parsed.lightness);
      } else {
        setSavedData(DEFAULT);
        setPreviewData(DEFAULT);
        applyThemeColor(DEFAULT.hue, DEFAULT.saturation, DEFAULT.lightness);
      }
      setIsDirty(false);
    } catch {
      applyThemeColor(DEFAULT.hue, DEFAULT.saturation, DEFAULT.lightness);
    }
  }, [user?.id]);

  // Re-apply on theme (dark/light) toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyThemeColor(previewData.hue, previewData.saturation, previewData.lightness);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [previewData]);

  // Preview a color (apply visually but don't save)
  const preview = useCallback((data: ThemeColorData) => {
    setPreviewData(data);
    setIsDirty(true);
    applyThemeColor(data.hue, data.saturation, data.lightness);
  }, []);

  const previewPreset = useCallback((presetName: string) => {
    const preset = COLOR_PRESETS.find(p => p.name === presetName);
    if (preset) {
      preview({ preset: preset.name, hue: preset.hue, saturation: preset.saturation, lightness: preset.lightness });
    }
  }, [preview]);

  const previewCustomHex = useCallback((hex: string) => {
    const hsl = hexToHsl(hex);
    if (hsl) {
      preview({ preset: undefined, hue: hsl.h, saturation: hsl.s, lightness: hsl.l });
    }
  }, [preview]);

  // Save current preview to localStorage
  const save = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(previewData));
    setSavedData(previewData);
    setIsDirty(false);
  }, [user?.id, previewData]);

  // Revert to saved
  const revert = useCallback(() => {
    setPreviewData(savedData);
    setIsDirty(false);
    applyThemeColor(savedData.hue, savedData.saturation, savedData.lightness);
  }, [savedData]);

  const currentHex = hslToHex(previewData.hue, previewData.saturation, previewData.lightness);

  return {
    colorData: previewData,
    currentHex,
    isDirty,
    previewPreset,
    previewCustomHex,
    save,
    revert,
    presets: COLOR_PRESETS,
  };
}
