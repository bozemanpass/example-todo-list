# Todo List Application - Backend

This is the backend of the Todo List application, built using Node.js and TypeScript. The backend is responsible for handling API requests, managing the database, and performing CRUD operations on todo items.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- PostgreSQL (version 12 or higher)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd todo-list-app/backend
   ```

2. Install the dependencies:

   ```
   npm install
   ```

3. Set up the PostgreSQL database:

   - Create a new database for the application.
   - Update the database connection settings in the `src/database/index.ts` file.

### Running the Application

To start the backend server, run:

```
npm run start
```

The server will be running on `http://localhost:3000`.

### API Endpoints

- `GET /todos`: Retrieve all todo items.
- `POST /todos`: Create a new todo item.
- `PUT /todos/:id`: Update an existing todo item.
- `DELETE /todos/:id`: Delete a todo item.

### Folder Structure

- `src/app.ts`: Entry point of the application.
- `src/controllers/todoController.ts`: Contains the logic for handling todo-related requests.
- `src/models/todoModel.ts`: Defines the structure of todo items and database interactions.
- `src/routes/todoRoutes.ts`: Sets up the API routes for todo operations.
- `src/database/index.ts`: Manages the database connection.

### License

This project is licensed under the MIT License. See the LICENSE file for details.