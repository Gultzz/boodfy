# 📋 ESPECIFICAÇÃO MESTRE & SCRIPT DE EXECUÇÃO: BOODFY MOBILE
> **Instruções para o Agente de IA (Gemini 4 Neon)**:
> Você é um Engenheiro de Software Mobile Sênior especialista em **React Native**, **Expo SDK 52 (New Architecture)**, **Reanimated 3**, **Zustand** e **UI/UX Minimalista**.
> Sua missão é construir o aplicativo mobile **Boodfy** (leitor inteligente de PDFs com Modo Estudante e IA) do zero até a conclusão, seguindo rigorosamente a arquitetura, regras de desempenho, acessibilidade e algoritmos descritos abaixo.

---

## 🎯 1. VISÃO GERAL DO PROJETO & REQUISITOS CHAVE

O **Boodfy Mobile** é a versão para iOS e Android do Boodfy Desktop. O aplicativo permite gerenciar livros PDF, lê-los com máximo conforto visual e estudar capítulos através de quizzes gerados de forma algorítmica (offline) ou via IA (Google Gemini, OpenAI, Groq, Ollama).

### Princípios Inegociáveis:
1. **Performance Máxima (60/120 FPS)**: Animações de gestos e transições executadas estritamente na UI Thread através de `react-native-reanimated` e `react-native-gesture-handler`.
2. **Design Limpo e Elegante (Não Poluído)**: Inspirado no Apple Books e Notion. Sem excessos visuais, com espaçamentos respiráveis e tipografia nítida.
3. **Acessibilidade (WCAG 2.1 AA)**: Todos os alvos de toque (`touch targets`) devem ter no mínimo **48x48 dp**. Contrastes rigorosos para leitura.
4. **Resiliência e Offline-First**: O app funciona perfeitamente sem internet (leitura, progresso, marcadores e quiz offline).

---

## 🛠️ 2. STACK TECNOLÓGICA OBRIGATÓRIA

- **Framework**: Expo SDK 52+ (`newArchEnabled: true` para Fabric & TurboModules)
- **Linguagem**: TypeScript em modo estrito (`strict: true`)
- **Estilização**: StyleSheet nativo com design tokens centralizados ou NativeWind
- **Animações & Gestos**: `react-native-reanimated` (~3.16+) + `react-native-gesture-handler`
- **Ícones**: `lucide-react-native`
- **Estado Global**: `zustand` (stores desacopladas)
- **Armazenamento**:
  - Dados estruturados: `@react-native-async-storage/async-storage` (ou `react-native-mmkv`)
  - Chaves de API: `expo-secure-store`
  - Arquivos PDF físicos: `expo-file-system` (sandbox persistente `documentDirectory`)
- **Utilitários Nativos**:
  - `expo-keep-awake`: Manter a tela do celular acesa durante a leitura
  - `expo-haptics`: Feedback tátil ao virar páginas, acertar questões e favoritar
  - `expo-document-picker`: Selecionar arquivos PDF do celular
  - `expo-status-bar`: Controle dinâmico do tema

---

## 📂 3. ESTRUTURA DE DIRETÓRIOS DO PROJETO

