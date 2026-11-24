import type { AnnotationColor, TagColor } from '@/types';

export interface ColorMeta {
  id: TagColor;
  hex: string;
  bg: string;
  border: string;
  text: string;
}

export const TAG_COLORS: Record<TagColor, ColorMeta> = {
  indigo: {
    id: 'indigo',
    hex: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.14)',
    border: 'rgba(99, 102, 241, 0.35)',
    text: '#6366f1',
  },
  emerald: {
    id: 'emerald',
    hex: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: '#10b981',
  },
  amber: {
    id: 'amber',
    hex: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.38)',
    text: '#d97706',
  },
  rose: {
    id: 'rose',
    hex: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.35)',
    text: '#e11d48',
  },
  blue: {
    id: 'blue',
    hex: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.14)',
    border: 'rgba(59, 130, 246, 0.35)',
    text: '#3b82f6',
  },
  violet: {
    id: 'violet',
    hex: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.35)',
    text: '#8b5cf6',
  },
  orange: {
    id: 'orange',
    hex: '#f97316',
    bg: 'rgba(249, 115, 22, 0.14)',
    border: 'rgba(249, 115, 22, 0.35)',
    text: '#ea580c',
  },
  teal: {
    id: 'teal',
    hex: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.14)',
    border: 'rgba(20, 184, 166, 0.35)',
    text: '#0d9488',
  },
};

export const TAG_COLOR_ORDER: TagColor[] = [
  'indigo',
  'emerald',
  'amber',
  'rose',
  'blue',
  'violet',
  'orange',
  'teal',
];

export interface AnnotationColorMeta {
  id: AnnotationColor;
  hex: string;
  /** Translucent fill for PDF / Fluid Text highlight */
  fill: string;
  fillStrong: string;
  border: string;
  text: string;
}

export const ANNOTATION_COLORS: Record<AnnotationColor, AnnotationColorMeta> = {
  amber: {
    id: 'amber',
    hex: '#f59e0b',
    fill: 'rgba(250, 204, 21, 0.36)',
    fillStrong: 'rgba(245, 158, 11, 0.56)',
    border: 'rgba(217, 119, 6, 0.72)',
    text: '#d97706',
  },
  emerald: {
    id: 'emerald',
    hex: '#10b981',
    fill: 'rgba(52, 211, 153, 0.34)',
    fillStrong: 'rgba(16, 185, 129, 0.54)',
    border: 'rgba(5, 150, 105, 0.72)',
    text: '#059669',
  },
  indigo: {
    id: 'indigo',
    hex: '#6366f1',
    fill: 'rgba(129, 140, 248, 0.32)',
    fillStrong: 'rgba(99, 102, 241, 0.52)',
    border: 'rgba(79, 70, 229, 0.72)',
    text: '#4f46e5',
  },
  rose: {
    id: 'rose',
    hex: '#f43f5e',
    fill: 'rgba(251, 113, 133, 0.34)',
    fillStrong: 'rgba(244, 63, 94, 0.54)',
    border: 'rgba(225, 29, 72, 0.72)',
    text: '#e11d48',
  },
};

export const ANNOTATION_COLOR_ORDER: AnnotationColor[] = ['amber', 'emerald', 'indigo', 'rose'];

/** Retorna uma cor determinística para tags legadas que ainda não tinham cor explícita */
export function resolveTagColor(tag: string, tagColors?: Record<string, TagColor>): TagColor {
  if (tagColors && tagColors[tag] && TAG_COLORS[tagColors[tag]]) {
    return tagColors[tag];
  }
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLOR_ORDER[Math.abs(hash) % TAG_COLOR_ORDER.length] ?? 'indigo';
}
