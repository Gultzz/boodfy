# BooklyPDF — Leitor Pessoal de Livros PDF para Windows

O **BooklyPDF** é um aplicativo desktop completo e de alto desempenho para leitura individual e focada de livros em formato PDF no Windows. O projeto utiliza **Electron + React + TypeScript + Vite**, garantindo velocidade, segurança e isolamento total: **todo o armazenamento é local (sem bancos de dados, servidores remotos ou rastreamento)**.

---

## 🚀 Tecnologias e Arquitetura

- **Electron**: Processo principal com `contextIsolation: true`, `nodeIntegration: false` e sandbox configurado, utilizando IPC seguro via `preload.ts`.
- **React 18 + TypeScript**: Interface tipada, componentes modulares e desacoplados.
- **Vite**: Bundler ultra-rápido configurado com plugins oficiais para Electron e compilação do renderer.
- **PDF.js / react-pdf**: Renderização nativa de PDF com foco em qualidade de exibição e economia de memória.
- **Lucide React**: Ícones consistentes, leves e modernos.
- **Armazenamento Seguro em JSON**:
  - Diretório: `app.getPath('userData')` (independente de atualizações/reinstalações).
  - Escrita atômica segura via arquivo temporário `.tmp` e substituição para evitar corrupção de dados em quedas abruptas de energia ou fechamento repentino.
  - Arquivos: `library.json`, `reading-progress.json`, `reading-history.json` e `settings.json`.

---

## 🛠️ Ferramentas de Qualidade Configuradas

- **ESLint 9 (Flat Config)**: Análise estática de código com regras do TypeScript e React Hooks.
- **Prettier**: Padronização e formatação automática de código.
- **TypeScript**: Verificação estrita de tipagem (`tsc --noEmit`).

---

## 📋 Scripts Disponíveis

Execute os scripts via terminal (PowerShell / Prompt de Comando):

```bash
# Instalação de dependências
cmd /c "npm install"

# Verificação de Tipos
cmd /c "npm run typecheck"

# Linting do Código
cmd /c "npm run lint"

# Formatação de Código
cmd /c "npm run format"

# Executar verificações de código (Typecheck + Lint)
cmd /c "npm run check-all"

# Iniciar em Modo de Desenvolvimento (Desktop)
cmd /c "npm run dev"

# Compilar para Produção e Gerar Instalador Windows (.exe)
cmd /c "npm run build"
```

---

## 📖 Funcionalidades Principais

1. **Biblioteca Local**:
   - Adicione PDFs avulsos ou selecione uma pasta monitorada (com varredura recursiva de subpastas sem duplicatas).
   - Alternância entre visualização em **Grade** e **Lista**.
   - Filtros: *Todos, Não iniciados, Em andamento, Concluídos, Recentes*.
   - Ordenação por *Última leitura, Título e Data de adição*.
   - Tratamento de PDFs movidos, renomeados ou indisponíveis com opção de relocalizar o caminho.
   - Opção para importar cópia do arquivo para o diretório gerenciado pelo app.

2. **Leitor Focado de PDF**:
   - Exibição de **uma página por vez**, maximizando a altura útil da tela sem distorção.
   - Modos de ajuste: **Ajustar à Altura**, **Ajustar à Largura** e **Zoom Manual**.
   - Atalhos de teclado:
     - `Seta Direita`: Próxima página
     - `Seta Esquerda`: Página anterior
     - `Home`: Primeira página
     - `End`: Última página
     - `Esc`: Sair do Modo Foco
     - `F11`: Alternar Tela Cheia nativa
   - Campo numérico para pular diretamente para qualquer página.
   - Barra lateral retrátil de miniaturas das páginas.
   - **Modo Foco**: Oculta controles automaticamente para leitura imersiva.

3. **Salvamento Automático de Progresso**:
   - Salva a posição individual de cada livro conforme o leitor navega.
   - Ao reabrir o livro ou o aplicativo, a leitura é retomada exatamente na última página visitada.

4. **Histórico de Leitura**:
   - Registro de sessões com data/hora de abertura, página inicial e página final alcançada.

