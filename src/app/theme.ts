import type { CSSProperties, ReactNode } from 'react'
import { createElement, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark'
export type ThemeBackground = 'none' | 'paper' | 'mesh' | 'aurora' | 'grid'

export interface ThemeConfig {
  mode: ThemeMode
  navColor: string
  backgroundColor: string
  accentColor: string
  backgroundStyle: ThemeBackground
  reduceMotion: boolean
}

export const defaultTheme: ThemeConfig = {
  mode: 'light',
  navColor: '#f1ecdf',
  backgroundColor: '#f4efe4',
  accentColor: '#e17a62',
  backgroundStyle: 'paper',
  reduceMotion: false,
}

export const themePresets: Array<ThemeConfig & { id: string; name: string; description: string }> = [
  { id: 'paper', name: 'Paper & ink', description: 'The original warm paper palette.', ...defaultTheme },
  { id: 'midnight', name: 'Midnight ledger', description: 'Deep navy surfaces with a bright coral signal.', mode: 'dark', navColor: '#111927', backgroundColor: '#0b1220', accentColor: '#f08a72', backgroundStyle: 'aurora', reduceMotion: false },
  { id: 'citrus', name: 'Citrus receipt', description: 'A sunny yellow accent with a soft cream canvas.', mode: 'light', navColor: '#fff3c9', backgroundColor: '#fffaf0', accentColor: '#d98b24', backgroundStyle: 'mesh', reduceMotion: false },
  { id: 'evergreen', name: 'Evergreen balance', description: 'A calm green workspace for steady progress.', mode: 'dark', navColor: '#112820', backgroundColor: '#0e1c18', accentColor: '#7bc5a5', backgroundStyle: 'mesh', reduceMotion: false },
  { id: 'violet', name: 'Violet focus', description: 'A cooler, more expressive planning surface.', mode: 'light', navColor: '#eee8ff', backgroundColor: '#f8f6ff', accentColor: '#7957d5', backgroundStyle: 'grid', reduceMotion: false },
]

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

export const normalizeTheme = (value?: Partial<ThemeConfig> | null): ThemeConfig => ({
  ...defaultTheme,
  ...(value ?? {}),
  mode: value?.mode === 'dark' ? 'dark' : 'light',
  navColor: isHex(value?.navColor) ? value.navColor : defaultTheme.navColor,
  backgroundColor: isHex(value?.backgroundColor) ? value.backgroundColor : defaultTheme.backgroundColor,
  accentColor: isHex(value?.accentColor) ? value.accentColor : defaultTheme.accentColor,
  backgroundStyle: ['none', 'paper', 'mesh', 'aurora', 'grid'].includes(value?.backgroundStyle ?? '') ? value!.backgroundStyle! : defaultTheme.backgroundStyle,
  reduceMotion: value?.reduceMotion === true,
})

const luminance = (hex: string) => {
  const rgb = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

const contrastColor = (hex: string) => luminance(hex) > 0.48 ? '#151b27' : '#fffdf8'

export const themeCssVars = (theme: ThemeConfig): CSSProperties => {
  const ink = theme.mode === 'dark' ? '#f4f1e8' : '#151b27'
  const paper = theme.mode === 'dark' ? '#182334' : '#fffdf8'
  const line = theme.mode === 'dark' ? '#344154' : '#d9d2c6'
  const muted = theme.mode === 'dark' ? '#a8b0b7' : '#6d6b68'
  const navInk = contrastColor(theme.navColor)
  return {
    '--ink': ink,
    '--paper': paper,
    '--line': line,
    '--muted': muted,
    '--page-bg': theme.backgroundColor,
    '--nav-bg': theme.navColor,
    '--nav-ink': navInk,
    '--nav-muted': navInk === '#151b27' ? '#62605d' : '#c0c5c8',
    '--accent': theme.accentColor,
    '--coral': theme.accentColor,
    '--accent-contrast': contrastColor(theme.accentColor),
    '--gold': theme.mode === 'dark' ? '#d9ad5f' : '#e4b86c',
    '--shadow-color': theme.mode === 'dark' ? '#000000' : ink,
    '--motion': theme.reduceMotion ? '0s' : '18s',
    colorScheme: theme.mode,
  } as CSSProperties
}

export const ThemeRoot = ({ theme, children }: { theme: ThemeConfig; children: ReactNode }) => {
  const normalized = normalizeTheme(theme)
  useEffect(() => {
    document.documentElement.style.colorScheme = normalized.mode
  }, [normalized.mode])
  return createElement('div', { className: `theme-root theme-${normalized.mode} background-${normalized.backgroundStyle} ${normalized.reduceMotion ? 'reduce-motion' : ''}`, style: themeCssVars(normalized) }, children)
}
