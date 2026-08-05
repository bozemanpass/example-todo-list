import React, { useState } from 'react';
import { Todo } from '../types';

interface Props {
    todos: Todo[];
    loading?: boolean;
    onAddTodo: (title: string) => void;
    onToggleTodo: (id: number, completed: boolean) => void;
    onEditTodo: (id: number, title: string) => void;
    onDeleteTodo: (id: number) => void;
}

const TrashIcon: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            d="M4 7h16M10 4h4M9.5 7.5v10M14.5 7.5v10M6.5 7l.8 12.1a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const EmptyState: React.FC = () => (
    <div className="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="#dadce0" strokeWidth="1.6" />
            <path d="M8 2.5v3M16 2.5v3" stroke="#dadce0" strokeWidth="1.6" strokeLinecap="round" />
            <path
                d="M8.5 13.5l2.2 2.2L15.8 10.6"
                stroke="#1a73e8"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
        <p className="empty-state-title">No todos yet</p>
        <p>Add your first task using the field below.</p>
    </div>
);

const TodoList: React.FC<Props> = ({
    todos,
    loading,
    onAddTodo,
    onToggleTodo,
    onEditTodo,
    onDeleteTodo,
}) => {
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
        }
        setEditingId(null);
        setEditingTitle('');
    };

    return (
        <div>
            {!loading && todos.length === 0 ? (
                <EmptyState />
            ) : (
                <ul className="todo-list">
                    {todos.map((todo) => (
                        <li
                            key={todo.id}
                            className={`todo-item${todo.completed ? ' is-completed' : ''}`}
                        >
                            <input
                                className="todo-checkbox"
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => onToggleTodo(todo.id, !todo.completed)}
                                aria-label={`Mark "${todo.title}" as ${todo.completed ? 'not done' : 'done'}`}
                            />
                            {editingId === todo.id ? (
                                <input
                                    className="text-field text-field-inline"
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => handleSaveEdit(todo.id)} // Save on blur
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(todo.id); // Save on Enter key
                                        if (e.key === 'Escape') setEditingId(null); // Cancel on Escape key
                                    }}
                                    aria-label="Edit todo title"
                                    autoFocus
                                />
                            ) : (
                                <>
                                    <span
                                        className="todo-title"
                                        title="Click to edit"
                                        onClick={() => handleEdit(todo.id, todo.title)}
                                    >
                                        {todo.title}
                                    </span>
                                    <span className="todo-status">
                                        <span className={`chip ${todo.completed ? 'chip-done' : 'chip-open'}`}>
                                            {todo.completed ? 'Done' : 'Open'}
                                        </span>
                                    </span>
                                </>
                            )}
                            <button
                                className="icon-button icon-button-danger"
                                onClick={() => onDeleteTodo(todo.id)}
                                title="Delete"
                                aria-label={`Delete "${todo.title}"`}
                            >
                                <TrashIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="add-row">
                <input
                    className="text-field"
                    type="text"
                    value={newTodo}
                    placeholder="Add a task"
                    aria-label="New todo title"
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd(); // Add todo on Enter key
                    }}
                />
                <button
                    className="button button-primary"
                    onClick={handleAdd}
                    disabled={!newTodo.trim()}
                >
                    Add
                </button>
            </div>
        </div>
    );
};

export default TodoList;
