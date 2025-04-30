import React, { useState, useEffect } from 'react';
import TodoList from '../components/TodoList';
import { fetchTodos, createTodo, updateTodo } from '../services/api';
import { Todo } from '../types';

const HomePage: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetchTodos().then(setTodos);
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

  return (
      <div>
        <h1>Todo List</h1>
          <TodoList
              todos={todos}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onEditTodo={handleEditTodo}
          />
      </div>
  );
};

export default HomePage;