```text
boodfy-mobile/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── App.tsx
└── src/
    ├── types/
    │   └── index.ts                 # Interfaces de Book, Chapter, Quiz, Bookmark, etc.
    ├── theme/
    │   ├── colors.ts                # Paletas Dark (AMOLED), Light e Sepia
    │   ├── typography.ts            # Escala tipográfica
    │   └── spacing.ts               # Espaçamentos e raios de borda
    ├── services/
    │   ├── storage.ts               # Camada de persistência JSON + SecureStore
    │   ├── chapter-cropper.ts       # Algoritmo de corte de texto estrito por capítulo
    │   ├── quiz-generator.ts        # Gerador algorítmico offline v4 (Mulberry32)
    │   ├── quiz-ai.ts               # Integração com APIs LLM (Gemini, OpenAI, Groq)
    │   └── study-service.ts         # Cálculo de estatísticas e tentativas
    ├── stores/
    │   ├── useLibraryStore.ts       # Livros, progresso, busca, filtros e marcadores
    │   ├── useThemeStore.ts         # Tema ativo (Dark, Light, Sepia)
    │   └── useStudyStore.ts         # Quizzes salvos e histórico de estudos
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx           # Botão animado com haptics e variantes
    │   │   ├── Card.tsx             # Superfície elegante com bordas suaves
    │   │   ├── ProgressBar.tsx      # Barra de progresso animada
    │   │   └── BottomSheet.tsx      # Painel deslizante com física de mola
    │   ├── Library/
    │   │   ├── BookCard.tsx         # Card de livro com capa, progresso e menu
    │   │   ├── ContinueReadingCard.tsx # Destaque do último livro lido
    │   │   └── StreakBadge.tsx      # Contador de streak com ícone de chama
    │   ├── Reader/
    │   │   ├── ReaderControls.tsx   # Header e footer flutuantes que somem no toque
    │   │   └── BookmarksModal.tsx   # Modal com lista e salto para marcadores
    │   └── Study/
    │       ├── QuizCard.tsx         # Card da pergunta e alternativas A/B/C/D
    │       └── QuizResults.tsx      # Resumo da tentativa com métricas
    └── screens/
        ├── LibraryScreen.tsx        # Tela inicial com busca, filtros e lista
        ├── ReaderScreen.tsx         # Tela de leitura imersiva com keep-awake
        ├── StudyScreen.tsx          # Modo Estudante (Offline e IA)
        └── SettingsScreen.tsx       # Configuração de temas e chaves de IA
```

---

## 🧠 4. ALGORITMOS E REGRAS DE NEGÓCIO ESSENCIAIS

### A. Algoritmo de Recorte de Capítulo (`chapter-cropper.ts`)
**Problema:** Em livros PDF, um capítulo pode começar no meio de uma página onde o capítulo anterior ainda estava terminando, ou terminar no topo de uma página onde o próximo já começa. Se todo o texto for enviado ao quiz, haverá perguntas de capítulos errados.
**Regra de Implementação:**
1. Na página inicial (`chapter.startPage`): localizar o início do título do capítulo e **descartar tudo o que veio antes** (`text.slice(startIdx)`).
2. Na página final / transição (`nextBoundary.startPage`): localizar o título do próximo capítulo e **descartar tudo a partir dele** (`text.slice(0, nextIdx)`).
3. Utilizar correspondência em 4 níveis para achar títulos com segurança:
   - Busca exata case-insensitive.
   - Regex com tolerância a múltiplas quebras de linha e hifens.
   - Correspondência pelas primeiras 3 palavras-chave.
   - Identificadores de numeração ("Capítulo X", "Cap. X").

### B. Algoritmo do Quiz Offline (`quiz-generator.ts`)
1. **Versão**: Fixar `QUIZ_GENERATOR_VERSION = 4`.
2. **Determinismo**: Usar gerador pseudoaleatório `mulberry32` inicializado com hash de `chapter.id + QUIZ_GENERATOR_VERSION + seed`. Isso garante que as perguntas sejam consistentes a cada tentativa para o mesmo capítulo.
3. **Tipos de Questão**:
   - `cloze`: Oculta termos conceituais importantes com `__________`.
   - `comprehension`: Pergunta sobre a ideia central do capítulo.
   - Filtrar stopwords em português para nunca testar palavras vazias.

### C. Integração com IA (`quiz-ai.ts`)
1. Limitar o corpus enviado a ~12.000 caracteres para garantir respostas ultrarrápidas (< 3 segundos) e não estourar rate limits gratuitos.
2. Prompt do Sistema: focado em **conceitos, sabedoria e entendimento prático**, e não em memorização boba de palavras.
3. Resposta obrigatória em formato JSON estrito com array `questions`.

---

## 🎨 5. DESIGN SYSTEM & TEMAS

