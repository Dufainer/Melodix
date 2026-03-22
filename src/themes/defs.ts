export type TrackLayout = 'blame' | 'sakura' | 'vaporwave' | 'terminal' | 'minimal' | 'tactical' | 'grimoire' | 'rows'

export interface ThemeDef {
  id: string
  name: string
  emoji: string
  tag: string
  font: string
  trackLayout: TrackLayout
  preview: { bg: string; surface: string; accent: string }
}

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '🔮',
    tag: 'Dark · Purple · Glass',
    font: '"Inter", system-ui, sans-serif',
    trackLayout: 'rows',
    preview: { bg: '#0a0a0f', surface: '#111118', accent: '#7c5cfc' },
  },
  {
    id: 'goth',
    name: 'Goth',
    emoji: '🖤',
    tag: 'Crimson · Shadow · Victorian',
    font: '"Cinzel", Georgia, serif',
    trackLayout: 'grimoire',
    preview: { bg: '#060308', surface: '#0E0812', accent: '#9B1B3A' },
  },
  {
    id: 'rambo',
    name: 'Rambo',
    emoji: '🎗️',
    tag: 'Jungle · Military · Survival',
    font: '"Rajdhani", system-ui, sans-serif',
    trackLayout: 'tactical',
    preview: { bg: '#040C03', surface: '#0A1508', accent: '#8B2020' },
  },
  {
    id: 'blame',
    name: 'Blame!',
    emoji: '◼',
    tag: 'Megastructure · Ink · GBE',
    font: '"Space Mono", monospace',
    trackLayout: 'blame',
    preview: { bg: '#020204', surface: '#07090F', accent: '#4EADC8' },
  },
  {
    id: 'balmain',
    name: 'Balmain',
    emoji: '✦',
    tag: 'Black · Gold · Luxury',
    font: '"Cormorant Garamond", Georgia, serif',
    trackLayout: 'rows',
    preview: { bg: '#080603', surface: '#110e0a', accent: '#C9A84C' },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '⚡',
    tag: 'Black · Neon · Sharp',
    font: '"Rajdhani", system-ui, sans-serif',
    trackLayout: 'terminal',
    preview: { bg: '#060608', surface: '#0c0c10', accent: '#e8f011' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    tag: 'Deep blue · Cyan · Clean',
    font: '"DM Sans", system-ui, sans-serif',
    trackLayout: 'rows',
    preview: { bg: '#050d1a', surface: '#0a1628', accent: '#22d3ee' },
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    emoji: '🌺',
    tag: 'Purple · Magenta · Retro',
    font: '"Outfit", system-ui, sans-serif',
    trackLayout: 'vaporwave',
    preview: { bg: '#0f0618', surface: '#190c28', accent: '#ff2d9b' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '◾',
    tag: 'Black · White · Flat',
    font: '"DM Sans", system-ui, sans-serif',
    trackLayout: 'minimal',
    preview: { bg: '#0c0c0c', surface: '#141414', accent: '#c8c8c8' },
  },
  {
    id: 'anime',
    name: 'Sakura',
    emoji: '🌸',
    tag: 'Navy · Pink · Kawaii',
    font: '"Nunito", system-ui, sans-serif',
    trackLayout: 'sakura',
    preview: { bg: '#0d0b1a', surface: '#160d2e', accent: '#ff6eb4' },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    tag: 'Dark green · Lime · Earthy',
    font: '"DM Sans", system-ui, sans-serif',
    trackLayout: 'rows',
    preview: { bg: '#050f08', surface: '#0a1810', accent: '#4ade80' },
  },
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    tag: 'Warm dark · Orange · Cozy',
    font: '"Lato", system-ui, sans-serif',
    trackLayout: 'rows',
    preview: { bg: '#100806', surface: '#1a100a', accent: '#f97316' },
  },
]
