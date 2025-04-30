# Frontend Todo List Application

This is a simple Todo List application built with React for the frontend and Node.js for the backend, using PostgreSQL as the database.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
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