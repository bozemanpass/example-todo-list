# Frontend Todo List Application

This is a simple Todo List application built with React for the frontend and Node.js for the backend, using PostgreSQL as the database.

## Getting Started

### Prerequisites

- Node.js (version 20.19 or higher)
- npm (Node package manager)
- PostgreSQL (version 12 or higher)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd todo-list-app/frontend
   ```

2. Install the dependencies:

   ```
   npm install
   ```

### Running the Application

1. Start the development server:

   ```
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000` to view the application.

   The dev server reads the backend location from `VITE_API_URL`, defaulting to
   `http://localhost:5000`.

### Container Build

This app has no Dockerfile. Its container is built by the `webapp`
[wrapper](https://github.com/bozemanpass/stack/blob/main/docs/wrappers.md), declared in
`stacks/todo/stack.yml`: the wrapper runs `npm ci && npm run build` and serves the
resulting `dist/` as static content on port 80.

Because Vite inlines `import.meta.env.*` at build time, the API URL cannot be an
ordinary runtime variable. `.env.production` instead bakes in a placeholder that the
wrapper rewrites at container start from `$API_URL`, so one image can be deployed to
any environment. See the comments in `.env.production`.

Note that a local production build (`npm run build && npm run preview`) therefore
contains the placeholder rather than a usable URL — use `npm start` for development.

### Folder Structure

- `src/`: Contains the source code for the application.
  - `components/`: Contains reusable components like `TodoItem` and `TodoList`.
  - `pages/`: Contains page components, including the `HomePage`.
  - `services/`: Contains API service functions for interacting with the backend.
  - `types/`: Contains TypeScript interfaces for type definitions.

### Usage

- You can add, update, and delete todo items.
- The application communicates with the backend to persist data in the PostgreSQL database.

### License

This project is licensed under the MIT License.