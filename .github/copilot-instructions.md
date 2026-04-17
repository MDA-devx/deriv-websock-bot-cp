# Copilot Instructions for This Repository

## Build, Test, and Lint Commands

- This project is a modular web application for a trading bot UI, structured for real-time performance and a lightweight interface.
- The codebase is organized into:
  - A backend (API server) for real-time data, trading logic, and WebSocket management.
  - A frontend (SPA or multi-page app) for the user interface, built with a modern JS framework or vanilla JS.
  - Separate JavaScript files for UI logic, charting, and indicator calculations.
  - Dedicated CSS files for styling, ensuring a clean and responsive design.
- Build, test, and lint commands should be defined in package.json or equivalent build system. Document them here as the project evolves.
- To run a single test, use the appropriate test runner (e.g., `npm test -- <pattern>` for JS projects).

## High-Level Architecture

- The app consists of a backend server (Node.js/Express or similar) and a frontend client.
- The backend handles:
  - Real-time data aggregation from Deriv API and other sources
  - Business logic, trading signals, and user authentication
  - WebSocket endpoints for pushing updates to the frontend
- The frontend handles:
  - UI rendering (sidebar for parameters, main area for charts)
  - Consuming backend APIs and WebSocket streams
  - Chart rendering using Lightweight Charts or similar libraries
  - Calculation and display of technical indicators (SMA, EMA, RSI, Bollinger Bands)
  - Real-time logs and signal display
- Code is split into logical modules for maintainability and scalability.

## Key Conventions

- Configuration (API token, App ID, indicator periods) is managed via environment variables, config files, or UI inputs as appropriate.
- All business logic and indicator calculations are separated from UI code.
- Styles are managed in dedicated CSS files or CSS-in-JS solutions.
- Spanish remains the primary language for UI labels and comments unless otherwise specified.
- Follow modular and scalable patterns for all new code.

---

If you add build tools, tests, or split code into modules, update this file accordingly.
