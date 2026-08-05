import React, { useState, useEffect } from 'react';
import TodoList from '../components/TodoList';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../services/api';
import { Todo } from '../types';

const HomePage: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos()
      .then(setTodos)
      .catch(() => setError('Could not load your todos. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddTodo = async (title: string) => {
      const newTodo = await createTodo({ title, completed: false });
      setTodos([...todos, newTodo]);
  };

  const handleToggleTodo = async (id: number, completed: boolean) => {
      const updatedTodo = await updateTodo(id, { completed });
      setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
  };

  const handleEditTodo = async (id: number, title: string) => {
      const updatedTodo = await updateTodo(id, { title });
      setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
  };

  const handleDeleteTodo = async (id: number) => {
      await deleteTodo(id);
      setTodos(todos.filter((todo) => todo.id !== id));
  };

  const remaining = todos.filter((todo) => !todo.completed).length;

  return (
      <>
        <h2 className="page-heading">Your todos</h2>
        <p className="page-description">
          A small React, Node.js and PostgreSQL application, packaged as a stack.
        </p>

        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tasks</h3>
            <p className="card-subtitle">
              {loading
                ? 'Loading…'
                : `${todos.length} total · ${remaining} remaining`}
            </p>
          </div>
          <TodoList
              todos={todos}
              loading={loading}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onEditTodo={handleEditTodo}
              onDeleteTodo={handleDeleteTodo}
          />
        </div>
      </>
  );
};

export default HomePage;
