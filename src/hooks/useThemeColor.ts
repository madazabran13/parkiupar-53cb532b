import { useEffect, useState, useCallback } from 'react';
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

function hslToHex(h: number, s: number, l: number): string {
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

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
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

interface ThemeColorData {
  preset?: string;
  hue: number;
  saturation: number;
  lightness: number;
}

function applyThemeColor(hue: number, sat: number, light: number) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  // Light mode primary
  const lightPrimary = `${hue} ${sat}% ${light}%`;
  // Dark mode: slightly brighter
  const darkPrimary = `${hue} ${Math.min(sat + 8, 100)}% ${Math.min(light + 7, 70)}%`;

  const primary = isDark ? darkPrimary : lightPrimary;

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-ring', primary);
}

const DEFAULT: ThemeColorData = { preset: 'blue', hue: 221, saturation: 83, lightness: 53 };

export function useThemeColor() {
  const { user } = useAuth();
  const [colorData, setColorData] = useState<ThemeColorData>(DEFAULT);

  // Load saved color on mount/user change
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(getStorageKey(user.id));
      if (saved) {
        const parsed = JSON.parse(saved) as ThemeColorData;
        setColorData(parsed);
        applyThemeColor(parsed.hue, parsed.saturation, parsed.lightness);
      } else {
        applyThemeColor(DEFAULT.hue, DEFAULT.saturation, DEFAULT.lightness);
      }
    } catch {
      applyThemeColor(DEFAULT.hue, DEFAULT.saturation, DEFAULT.lightness);
    }
  }, [user?.id]);

  // Re-apply on theme (dark/light) toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyThemeColor(colorData.hue, colorData.saturation, colorData.lightness);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [colorData]);

  const setColor = useCallback((data: ThemeColorData) => {
    if (!user?.id) return;
    setColorData(data);
    applyThemeColor(data.hue, data.saturation, data.lightness);
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(data));
  }, [user?.id]);

  const selectPreset = useCallback((presetName: string) => {
    const preset = COLOR_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setColor({ preset: preset.name, hue: preset.hue, saturation: preset.saturation, lightness: preset.lightness });
    }
  }, [setColor]);

  const selectCustomHex = useCallback((hex: string) => {
    const hsl = hexToHsl(hex);
    if (hsl) {
      setColor({ preset: undefined, hue: hsl.h, saturation: hsl.s, lightness: hsl.l });
    }
  }, [setColor]);

  const currentHex = hslToHex(colorData.hue, colorData.saturation, colorData.lightness);

  return {
    colorData,
    currentHex,
    selectPreset,
    selectCustomHex,
    presets: COLOR_PRESETS,
  };
}
