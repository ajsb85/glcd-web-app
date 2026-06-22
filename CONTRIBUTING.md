# Contributing to GLCD Web App

Thank you for your interest in contributing to **GLCD Web App** (formerly GLCD Font Studio)! We welcome contributions from the community to help make this the best browser-based font generation and emulation tool for embedded displays.

This document outlines our development workflow and guidelines. Please read them carefully before opening a pull request.

## Development Workflow

This project is built using modern **Enterprise TypeScript** and **Vite**. The UI is strictly separated from the core hex parsing and array generation logic.

### 1. Project Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/ajsb85/glcd-web-app.git
   cd glcd-web-app
   ```
2. **Install dependencies:**
   We use `npm` as our package manager.
   ```bash
   npm install
   ```
3. **Start the local dev server:**
   ```bash
   npm run dev
   ```
   This will boot up a Vite hot-reloading dev server (usually on `http://localhost:5173`).

### 2. Architecture Overview
- `src/core/`: Contains the pure, headless TypeScript logic.
  - `parser.ts`: Parses raw C-arrays into abstract `FontData` objects.
  - `generator.ts`: Converts system fonts or TTF files into raw pixel byte arrays.
  - `types.ts`: Core interfaces (`FontData`, `Glyph`, etc).
- `src/ui/`: Contains the DOM abstraction layers.
  - `emulator.ts`: Handles strictly Canvas2D drawing operations to emulate LCD matrices.
- `src/main.ts`: The main application orchestrator binding the UI events to the Core.

### 3. Testing and Linting
We maintain high code quality standards. Before committing, ensure your code passes both the linter and the unit tests.

- **Run unit tests (Vitest):**
  ```bash
  npm test
  ```
- **Run the linter (ESLint):**
  ```bash
  npm run lint
  ```
  *(Note: We use the modern flat config `eslint.config.js` and enforce strict typing. Avoid using `any`)*.

### 4. Building & GitHub Pages Deployment
Because this project is hosted on GitHub Pages directly out of the `docs/` directory on the `main` branch, **every Pull Request that affects the application must include the rebuilt `/docs` directory**.

When you are ready to finalize your feature:
1. Run the build compiler:
   ```bash
   npm run build
   ```
2. Ensure the `docs/` folder has been generated and updated.
3. Stage both your source files (`src/`) and the compiled output (`docs/`).

### 5. Committing Your Changes
We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification and **strongly require** cryptographic commit signing.

- **Conventional Commits**: Use semantic prefixes for your commits:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `chore:` for maintenance or dependency updates
  - `refactor:` for code refactoring

- **GPG Signing**: All commits should ideally be signed. Ensure your Git client is configured with your GPG key:
  ```bash
  git commit -S -m "feat: implement advanced font kerning"
  ```

### 6. Pull Request Process
1. Push your changes to your fork.
2. Open a Pull Request against the `main` branch.
3. Describe exactly what you changed and why.
4. Ensure the CI checks (if any) pass and the `docs/` directory contains the latest build.

Thank you for contributing!
