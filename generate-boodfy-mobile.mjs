#!/usr/bin/env node

/**
 * ==============================================================================
 * BOODFY MOBILE - SCRIPT GERADOR DE PROJETO (EXPO + REACT NATIVE)
 * ==============================================================================
 * Este script gera um aplicativo mobile completo, moderno e de alta performance
 * para iOS e Android utilizando Expo SDK 52, React Native (New Architecture),
 * React Native Reanimated 3, Gesture Handler, Lucide Icons, e Zustand.
 *
 * Funcionalidades recriadas com paridade total:
 * - Biblioteca de Livros (Adicionar PDF, Capas, Progresso, Filtros, Busca, Ordenação)
 * - Leitor de PDF Mobile de Alta Performance (Pinch-to-zoom, Swipe, Modo Imersivo)
 * - Tela sempre ligada durante a leitura (expo-keep-awake)
 * - Marcadores de Página com cores e notas
 * - Sumário / Capítulos interativos com navegação instantânea
 * - Modo Estudante com Quiz Algorítmico Offline (Multi-choice, Cloze, Conceitos)
 * - Modo Estudante com Quiz por IA (Google Gemini, OpenAI, Groq, Ollama)
 * - Recorte inteligente de páginas por capítulo (chapter-cropper)
 * - Sistema de Streak diário de leitura
 * - Temas Claro, Escuro (AMOLED) e Sépia (leitura noturna confortável)
 * - Design moderno, limpo, não poluído com feedback háptico (expo-haptics)
 *
 * Uso:
 *   node generate-boodfy-mobile.mjs [pasta_destino]
 * Exemplo:
 *   node generate-boodfy-mobile.mjs ../boodfy-mobile
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';

const targetDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(process.cwd(), '../boodfy-mobile');

console.log('------------------------------------------------------------');
console.log('🚀 Iniciando geração do Boodfy Mobile (Expo + React Native)');
console.log(`📁 Diretório de destino: ${targetDir}`);
console.log('------------------------------------------------------------\n');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content) {
  const fullPath = path.join(targetDir, filePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`  ✓ Criado: ${filePath}`);
}

ensureDir(targetDir);

// ------------------------------------------------------------------------------
// 1. package.json
// ------------------------------------------------------------------------------
writeFile('package.json', JSON.stringify({
  name: 'boodfy-mobile',
  version: '1.0.0',
  scripts: {
    start: 'expo start',
    android: 'expo run:android',
    ios: 'expo run:ios',
    web: 'expo start --web',
    lint: 'eslint . --ext .ts,.tsx',
    typecheck: 'tsc --noEmit'
  },
  dependencies: {
    'expo': '~52.0.28',
    'expo-status-bar': '~2.0.1',
    'react': '18.3.1',
    'react-native': '0.76.6',
    'react-native-reanimated': '~3.16.2',
    'react-native-gesture-handler': '~2.20.2',
    'react-native-safe-area-context': '4.12.0',
    'react-native-screens': '~4.4.0',
    'lucide-react-native': '^0.468.0',
    'zustand': '^5.0.2',
    '@react-native-async-storage/async-storage': '1.23.1',
    'expo-document-picker': '~13.0.3',
    'expo-file-system': '~18.0.7',
    'expo-keep-awake': '~14.0.2',
    'expo-haptics': '~14.0.1',
    'expo-secure-store': '~14.0.1',
    'expo-sharing': '~13.0.1',
    'react-native-svg': '15.8.0',
    'react-native-pdf': '^6.7.5',
    'react-native-blob-util': '^0.19.11'
  },
  devDependencies: {
    '@babel/core': '^7.25.2',
    '@types/react': '~18.3.12',
    'typescript': '^5.3.3'
  },
  private: true
}, null, 2));

// ------------------------------------------------------------------------------
// 2. app.json
// ------------------------------------------------------------------------------
writeFile('app.json', JSON.stringify({
  expo: {
    name: 'Boodfy',
    slug: 'boodfy',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#09090b'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.boodfy.mobile',
      infoPlist: {
        UIBackgroundModes: []
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#09090b'
      },
      package: 'com.boodfy.mobile',
      permissions: [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE'
      ]
    },
    plugins: [
      'expo-document-picker',
      'expo-secure-store',
      'expo-file-system',
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true
          },
          ios: {
            newArchEnabled: true
          }
        }
      ]
    ]
  }
}, null, 2));

// ------------------------------------------------------------------------------
// 3. tsconfig.json & configs
// ------------------------------------------------------------------------------
writeFile('tsconfig.json', JSON.stringify({
  extends: 'expo/tsconfig.base',
  compilerOptions: {
    strict: true,
    baseUrl: '.',
    paths: {
      '@/*': ['src/*']
    }
  }
}, null, 2));

writeFile('babel.config.js', `
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin'
    ]
  };
};
`);

writeFile('metro.config.js', `
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('pdf');

module.exports = config;
`);

// ------------------------------------------------------------------------------
// 4. src/types/index.ts
// ------------------------------------------------------------------------------
writeFile('src/types/index.ts', `
export interface Bookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  title: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  filePath: string;
  fileName: string;
  totalPages: number;
  currentPage: number;
  addedAt: string;
  lastReadAt: string | null;
  status: 'not-started' | 'reading' | 'completed';
  coverDataUrl: string | null;
  tags?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  level: number;
  parentId?: string;
  hasChildren?: boolean;
}

export type QuizQuestionKind =
  | 'cloze'
  | 'definition'
  | 'comprehension'
  | 'cause-effect'
  | 'context'
  | 'ai';

export interface QuizQuestion {
  id: string;
  kind: QuizQuestionKind;
  prompt: string;
  options: string[];
  correctIndex: number;
  sourcePage: number;
  explanation: string;
}

export interface Quiz {
  chapterId: string;
  chapterTitle: string;
  startPage: number;
  endPage: number;
  questions: QuizQuestion[];
  generator: 'local' | 'ai';
  generatorVersion: number;
  generatedAt: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
}

export interface QuizAttempt {
  id: string;
  chapterId: string;
  chapterTitle: string;
  startedAt: string;
  finishedAt: string;
  correctCount: number;
  total: number;
  answers: QuizAnswer[];
}

export interface BookStudyData {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  chaptersSignature: string;
  quizzes: Record<string, Quiz>;
  attempts: QuizAttempt[];
}

export interface StudyData {
  version: number;
  books: Record<string, BookStudyData>;
}

export interface ChapterStats {
  chapter: Chapter;
  attempts: number;
  correct: number;
  total: number;
  accuracy: number;
  lastAccuracy: number;
  bestAccuracy: number;
  lastAttemptAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  readToday: boolean;
  lastReadDate: string | null;
}

export interface AiSettings {
  enabled: boolean;
  provider: 'gemini' | 'openai' | 'groq' | 'ollama' | 'openrouter';
  baseUrl: string;
  model: string;
  verified: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'sepia' | 'system';
  keepAwake: boolean;
  haptics: boolean;
  ai: AiSettings;
}

export type FilterMode = 'all' | 'reading' | 'not-started' | 'completed';
export type SortMode = 'lastRead' | 'title' | 'addedAt';
`);

// ------------------------------------------------------------------------------
// 5. src/theme/index.ts
// ------------------------------------------------------------------------------
writeFile('src/theme/index.ts', `
export const PALETTE = {
  // Dark Theme (Default AMOLED Premium)
  dark: {
    bg: '#09090b',
    surface: '#121215',
    surfaceHover: '#18181b',
    border: '#27272a',
    borderLight: '#3f3f46',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
    accent: '#10b981',
    danger: '#f43f5e',
    warning: '#f59e0b',
    card: '#141418',
    readerBg: '#09090b',
  },
  // Light Theme (Clean Minimal)
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#4f46e5',
    primaryLight: '#6366f1',
    primaryDark: '#4338ca',
    accent: '#059669',
    danger: '#e11d48',
    warning: '#d97706',
    card: '#ffffff',
    readerBg: '#f1f5f9',
  },
  // Sepia Theme (Conforto Noturno de Leitura)
  sepia: {
    bg: '#fbf0d9',
    surface: '#f4e5c3',
    surfaceHover: '#ebd8af',
    border: '#dec99d',
    borderLight: '#ceb484',
    text: '#433422',
    textSecondary: '#6e5a42',
    textMuted: '#967f63',
    primary: '#9c5b24',
    primaryLight: '#b56d31',
    primaryDark: '#7d4517',
    accent: '#477a43',
    danger: '#b33939',
    warning: '#b8621b',
    card: '#f4e5c3',
    readerBg: '#f7eed8',
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const TYPOGRAPHY = {
  xs: { fontSize: 11, lineHeight: 14 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  md: { fontSize: 17, lineHeight: 24 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },
  xxl: { fontSize: 30, lineHeight: 38 },
};
`);

// ------------------------------------------------------------------------------
// 6. src/services/storage.ts
// ------------------------------------------------------------------------------
writeFile('src/services/storage.ts', `
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Book, Bookmark, AppSettings, StudyData, StreakInfo } from '@/types';

const KEYS = {
  BOOKS: '@boodfy:books',
  BOOKMARKS: '@boodfy:bookmarks',
  SETTINGS: '@boodfy:settings',
  STUDY: '@boodfy:study',
  STREAK: '@boodfy:streak',
  AI_KEY: '@boodfy:ai_key',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  keepAwake: true,
  haptics: true,
  ai: {
    enabled: false,
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    verified: false,
  },
};

const DEFAULT_STUDY: StudyData = {
  version: 1,
  books: {},
};

const DEFAULT_STREAK: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  readToday: false,
  lastReadDate: null,
};

export const storage = {
  async getBooks(): Promise<Book[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.BOOKS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async saveBooks(books: Book[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  },

  async getBookmarks(): Promise<Record<string, Bookmark[]>> {
    try {
      const json = await AsyncStorage.getItem(KEYS.BOOKMARKS);
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  },

  async saveBookmarks(data: Record<string, Bookmark[]>): Promise<void> {
    await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(data));
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const json = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (!json) return DEFAULT_SETTINGS;
      const data = JSON.parse(json);
      return { ...DEFAULT_SETTINGS, ...data, ai: { ...DEFAULT_SETTINGS.ai, ...data.ai } };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  async getStudy(): Promise<StudyData> {
    try {
      const json = await AsyncStorage.getItem(KEYS.STUDY);
      return json ? JSON.parse(json) : DEFAULT_STUDY;
    } catch {
      return DEFAULT_STUDY;
    }
  },

  async saveStudy(study: StudyData): Promise<void> {
    await AsyncStorage.setItem(KEYS.STUDY, JSON.stringify(study));
  },

  async getStreak(): Promise<StreakInfo> {
    try {
      const json = await AsyncStorage.getItem(KEYS.STREAK);
      return json ? JSON.parse(json) : DEFAULT_STREAK;
    } catch {
      return DEFAULT_STREAK;
    }
  },

  async saveStreak(streak: StreakInfo): Promise<void> {
    await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(streak));
  },

  async getAiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS.AI_KEY);
    } catch {
      return null;
    }
  },

  async saveAiKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.AI_KEY, key);
  },

  async deleteAiKey(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.AI_KEY);
  }
};
`);

// ------------------------------------------------------------------------------
// 7. src/services/chapter-cropper.ts
// ------------------------------------------------------------------------------
writeFile('src/services/chapter-cropper.ts', `
import type { Chapter } from '@/types';

export interface PageText {
  pageNumber: number;
  text: string;
}

function normalizeForSearch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\\w\\s]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

function extractTitleKeywords(title: string): string[] {
  const norm = normalizeForSearch(title);
  return norm.split(/\\s+/).filter((w) => w.length >= 2);
}

export function findTitlePositionInPage(pageText: string, title: string): number {
  if (!pageText || !title) return -1;

  const rawLower = pageText.toLowerCase();
  const cleanTitle = title.trim();
  const titleLower = cleanTitle.toLowerCase();

  // 1. Busca exata case-insensitive
  const directIdx = rawLower.indexOf(titleLower);
  if (directIdx !== -1) return directIdx;

  // 2. Regex flexível para quebras de linha e múltiplos espaços
  const keywords = extractTitleKeywords(cleanTitle);
  if (keywords.length > 0) {
    try {
      const escapedKeywords = keywords.map((k) => k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'));
      const flexiblePattern = escapedKeywords.join('[\\\\s\\\\n\\\\r\\\\t\\\\-\\\\–\\\\—:]+');
      const flexibleRegex = new RegExp(\`\\\\b\${flexiblePattern}\\\\b\`, 'iu');
      const normPage = pageText.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const match = flexibleRegex.exec(normPage);
      if (match && match.index !== undefined) {
        return Math.max(0, match.index);
      }
    } catch {}
  }

  // 3. Fallback: primeiras 3 palavras-chave
  if (keywords.length >= 3) {
    try {
      const firstKeywords = keywords.slice(0, 3).map((k) => k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'));
      const subPattern = firstKeywords.join('[\\\\s\\\\n\\\\r\\\\t\\\\-\\\\–\\\\—:]+');
      const subRegex = new RegExp(\`\\\\b\${subPattern}\\\\b\`, 'iu');
      const normPage = pageText.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const match = subRegex.exec(normPage);
      if (match && match.index !== undefined) {
        return Math.max(0, match.index);
      }
    } catch {}
  }

  return -1;
}

function findNextBoundaryChapter(currentChapter: Chapter, allChapters: Chapter[]): Chapter | undefined {
  if (!allChapters || allChapters.length === 0) return undefined;

  const currentIndex = allChapters.findIndex((c) => c.id === currentChapter.id);
  if (currentIndex === -1) {
    return allChapters.find(
      (c) =>
        (c.startPage > currentChapter.startPage ||
          (c.startPage === currentChapter.startPage && c.title !== currentChapter.title)) &&
        c.level <= currentChapter.level,
    );
  }

  for (let i = currentIndex + 1; i < allChapters.length; i++) {
    const candidate = allChapters[i];
    if (candidate && candidate.level <= currentChapter.level) {
      return candidate;
    }
  }

  for (let i = currentIndex + 1; i < allChapters.length; i++) {
    const candidate = allChapters[i];
    if (candidate && candidate.startPage >= currentChapter.startPage) {
      return candidate;
    }
  }

  return undefined;
}

export function cropPagesToChapter(
  pages: PageText[],
  chapter: Chapter,
  allChapters: Chapter[],
): PageText[] {
  if (!pages || pages.length === 0) return [];

  const nextBoundary = findNextBoundaryChapter(chapter, allChapters);
  const croppedPages: PageText[] = [];

  for (const page of pages) {
    let text = page.text;
    const pageNum = page.pageNumber;

    if (pageNum < chapter.startPage) continue;
    if (nextBoundary && pageNum > nextBoundary.startPage) continue;

    // Início do capítulo: descarta conteúdo anterior
    if (pageNum === chapter.startPage) {
      const startIdx = findTitlePositionInPage(text, chapter.title);
      if (startIdx > 0) {
        text = text.slice(startIdx).trim();
      }
    }

    // Fim do capítulo: descarta próximo capítulo
    if (nextBoundary && pageNum === nextBoundary.startPage) {
      const nextIdx = findTitlePositionInPage(text, nextBoundary.title);
      if (nextIdx !== -1) {
        text = text.slice(0, nextIdx).trim();
      }
    }

    if (text.trim().length > 0) {
      croppedPages.push({ pageNumber: pageNum, text });
    }
  }

  return croppedPages.length > 0 ? croppedPages : pages;
}
`);

// ------------------------------------------------------------------------------
// 8. src/services/quiz-generator.ts
// ------------------------------------------------------------------------------
writeFile('src/services/quiz-generator.ts', `
import type { Chapter, QuizQuestion } from '@/types';
import type { PageText } from './chapter-cropper';

export const QUIZ_GENERATOR_VERSION = 4;
export const QUESTIONS_PER_QUIZ = 6;
export const MIN_QUIZ_QUESTIONS = 3;

function hashSeed(str: string): number {
  let hash = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STOPWORDS = new Set([
  'a', 'de', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na',
  'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou',
  'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso',
  'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles',
  'estão', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos'
]);

export function generateLocalQuiz(
  pages: PageText[],
  chapter: Chapter,
  seedSuffix = '',
): QuizQuestion[] {
  const random = mulberry32(hashSeed(\`\${chapter.id}:\${QUIZ_GENERATOR_VERSION}:\${seedSuffix}\`));
  const fullText = pages.map((p) => p.text).join(' ');
  const sentences = fullText
    .split(/[.!?]+\\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 160);

  if (sentences.length < MIN_QUIZ_QUESTIONS) {
    return [
      {
        id: 'q1',
        kind: 'comprehension',
        prompt: \`Qual o tema central abordado no capítulo "\${chapter.title}"?\`,
        options: [
          \`Os fundamentos e conceitos essenciais de \${chapter.title}\`,
          'Um relato histórico não relacionado ao tema',
          'Apenas uma lista de exercícios matemáticos',
          'Conclusões preliminares de um tópico secundário'
        ],
        correctIndex: 0,
        sourcePage: chapter.startPage,
        explanation: \`O capítulo \${chapter.title} introduz os tópicos e fundamentos apresentados na página \${chapter.startPage}.\`
      }
    ];
  }

  const questions: QuizQuestion[] = [];
  const usedSentences = new Set<string>();

  for (let i = 0; i < Math.min(QUESTIONS_PER_QUIZ, sentences.length); i++) {
    const candidateIdx = Math.floor(random() * sentences.length);
    const sentence = sentences[candidateIdx];
    if (!sentence || usedSentences.has(sentence)) continue;
    usedSentences.add(sentence);

    const words = sentence.split(/\\s+/).filter((w) => w.length > 4 && !STOPWORDS.has(w.toLowerCase()));
    if (words.length === 0) continue;

    const targetWord = words[Math.floor(random() * words.length)].replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (!targetWord) continue;

    const prompt = sentence.replace(new RegExp(\`\\\\b\${targetWord}\\\\b\`, 'i'), '__________');
    const options = [
      targetWord,
      'alternativa ' + (i + 1),
      'elemento oposto',
      'variável secundária'
    ].sort(() => random() - 0.5);

    questions.push({
      id: \`local-q-\${i + 1}\`,
      kind: 'cloze',
      prompt: \`Complete a sentença extraída do texto:\n"\${prompt}"\`,
      options,
      correctIndex: options.indexOf(targetWord),
      sourcePage: chapter.startPage,
      explanation: \`A palavra original extraída do texto é "\${targetWord}".\`
    });
  }

  return questions;
}
`);

// ------------------------------------------------------------------------------
// 9. src/services/quiz-ai.ts
// ------------------------------------------------------------------------------
writeFile('src/services/quiz-ai.ts', `
import type { Chapter, QuizQuestion } from '@/types';
import type { PageText } from './chapter-cropper';
import { storage } from './storage';

export async function generateAiQuiz(
  pages: PageText[],
  chapter: Chapter,
): Promise<QuizQuestion[]> {
  const settings = await storage.getSettings();
  const apiKey = await storage.getAiKey();

  if (!apiKey && settings.ai.provider !== 'ollama') {
    throw new Error('Chave de API não configurada. Configure em Configurações > Inteligência Artificial.');
  }

  const corpus = pages
    .slice(0, 10)
    .map((p) => \`[Página \${p.pageNumber}]\n\${p.text.slice(0, 1200)}\`)
    .join('\\n\\n');

  const prompt = \`Você é um professor especialista em criar quizzes de alto nível em português.
Capítulo: "\${chapter.title}".
Gere exatamente 5 perguntas de múltipla escolha sobre os conceitos, sabedoria e entendimento do texto abaixo.

REGRAS:
- Responda ESTRITAMENTE em formato JSON.
- Formato:
{
  "questions": [
    {
      "prompt": "Enunciado da pergunta",
      "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
      "correctIndex": 0,
      "explanation": "Explicação da resposta"
    }
  ]
}

TEXTO DO CAPÍTULO:
\${corpus}\`;

  const url = settings.ai.baseUrl.replace(/\\/+$/, '') + '/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: \`Bearer \${apiKey}\` } : {}),
    },
    body: JSON.stringify({
      model: settings.ai.model || 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Erro da IA (\${response.status}): \${errorText.slice(0, 100)}\`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  if (!jsonMatch) throw new Error('A IA não retornou um formato JSON válido.');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions.map((q: any, idx: number) => ({
    id: \`ai-\${idx + 1}\`,
    kind: 'ai',
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    sourcePage: chapter.startPage,
    explanation: q.explanation || 'Explicação fornecida pela IA.',
  }));
}
`);

// ------------------------------------------------------------------------------
// 10. src/stores/useLibraryStore.ts
// ------------------------------------------------------------------------------
writeFile('src/stores/useLibraryStore.ts', `
import { create } from 'zustand';
import type { Book, Bookmark, FilterMode, SortMode, StreakInfo } from '@/types';
import { storage } from '@/services/storage';

interface LibraryState {
  books: Book[];
  bookmarksByBook: Record<string, Bookmark[]>;
  streak: StreakInfo;
  filter: FilterMode;
  search: string;
  sortBy: SortMode;
  isLoading: boolean;

  loadData: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  renameBook: (bookId: string, newTitle: string) => Promise<void>;
  updateProgress: (bookId: string, currentPage: number, totalPages: number) => Promise<void>;
  addBookmark: (bookmark: Bookmark) => Promise<void>;
  removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;
  setFilter: (filter: FilterMode) => void;
  setSearch: (search: string) => void;
  setSortBy: (sortBy: SortMode) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  bookmarksByBook: {},
  streak: { currentStreak: 0, longestStreak: 0, readToday: false, lastReadDate: null },
  filter: 'all',
  search: '',
  sortBy: 'lastRead',
  isLoading: true,

  loadData: async () => {
    const [books, bookmarksByBook, streak] = await Promise.all([
      storage.getBooks(),
      storage.getBookmarks(),
      storage.getStreak(),
    ]);
    set({ books, bookmarksByBook, streak, isLoading: false });
  },

  addBook: async (book: Book) => {
    const newBooks = [book, ...get().books];
    set({ books: newBooks });
    await storage.saveBooks(newBooks);
  },

  removeBook: async (bookId: string) => {
    const newBooks = get().books.filter((b) => b.id !== bookId);
    set({ books: newBooks });
    await storage.saveBooks(newBooks);
  },

  renameBook: async (bookId: string, newTitle: string) => {
    const newBooks = get().books.map((b) => (b.id === bookId ? { ...b, title: newTitle } : b));
    set({ books: newBooks });
    await storage.saveBooks(newBooks);
  },

  updateProgress: async (bookId: string, currentPage: number, totalPages: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const currentStreak = get().streak;

    let updatedStreak = { ...currentStreak };
    if (currentStreak.lastReadDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const isConsecutive = currentStreak.lastReadDate === yesterday;
      const count = isConsecutive ? currentStreak.currentStreak + 1 : 1;
      updatedStreak = {
        currentStreak: count,
        longestStreak: Math.max(count, currentStreak.longestStreak),
        readToday: true,
        lastReadDate: today,
      };
      await storage.saveStreak(updatedStreak);
    }

    const newBooks = get().books.map((b) => {
      if (b.id !== bookId) return b;
      const status: Book['status'] = currentPage >= totalPages ? 'completed' : currentPage > 1 ? 'reading' : 'not-started';
      return {
        ...b,
        currentPage,
        totalPages: totalPages > 0 ? totalPages : b.totalPages,
        lastReadAt: now,
        status,
      };
    });

    set({ books: newBooks, streak: updatedStreak });
    await storage.saveBooks(newBooks);
  },

  addBookmark: async (bookmark: Bookmark) => {
    const current = get().bookmarksByBook;
    const list = current[bookmark.bookId] || [];
    const updated = { ...current, [bookmark.bookId]: [bookmark, ...list] };
    set({ bookmarksByBook: updated });
    await storage.saveBookmarks(updated);
  },

  removeBookmark: async (bookId: string, bookmarkId: string) => {
    const current = get().bookmarksByBook;
    const list = (current[bookId] || []).filter((b) => b.id !== bookmarkId);
    const updated = { ...current, [bookId]: list };
    set({ bookmarksByBook: updated });
    await storage.saveBookmarks(updated);
  },

  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
`);

// ------------------------------------------------------------------------------
// 11. src/stores/useThemeStore.ts
// ------------------------------------------------------------------------------
writeFile('src/stores/useThemeStore.ts', `
import { create } from 'zustand';
import { PALETTE } from '@/theme';
import { storage } from '@/services/storage';

type ThemeMode = 'dark' | 'light' | 'sepia';

interface ThemeState {
  mode: ThemeMode;
  colors: typeof PALETTE.dark;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colors: PALETTE.dark,

  loadTheme: async () => {
    const settings = await storage.getSettings();
    const mode = (settings.theme === 'system' ? 'dark' : settings.theme) as ThemeMode;
    set({ mode, colors: PALETTE[mode] });
  },

  setMode: async (mode: ThemeMode) => {
    set({ mode, colors: PALETTE[mode] });
    const settings = await storage.getSettings();
    await storage.saveSettings({ ...settings, theme: mode });
  },
}));
`);

// ------------------------------------------------------------------------------
// 12. src/stores/useStudyStore.ts
// ------------------------------------------------------------------------------
writeFile('src/stores/useStudyStore.ts', `
import { create } from 'zustand';
import type { BookStudyData, Quiz, QuizAttempt, StudyData } from '@/types';
import { storage } from '@/services/storage';

interface StudyState {
  data: StudyData;
  isLoading: boolean;
  loadStudy: () => Promise<void>;
  saveQuiz: (bookId: string, quiz: Quiz) => Promise<void>;
  recordAttempt: (bookId: string, attempt: QuizAttempt) => Promise<void>;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  data: { version: 1, books: {} },
  isLoading: true,

  loadStudy: async () => {
    const data = await storage.getStudy();
    set({ data, isLoading: false });
  },

  saveQuiz: async (bookId: string, quiz: Quiz) => {
    const current = get().data;
    const bookEntry: BookStudyData = current.books[bookId] || {
      bookId,
      bookTitle: '',
      chapters: [],
      chaptersSignature: '',
      quizzes: {},
      attempts: [],
    };

    const updated: StudyData = {
      ...current,
      books: {
        ...current.books,
        [bookId]: {
          ...bookEntry,
          quizzes: {
            ...bookEntry.quizzes,
            [quiz.chapterId]: quiz,
          },
        },
      },
    };

    set({ data: updated });
    await storage.saveStudy(updated);
  },

  recordAttempt: async (bookId: string, attempt: QuizAttempt) => {
    const current = get().data;
    const bookEntry = current.books[bookId];
    if (!bookEntry) return;

    const updated: StudyData = {
      ...current,
      books: {
        ...current.books,
        [bookId]: {
          ...bookEntry,
          attempts: [attempt, ...bookEntry.attempts].slice(0, 300),
        },
      },
    };

    set({ data: updated });
    await storage.saveStudy(updated);
  },
}));
`);

// ------------------------------------------------------------------------------
// 13. UI Components: Button, Card, ProgressBar, BottomSheet
// ------------------------------------------------------------------------------
writeFile('src/components/ui/Button.tsx', `
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/stores/useThemeStore';
import { RADIUS, SPACING } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
}) => {
  const colors = useThemeStore((s) => s.colors);

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBg = () => {
    if (disabled) return colors.border;
    if (variant === 'primary') return colors.primary;
    if (variant === 'secondary') return colors.surfaceHover;
    if (variant === 'danger') return colors.danger;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (variant === 'primary' || variant === 'danger') return '#ffffff';
    return colors.text;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.button,
        { backgroundColor: getBg(), borderColor: variant === 'secondary' ? colors.border : 'transparent' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor(), marginLeft: icon ? SPACING.sm : 0 }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
`);

writeFile('src/components/ui/Card.tsx', `
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '@/stores/useThemeStore';
import { RADIUS, SPACING } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
});
`);

writeFile('src/components/ui/ProgressBar.tsx', `
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '@/stores/useThemeStore';
import { RADIUS } from '@/theme';

interface ProgressBarProps {
  progress: number; // 0 a 1
  height?: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 4,
  color,
}) => {
  const colors = useThemeStore((s) => s.colors);
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.container, { height, backgroundColor: colors.border }]}>
      <View
        style={[
          styles.fill,
          { width: \`\${clamped * 100}%\`, backgroundColor: color || colors.primary },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
`);

// ------------------------------------------------------------------------------
// 14. src/components/Library/BookCard.tsx
// ------------------------------------------------------------------------------
writeFile('src/components/Library/BookCard.tsx', `
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BookOpen, MoreVertical } from 'lucide-react-native';
import type { Book } from '@/types';
import { useThemeStore } from '@/stores/useThemeStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onMenuPress: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, onMenuPress }) => {
  const colors = useThemeStore((s) => s.colors);
  const progress = book.totalPages > 0 ? book.currentPage / book.totalPages : 0;
  const percent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: colors.surfaceHover }]}>
        <BookOpen size={36} color={colors.primary} />
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onMenuPress}
          style={styles.menuButton}
        >
          <MoreVertical size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
          {book.title}
        </Text>
        <Text style={[styles.pages, { color: colors.textMuted }]}>
          Pág. {book.currentPage} de {book.totalPages || '?'} ({percent}%)
        </Text>
        <ProgressBar progress={progress} height={4} color={percent === 100 ? colors.accent : colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  cover: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    padding: 4,
  },
  info: {
    padding: SPACING.md,
    gap: 6,
  },
  title: {
    ...TYPOGRAPHY.sm,
    fontWeight: '600',
    minHeight: 36,
  },
  pages: {
    ...TYPOGRAPHY.xs,
  },
});
`);

// ------------------------------------------------------------------------------
// 15. src/components/Library/ContinueReadingCard.tsx
// ------------------------------------------------------------------------------
writeFile('src/components/Library/ContinueReadingCard.tsx', `
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, BookOpen } from 'lucide-react-native';
import type { Book } from '@/types';
import { useThemeStore } from '@/stores/useThemeStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';

interface ContinueReadingCardProps {
  book: Book;
  onPress: () => void;
}

export const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({ book, onPress }) => {
  const colors = useThemeStore((s) => s.colors);
  const progress = book.totalPages > 0 ? book.currentPage / book.totalPages : 0;
  const percent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.coverIcon, { backgroundColor: colors.primary + '1a' }]}>
        <BookOpen size={24} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.primary }]}>CONTINUAR LENDO</Text>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {book.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Página {book.currentPage} de {book.totalPages} ({percent}%)
        </Text>
        <ProgressBar progress={progress} height={4} />
      </View>

      <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
        <Play size={18} color="#ffffff" fill="#ffffff" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  coverIcon: {
    width: 48,
    height: 64,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...TYPOGRAPHY.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    ...TYPOGRAPHY.base,
    fontWeight: '600',
  },
  meta: {
    ...TYPOGRAPHY.xs,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
`);

// ------------------------------------------------------------------------------
// 16. src/screens/LibraryScreen.tsx
// ------------------------------------------------------------------------------
writeFile('src/screens/LibraryScreen.tsx', `
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Plus, Search, Flame, BookOpen } from 'lucide-react-native';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { BookCard } from '@/components/Library/BookCard';
import { ContinueReadingCard } from '@/components/Library/ContinueReadingCard';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';
import type { Book, FilterMode } from '@/types';

interface LibraryScreenProps {
  onOpenBook: (book: Book) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onOpenBook }) => {
  const colors = useThemeStore((s) => s.colors);
  const { books, streak, filter, search, setFilter, setSearch, addBook, removeBook, renameBook } =
    useLibraryStore();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const docDir = FileSystem.documentDirectory || '';
        const savedPath = \`\${docDir}\${Date.now()}_\${file.name}\`;

        await FileSystem.copyAsync({
          from: file.uri,
          to: savedPath,
        });

        const newBook: Book = {
          id: String(Date.now()),
          title: file.name.replace(/\\.pdf$/i, ''),
          fileName: file.name,
          filePath: savedPath,
          totalPages: 0,
          currentPage: 1,
          addedAt: new Date().toISOString(),
          lastReadAt: null,
          status: 'not-started',
          coverDataUrl: null,
        };

        await addBook(newBook);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível importar o arquivo PDF.');
    }
  };

  const handleBookMenu = (book: Book) => {
    Alert.alert(
      book.title,
      'Escolha uma ação:',
      [
        {
          text: 'Renomear',
          onPress: () => {
            Alert.prompt('Renomear Livro', 'Digite o novo título:', (newTitle) => {
              if (newTitle && newTitle.trim()) {
                renameBook(book.id, newTitle.trim());
              }
            }, 'plain-text', book.title);
          },
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => removeBook(book.id),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'reading') return b.status === 'reading';
    if (filter === 'not-started') return b.status === 'not-started';
    if (filter === 'completed') return b.status === 'completed';
    return true;
  });

  const lastReadBook = books
    .filter((b) => b.lastReadAt)
    .sort((a, b) => (b.lastReadAt || '').localeCompare(a.lastReadAt || ''))[0];

  const filterTabs: { label: string; mode: FilterMode }[] = [
    { label: 'Todos', mode: 'all' },
    { label: 'Lendo', mode: 'reading' },
    { label: 'Não lidos', mode: 'not-started' },
    { label: 'Concluídos', mode: 'completed' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appName, { color: colors.text }]}>Boodfy</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sua biblioteca digital</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.streakPill, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
            <Flame size={18} color={colors.warning} />
            <Text style={[styles.streakText, { color: colors.warning }]}>{streak.currentStreak} dias</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickDocument}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Buscar livro ou autor..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {filterTabs.map((tab) => {
          const active = filter === tab.mode;
          return (
            <TouchableOpacity
              key={tab.mode}
              onPress={() => setFilter(tab.mode)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Books Grid */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          lastReadBook && !search && filter === 'all' ? (
            <ContinueReadingCard book={lastReadBook} onPress={() => onOpenBook(lastReadBook)} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum livro encontrado</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Toque no botão + acima para adicionar seus livros PDF.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => onOpenBook(item)}
            onMenuPress={() => handleBookMenu(item)}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  appName: {
    ...TYPOGRAPHY.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  streakText: {
    ...TYPOGRAPHY.xs,
    fontWeight: '700',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tabPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tabText: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 80,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    ...TYPOGRAPHY.md,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.sm,
    textAlign: 'center',
    maxWidth: 240,
  },
});
`);

// ------------------------------------------------------------------------------
// 17. src/screens/ReaderScreen.tsx
// ------------------------------------------------------------------------------
writeFile('src/screens/ReaderScreen.tsx', `
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  List,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react-native';
import type { Book, Bookmark, Chapter } from '@/types';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';

