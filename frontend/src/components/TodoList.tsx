import React, { useState } from 'react';
import { Todo } from '../types';

interface Props {
    todos: Todo[];
    onAddTodo: (title: string) => void;
    onToggleTodo: (id: number, completed: boolean) => void;
    onEditTodo: (id: number, title: string) => void;
}

const TodoList: React.FC<Props> = ({ todos, onAddTodo, onToggleTodo, onEditTodo }) => {
    const [newTodo, setNewTodo] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const handleAdd = () => {
        if (newTodo.trim()) {
            onAddTodo(newTodo);
            setNewTodo('');
        }
    };

    const handleEdit = (id: number, title: string) => {
        setEditingId(id);
        setEditingTitle(title);
    };

    const handleSaveEdit = (id: number) => {
        if (editingTitle.trim()) {
            onEditTodo(id, editingTitle);
            setEditingId(null);
            setEditingTitle('');
        }
    };

    return (
        <div>
            <ul>
                {todos.map((todo) => (
                    <li key={todo.id}>
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => onToggleTodo(todo.id, !todo.completed)}
                        />
                        {editingId === todo.id ? (
                            <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => handleSaveEdit(todo.id)} // Save on blur
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(todo.id); // Save on Enter key
                                    if (e.key === 'Escape') setEditingId(null); // Cancel on Escape key
                                }}
                                autoFocus
                            />
                        ) : (
                            <span
                                onClick={() => handleEdit(todo.id, todo.title)}
                                style={{
                                    cursor: 'pointer',
                                    textDecoration: todo.completed ? 'line-through' : 'none',
                                    color: todo.completed ? 'gray' : 'inherit',
                                }}
                            >
                {todo.title}
              </span>
                        )}
                    </li>
                ))}
            </ul>
            <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd(); // Add todo on Enter key
                }}
            />
            <button onClick={handleAdd}>Add Todo</button>
        </div>
    );
};

export default TodoList;