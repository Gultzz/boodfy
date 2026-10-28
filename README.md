<div align="center">

# 📖 Boodfy

### O leitor e ambiente de estudos definitivo para quem leva livros e PDFs a sério.

**100% Offline · Sem Rastreamento · Feito para Alta Performance**

[![Release](https://img.shields.io/github/v/release/SEU-USUARIO/boodfy?color=6366f1&style=for-the-badge)](https://github.com/SEU-USUARIO/boodfy/releases)
[![Platform](https://img.shields.io/badge/Plataformas-Windows%20%7C%20macOS%20%7C%20Linux-0f172a?style=for-the-badge)](#download)
[![License](https://img.shields.io/badge/Licen%C3%A7a-MIT-10b981?style=for-the-badge)](LICENSE)
[![Offline First](https://img.shields.io/badge/Privacidade-100%25%20Offline-blueviolet?style=for-the-badge)](#privacidade)

<p align="center">
  O Boodfy não é apenas um visualizador de PDFs comum. Ele transforma qualquer livro digital em uma estação imersiva de aprendizado — combinando leitura focada, continuidade instantânea, ferramentas avançadas de estudo e integração opcional com IA local.
</p>

[Download Grátis](#download) • [Funcionalidades](#-funcionalidades) • [Modo Estudante](#-modo-estudante-completo) • [Diferenciais](#-por-que-o-boodfy)

</div>

---

## ⚡ Por que o Boodfy é diferente?

A maioria dos leitores de PDF foi feita para assinar contratos ou visualizar documentos corporativos genéricos — eles são lentos, pesados, esquecem onde você parou e não ajudam você a reter o conhecimento.

O **Boodfy foi desenhado do zero para leitores e estudantes vorazes**:

- 🔒 **Zero Telemetria ou Contas Obrigatórias**: Seus livros, anotações e hábitos de estudo permanecem no seu computador.
- ⚡ **Desempenho Extremo**: Abre livros volumosos de mais de 2.000 páginas e centenas de capítulos sem travar.
- 🎯 **Continuidade Sem Fricção**: Toda vez que você abre um livro, ele está exatamente na página e parágrafo em que você parou.

---

## ✨ Funcionalidades em Destaque

### 🖼️ Atalhos de Livros na Área de Trabalho (Exclusivo)

> _Abra seu livro favorito com 2 cliques na sua Área de Trabalho, como se fosse um aplicativo próprio._

- Clique com o botão direito em qualquer livro da biblioteca e selecione **"Criar atalho na Área de Trabalho"**.
- O Boodfy cria um arquivo `.ico` nativo em alta resolução (256×256) exibindo a **capa real do livro** em proporção 3D com um selo discreto do Boodfy no canto.
- Ao clicar no atalho, o Boodfy inicializa e **abre diretamente na última página lida daquele livro específico**.

---

### 📑 Motor de Leitura de Nova Geração

- **Navegação Profunda por Sumário**: Extração recursiva de índices complexos, garantindo acesso imediato a todos os capítulos mesmo em livros técnicos com centenas de seções.
- **Miniaturas em Tempo Real**: Barra lateral com visualização rápida das páginas para navegação visual fluida.
- **Modos de Exibição & Zoom Dinâmico**: Página única, página dupla, ajuste à largura, altura e modo tela cheia sem distrações (_F11_).
- **Busca Rápida de Texto**: Localize palavras-chave e citações com realce visual instantâneo.
- **Temas Adaptativos**: Modo Escuro profundo (_Deep Dark_), Modo Claro suave e sincronização com as cores do seu sistema operacional.

---

### 🎓 Modo Estudante Completo

Transforme a leitura passiva em **retenção ativa** de conteúdo:

| Recurso                      | Descrição                                                                                                                                                 |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🗂️ **Flashcards Integrados** | Crie cartões de repetição espaçada vinculados ao livro que está lendo. Revise conceitos-chave com sistema de virada dinâmica e acompanhamento de domínio. |
| 📝 **Smart Notes**           | Anote percepções, resumos de capítulos e citações importantes diretamente na barra lateral, sem precisar alternar para outro app de notas.                |
| ❓ **Quizzes de Fixação**    | Teste sua compreensão gerando perguntas e respostas para avaliar se o conteúdo foi realmente assimilado.                                                  |
| ⏱️ **Pomodoro Timer**        | Temporizador de foco e intervalos integrado na tela de leitura, permitindo manter sessões de estudo disciplinadas sem sair do livro.                      |

---

### 🧠 Inteligência Artificial (Opcional & Privada)

Quer um assistente para resumir parágrafos difíceis, explicar conceitos ou criar flashcards automaticamente?

- Suporte a modelos **100% Locais via Ollama** (Llama 3, DeepSeek, Qwen) — sem enviar nenhum dado para a internet.
- Suporte a provedores de nuvem rápidos como **Google Gemini**, **Groq** e **OpenRouter**.
- Suas chaves de API são armazenadas com **criptografia nativa do sistema operacional** (`safeStorage`).

---

### 📊 Hábitos e Métricas de Leitura

- **Ofensivas Diárias (Streaks)**: Acompanhe sua consistência diária de leitura.
- **Histórico & Progresso**: Saiba exatamente quanto tempo você dedicou a cada livro, páginas lidas por sessão e porcentagem concluída.
- **Organização por Tags & Categorias**: Filtre sua biblioteca por assunto, prioridade, status de leitura ou tags personalizadas.
- **Drag & Drop e Monitor de Pastas**: Basta arrastar PDFs para dentro do app ou selecionar uma pasta do seu computador para indexação automática.

---

## 🚀 Como Baixar e Usar

### Download Direto

Baixe a versão mais recente pronta para uso na aba de [Releases](https://github.com/Gultzz/boodfy/releases):

- **Windows**: `boodfy-setup.exe` (Instalador com suporte a atalhos e protocolo nativo)
- **Linux**: `boodfy.AppImage` / `.deb`
- **macOS**: `boodfy.dmg`

---

## 🛠️ Tecnologias Utilizadas

O Boodfy foi construído aliando estabilidade de sistemas com uma experiência de interface moderna:

- **Core & Runtime**: [Electron](https://www.electronjs.org/) + [Node.js](https://nodejs.org/)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Motor de Renderização PDF**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand)
- **Ícones & Estilização**: [Lucide Icons](https://lucide.dev/) + CSS Modular com aceleração por hardware

---

## 💻 Desenvolvimento Local

Se você deseja contribuir ou rodar o projeto a partir do código-fonte:

```bash
# 1. Clone o repositório
git clone https://github.com/Gultzz/boodfy.git
cd boodfy

# 2. Instale as dependências
npm install

# 3. Inicie em modo de desenvolvimento
npm run dev

# 4. Validar tipos e padrões de código
npm run check-all

# 5. Compilar o instalador de produção
npm run build
```

---

## 🛡️ Privacidade em Primeiro Lugar

O Boodfy foi criado com o princípio de soberania de dados:

1. **Nenhum livro seu é enviado para servidores externos.**
2. Todas as capas, anotações, histórico de leitura e atalhos residem unicamente no diretório de dados local do seu usuário.
3. Se você optar por usar IA local (Ollama), até mesmo a inteligência artificial roda na GPU/CPU do seu próprio computador.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais detalhes.

<div align="center">
  <sub>Desenvolvido com carinho para quem ama aprender através dos livros.</sub>
</div>