```typescript
export const PALETTE = {
  dark: {
    bg: '#09090b',          // AMOLED Black
    surface: '#121215',     // Cards
    border: '#27272a',      // Bordas sutis
    text: '#fafafa',        // Alto contraste
    textMuted: '#71717a',
    primary: '#6366f1',     // Indigo moderno
    accent: '#10b981',      // Esmeralda para acertos e streak
    danger: '#f43f5e',      // Rose para erros
    warning: '#f59e0b',     // Âmbar para marcadores
  },
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#94a3b8',
    primary: '#4f46e5',
    accent: '#059669',
    danger: '#e11d48',
    warning: '#d97706',
  },
  sepia: {
    bg: '#fbf0d9',          // Fundo quente tipo papel antigo
    surface: '#f4e5c3',
    border: '#dec99d',
    text: '#433422',        // Tinta marrom escuro
    textMuted: '#967f63',
    primary: '#9c5b24',
    accent: '#477a43',
    danger: '#b33939',
    warning: '#b8621b',
  }
};
```

---

## 👣 6. ROTEIRO PASSO A PASSO DE IMPLEMENTAÇÃO

Ao iniciar a geração do código, execute as etapas nesta ordem rigorosa:

### Passo 1: Inicialização do Projeto
- Configurar `package.json` com as dependências do Expo 52 e plugins nativos.
- Configurar `app.json` com `newArchEnabled: true` e permissões de leitura/escrita de arquivos.
- Configurar `tsconfig.json` com path alias `@/*`.

### Passo 2: Tipos & Design Tokens
- Criar `src/types/index.ts` com todas as interfaces (`Book`, `Bookmark`, `Chapter`, `Quiz`, `QuizQuestion`, `StreakInfo`, etc.).
- Criar `src/theme/index.ts` com as paletas `dark`, `light` e `sepia`.

### Passo 3: Serviços e Algoritmos
- Implementar `src/services/storage.ts` com `AsyncStorage` e `SecureStore`.
- Implementar `src/services/chapter-cropper.ts` com a lógica de corte de início e fim de capítulo.
- Implementar `src/services/quiz-generator.ts` (versão 4 com PRNG Mulberry32).
- Implementar `src/services/quiz-ai.ts` para chamadas via `fetch` à OpenAI/Gemini com chave segura.

### Passo 4: Stores Zustand
- Criar `useThemeStore`: controle reativo de tema e persistência.
- Criar `useLibraryStore`: carregamento de livros, importação via `expo-file-system`, atualização de progresso, cálculo de streak diário consecutivo e marcadores com cores.
- Criar `useStudyStore`: salvamento de quizzes e histórico de tentativas.

### Passo 5: Componentes UI Reutilizáveis
- `Button.tsx`: Botão com animação de escala suave, haptic feedback e suporte a loading.
- `ProgressBar.tsx`: Barra com preenchimento animado.
- `BookCard.tsx`: Card de livro com capa, badge de páginas e botão de opções.
- `ContinueReadingCard.tsx`: Destaque com botão play para retorno imediato à leitura.

### Passo 6: Telas da Aplicação
- **`LibraryScreen.tsx`**: Barra de busca, filtros (`Todos`, `Lendo`, `Não lidos`, `Concluídos`), contador de streak com ícone de chama e botão de importar PDF.
- **`ReaderScreen.tsx`**: Visualização fluida do livro, modo imersivo (toque oculta barras), `useKeepAwake` ativo, slider de páginas com vibração e modal de marcadores.
- **`StudyScreen.tsx`**: Modo Estudante com escolha entre Offline e IA, cartas de alternativas A/B/C/D com animação e feedback háptico (sucesso/erro), explicação do conceito e tela de resultados.
- **`SettingsScreen.tsx`**: Seletor de temas (Dark, Light, Sepia) e input seguro para API Key.
- **`App.tsx`**: Configuração do `SafeAreaProvider`, barra de navegação inferior e gerenciamento de transição de telas.

### Passo 7: Validação e Testes
- Executar `tsc --noEmit` para garantir 0 erros de tipagem.
- Verificar se todas as chamadas assíncronas possuem `try/catch` amigável ao usuário.