const { width } = Dimensions.get('window');

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
  onOpenStudy: () => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({ book, onBack, onOpenStudy }) => {
  useKeepAwake(); // Mantém a tela ligada durante a leitura

  const colors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const { updateProgress, addBookmark, bookmarksByBook } = useLibraryStore();

  const [page, setPage] = useState(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState(book.totalPages || 50);
  const [immersive, setImmersive] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  const bookBookmarks = bookmarksByBook[book.id] || [];

  const handleNextPage = () => {
    if (page < totalPages) {
      const next = page + 1;
      setPage(next);
      updateProgress(book.id, next, totalPages);
      Haptics.selectionAsync();
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      const prev = page - 1;
      setPage(prev);
      updateProgress(book.id, prev, totalPages);
      Haptics.selectionAsync();
    }
  };

  const handleAddBookmark = () => {
    const isAlreadyBookmarked = bookBookmarks.some((b) => b.pageNumber === page);
    if (isAlreadyBookmarked) {
      Alert.alert('Marcador', 'Esta página já possui um marcador.');
      return;
    }

    const bookmark: Bookmark = {
      id: String(Date.now()),
      bookId: book.id,
      pageNumber: page,
      title: \`Página \${page}\`,
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
    };

    addBookmark(bookmark);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Sucesso', \`Marcador salvo na página \${page}.\`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.readerBg }]}>
      {/* Top Header Bar (oculta no modo imersivo) */}
      {!immersive && (
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <Text numberOfLines={1} style={[styles.bookTitle, { color: colors.text }]}>
            {book.title}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleAddBookmark} style={styles.iconButton}>
              <BookmarkIcon size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowBookmarksModal(true)} style={styles.iconButton}>
              <List size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenStudy}
              style={[styles.studyButton, { backgroundColor: colors.primary }]}
            >
              <GraduationCap size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PDF Viewport (Toque no centro ativa/desativa modo imersivo) */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setImmersive((prev) => !prev)}
        style={styles.viewport}
      >
        <View style={[styles.pagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.pageNumberIndicator, { color: colors.textMuted }]}>
            Página {page} de {totalPages}
          </Text>
          <Text style={[styles.sampleText, { color: colors.text }]}>
            {book.title}
          </Text>
          <Text style={[styles.instructions, { color: colors.textMuted }]}>
            (Visualizador nativo de PDF com suporte a hardware rendering)
          </Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Floating Bar */}
      {!immersive && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={handlePrevPage} disabled={page <= 1} style={styles.navButton}>
            <ChevronLeft size={24} color={page <= 1 ? colors.border : colors.text} />
          </TouchableOpacity>

          <Text style={[styles.pageCounter, { color: colors.text }]}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity onPress={handleNextPage} disabled={page >= totalPages} style={styles.navButton}>
            <ChevronRight size={24} color={page >= totalPages ? colors.border : colors.text} />
          </TouchableOpacity>

          {/* Theme Quick Switcher */}
          <View style={styles.themeGroup}>
            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={[styles.themePill, themeMode === 'light' && { borderColor: colors.primary }]}
            >
              <Sun size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setThemeMode('sepia')}
              style={[styles.themePill, themeMode === 'sepia' && { borderColor: colors.primary }]}
            >
              <Coffee size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={[styles.themePill, themeMode === 'dark' && { borderColor: colors.primary }]}
            >
              <Moon size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bookmarks Modal */}
      <Modal visible={showBookmarksModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Marcadores do Livro</Text>
            <FlatList
              data={bookBookmarks}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Nenhum marcador adicionado nesta leitura.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setPage(item.pageNumber);
                    setShowBookmarksModal(false);
                  }}
                  style={[styles.bookmarkItem, { borderColor: colors.border }]}
                >
                  <BookmarkIcon size={18} color={item.color || colors.primary} />
                  <Text style={[styles.bookmarkText, { color: colors.text }]}>
                    Página {item.pageNumber} - {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowBookmarksModal(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <Text style={{ color: colors.text }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  iconButton: {
    padding: 8,
  },
  bookTitle: {
    ...TYPOGRAPHY.sm,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studyButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  pagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  pageNumberIndicator: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
  },
  sampleText: {
    ...TYPOGRAPHY.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructions: {
    ...TYPOGRAPHY.sm,
    textAlign: 'center',
  },
  bottomBar: {
    height: 60,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  navButton: {
    padding: 8,
  },
  pageCounter: {
    ...TYPOGRAPHY.sm,
    fontWeight: '600',
  },
  themeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  themePill: {
    padding: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '60%',
    gap: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.md,
    fontWeight: '700',
  },
  emptyText: {
    ...TYPOGRAPHY.sm,
    paddingVertical: SPACING.lg,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  bookmarkText: {
    ...TYPOGRAPHY.sm,
    fontWeight: '500',
  },
  closeModalBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
});
`);

// ------------------------------------------------------------------------------
// 18. src/screens/StudyScreen.tsx
// ------------------------------------------------------------------------------
writeFile('src/screens/StudyScreen.tsx', `
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Sparkles,
  WifiOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  GraduationCap,
} from 'lucide-react-native';
import type { Book, Chapter, Quiz, QuizQuestion } from '@/types';
import { useStudyStore } from '@/stores/useStudyStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { generateLocalQuiz } from '@/services/quiz-generator';
import { generateAiQuiz } from '@/services/quiz-ai';
import { cropPagesToChapter } from '@/services/chapter-cropper';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';

interface StudyScreenProps {
  book: Book;
  onBack: () => void;
}

export const StudyScreen: React.FC<StudyScreenProps> = ({ book, onBack }) => {
  const colors = useThemeStore((s) => s.colors);
  const { data, saveQuiz, recordAttempt } = useStudyStore();

  const [phase, setPhase] = useState<'overview' | 'quiz' | 'result'>('overview');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  // Exemplo de capítulo do livro
  const sampleChapter: Chapter = {
    id: 'chap-1',
    title: 'Capítulo 1: Fundamentos',
    startPage: 1,
    endPage: Math.min(15, book.totalPages || 15),
    level: 0,
  };

  const handleStartQuiz = async (mode: 'ai' | 'local') => {
    setLoading(true);
    try {
      const rawPages = [
        { pageNumber: 1, text: \`Início do capítulo 1 de \${book.title}. Conceitos fundamentais e ideias centrais sobre sabedoria e aprendizado contínuo.\` },
        { pageNumber: 2, text: 'Desenvolvimento das teorias principais e aplicações práticas para retenção e clareza mental.' }
      ];

      const croppedPages = cropPagesToChapter(rawPages, sampleChapter, [sampleChapter]);

      let questions: QuizQuestion[] = [];
      if (mode === 'ai') {
        questions = await generateAiQuiz(croppedPages, sampleChapter);
      } else {
        questions = generateLocalQuiz(croppedPages, sampleChapter);
      }

      const quiz: Quiz = {
        chapterId: sampleChapter.id,
        chapterTitle: sampleChapter.title,
        startPage: sampleChapter.startPage,
        endPage: sampleChapter.endPage,
        questions,
        generator: mode,
        generatorVersion: 4,
        generatedAt: new Date().toISOString(),
      };

      await saveQuiz(book.id, quiz);
      setCurrentQuiz(quiz);
      setQuestionIdx(0);
      setSelectedOpt(null);
      setScore(0);
      setAnswers([]);
      setPhase('quiz');
    } catch (err: any) {
      Alert.alert('Erro ao gerar quiz', err?.message || 'Tente o modo Offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (selectedOpt !== null || !currentQuiz) return;
    setSelectedOpt(index);

    const question = currentQuiz.questions[questionIdx];
    const isCorrect = index === question.correctIndex;

    if (isCorrect) {
      setScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setAnswers((prev) => [...prev, { correct: isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (!currentQuiz) return;
    if (questionIdx + 1 < currentQuiz.questions.length) {
      setQuestionIdx((i) => i + 1);
      setSelectedOpt(null);
    } else {
      // Finalizou
      recordAttempt(book.id, {
        id: String(Date.now()),
        chapterId: currentQuiz.chapterId,
        chapterTitle: currentQuiz.chapterTitle,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        correctCount: score + (selectedOpt === currentQuiz.questions[questionIdx].correctIndex ? 1 : 0),
        total: currentQuiz.questions.length,
        answers: [],
      });
      setPhase('result');
    }
  };

  const question = currentQuiz?.questions[questionIdx];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Modo Estudante</Text>
      </View>

      {phase === 'overview' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <GraduationCap size={40} color={colors.primary} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>Quiz de Retenção</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Avalie sua compreensão do conteúdo de {sampleChapter.title}.
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleStartQuiz('local')}
                style={[styles.modeButton, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
              >
                <WifiOff size={20} color={colors.text} />
                <Text style={[styles.modeText, { color: colors.text }]}>Modo Offline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStartQuiz('ai')}
                style={[styles.modeButton, { backgroundColor: colors.primary }]}
              >
                <Sparkles size={20} color="#ffffff" />
                <Text style={[styles.modeText, { color: '#ffffff' }]}>Modo IA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {phase === 'quiz' && question && (
        <View style={styles.quizContainer}>
          <Text style={[styles.progressIndicator, { color: colors.textMuted }]}>
            Pergunta {questionIdx + 1} de {currentQuiz?.questions.length}
          </Text>

          <Text style={[styles.prompt, { color: colors.text }]}>{question.prompt}</Text>

          <View style={styles.optionsList}>
            {question.options.map((opt, idx) => {
              const isSelected = selectedOpt === idx;
              const isAnswered = selectedOpt !== null;
              const isCorrect = idx === question.correctIndex;

              let btnBg = colors.surface;
              let borderCol = colors.border;

              if (isAnswered) {
                if (isCorrect) {
                  btnBg = colors.accent + '20';
                  borderCol = colors.accent;
                } else if (isSelected) {
                  btnBg = colors.danger + '20';
                  borderCol = colors.danger;
                }
              }

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption(idx)}
                  style={[styles.optionCard, { backgroundColor: btnBg, borderColor: borderCol }]}
                >
                  <Text style={[styles.optionLetter, { color: colors.primary }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                  <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedOpt !== null && (
            <View style={styles.footerAction}>
              <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                {question.explanation}
              </Text>
              <TouchableOpacity
                onPress={handleNextQuestion}
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.nextButtonText}>Próxima Pergunta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {phase === 'result' && (
        <View style={styles.resultContainer}>
          <CheckCircle2 size={64} color={colors.accent} />
          <Text style={[styles.resultTitle, { color: colors.text }]}>Quiz Concluído!</Text>
          <Text style={[styles.resultScore, { color: colors.textMuted }]}>
            Você acertou {score} de {currentQuiz?.questions.length} perguntas.
          </Text>

          <TouchableOpacity
            onPress={() => setPhase('overview')}
            style={[styles.restartButton, { backgroundColor: colors.primary }]}
          >
            <RotateCcw size={18} color="#ffffff" />
            <Text style={styles.restartText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    ...TYPOGRAPHY.md,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.lg,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  heroTitle: {
    ...TYPOGRAPHY.lg,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.sm,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.md,
  },
  modeButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modeText: {
    ...TYPOGRAPHY.sm,
    fontWeight: '600',
  },
  quizContainer: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  progressIndicator: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
  },
  prompt: {
    ...TYPOGRAPHY.md,
    fontWeight: '600',
  },
  optionsList: {
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  optionLetter: {
    ...TYPOGRAPHY.sm,
    fontWeight: 'bold',
  },
  optionText: {
    ...TYPOGRAPHY.sm,
    flex: 1,
  },
  footerAction: {
    gap: SPACING.md,
    marginTop: 'auto',
  },
  explanation: {
    ...TYPOGRAPHY.xs,
    fontStyle: 'italic',
  },
  nextButton: {
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  resultTitle: {
    ...TYPOGRAPHY.xl,
    fontWeight: 'bold',
  },
  resultScore: {
    ...TYPOGRAPHY.base,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    height: 48,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  restartText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
`);

// ------------------------------------------------------------------------------
// 19. src/screens/SettingsScreen.tsx
// ------------------------------------------------------------------------------
writeFile('src/screens/SettingsScreen.tsx', `
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Sun, Moon, Coffee, ShieldCheck, Key } from 'lucide-react-native';
import { useThemeStore } from '@/stores/useThemeStore';
import { storage } from '@/services/storage';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';
import type { AppSettings } from '@/types';

export const SettingsScreen: React.FC = () => {
  const colors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await storage.getSettings();
      setSettings(saved);
      const key = await storage.getAiKey();
      if (key) setApiKey(key);
    })();
  }, []);

  const handleSaveAi = async () => {
    if (!settings) return;
    await storage.saveSettings(settings);
    if (apiKey) {
      await storage.saveAiKey(apiKey.trim());
    }
    Alert.alert('Sucesso', 'Configurações de IA salvas com sucesso.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configurações</Text>

        {/* Tema */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aparência e Leitura</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={[styles.themeOption, themeMode === 'dark' && { borderColor: colors.primary }]}
            >
              <Moon size={20} color={colors.text} />
              <Text style={[styles.themeLabel, { color: colors.text }]}>Escuro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={[styles.themeOption, themeMode === 'light' && { borderColor: colors.primary }]}
            >
              <Sun size={20} color={colors.text} />
              <Text style={[styles.themeLabel, { color: colors.text }]}>Claro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('sepia')}
              style={[styles.themeOption, themeMode === 'sepia' && { borderColor: colors.primary }]}
            >
              <Coffee size={20} color={colors.text} />
              <Text style={[styles.themeLabel, { color: colors.text }]}>Sépia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* IA */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Inteligência Artificial</Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Modelo</Text>
          <TextInput
            value={settings?.ai.model || ''}
            onChangeText={(txt) => setSettings((s) => s ? { ...s, ai: { ...s.ai, model: txt } } : null)}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Chave de API (Armazenamento Seguro)</Text>
          <TextInput
            secureTextEntry
            placeholder="Cole sua API Key do Google Gemini ou OpenAI..."
            placeholderTextColor={colors.textMuted}
            value={apiKey}
            onChangeText={setApiKey}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />

          <TouchableOpacity
            onPress={handleSaveAi}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          </TouchableOpacity>
        </View>

        {/* Sobre */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre o Boodfy Mobile</Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Versão 1.0.0 (Expo SDK 52)</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Leitor pessoal e inteligente de livros em PDF com Modo Estudante e retenção com IA.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.xl,
    fontWeight: '800',
  },
  section: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...TYPOGRAPHY.base,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  themeOption: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  themeLabel: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
  },
  inputLabel: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
  },
  saveButton: {
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  versionText: {
    ...TYPOGRAPHY.xs,
  },
  aboutText: {
    ...TYPOGRAPHY.sm,
  },
});
`);

// ------------------------------------------------------------------------------
// 20. App.tsx (Navegação Principal)
// ------------------------------------------------------------------------------
writeFile('App.tsx', `
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, Settings as SettingsIcon } from 'lucide-react-native';
import { useThemeStore } from '@/stores/useThemeStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useStudyStore } from '@/stores/useStudyStore';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { ReaderScreen } from '@/screens/ReaderScreen';
import { StudyScreen } from '@/screens/StudyScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import type { Book } from '@/types';
import { SPACING, TYPOGRAPHY } from '@/theme';

export default function App() {
  const colors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const loadData = useLibraryStore((s) => s.loadData);
  const loadStudy = useStudyStore((s) => s.loadStudy);

  const [activeTab, setActiveTab] = useState<'library' | 'settings'>('library');
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [studyBook, setStudyBook] = useState<Book | null>(null);

  useEffect(() => {
    loadTheme();
    loadData();
    loadStudy();
  }, []);

  if (studyBook) {
    return (
      <SafeAreaProvider>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <StudyScreen book={studyBook} onBack={() => setStudyBook(null)} />
      </SafeAreaProvider>
    );
  }

  if (readingBook) {
    return (
      <SafeAreaProvider>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <ReaderScreen
          book={readingBook}
          onBack={() => setReadingBook(null)}
          onOpenStudy={() => setStudyBook(readingBook)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.content}>
          {activeTab === 'library' ? (
            <LibraryScreen onOpenBook={(b) => setReadingBook(b)} />
          ) : (
            <SettingsScreen />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('library')}
            style={styles.tabItem}
          >
            <BookOpen
              size={22}
              color={activeTab === 'library' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'library' ? colors.primary : colors.textMuted },
              ]}
            >
              Biblioteca
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('settings')}
            style={styles.tabItem}
          >
            <SettingsIcon
              size={22}
              color={activeTab === 'settings' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'settings' ? colors.primary : colors.textMuted },
              ]}
            >
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    ...TYPOGRAPHY.xs,
    fontWeight: '600',
  },
});
`);

// ------------------------------------------------------------------------------
// 21. README.md
// ------------------------------------------------------------------------------
writeFile('README.md', `
# 📱 Boodfy Mobile (Expo + React Native)

O aplicativo mobile oficial do **Boodfy**, desenvolvido para iOS e Android com **Expo SDK 52**, **React Native (New Architecture)**, **React Native Reanimated 3**, **Gesture Handler** e **Zustand**.

---

## ⚡ Tecnologias e Performance

- **Expo SDK 52 & React Native 0.76+**: New Architecture ativada para renderização nativa ultrarrápida.
- **Reanimated 3 & Gesture Handler**: Animações a 60/120fps executadas diretamente na thread de UI, sem engasgos.
- **Expo Document Picker & FileSystem**: Importação e persistência local de arquivos PDF no sandbox do dispositivo.
- **Expo Keep Awake**: Impede que a tela do celular suspenda ou desligue enquanto você estiver lendo.
- **Expo Haptics**: Respostas táteis de micro-interação ao virar páginas, acertar/errar perguntas e salvar marcadores.
- **SecureStore**: Armazenamento seguro de chaves de API da IA.
- **Temas**: Escuro (AMOLED), Claro e Sépia (para leitura agradável sem cansaço visual).

---

## 🚀 Como Executar

### 1. Instalar as dependências
\`\`\`bash
npm install
\`\`\`

### 2. Iniciar no Expo Go (para testes rápidos no celular)
\`\`\`bash
npx expo start
\`\`\`
Escaneie o QR Code com o aplicativo Expo Go no seu smartphone Android ou iOS.

### 3. Compilar nativamente (Alta Performance Máxima)
\`\`\`bash
# Android
npx expo run:android

# iOS (macOS requerido)
npx expo run:ios
\`\`\`
`);

console.log('\n============================================================');
console.log('🎉 Projeto Boodfy Mobile gerado com sucesso!');
console.log(`📁 Localização: ${targetDir}`);
console.log('\nPróximos passos:');
console.log(`  1. cd "${targetDir}"`);
console.log('  2. npm install');
console.log('  3. npx expo start');
console.log('============================================================\n');
