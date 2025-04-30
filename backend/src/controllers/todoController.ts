import { Request, Response } from 'express';
import { Todo } from '../models/todoModel';

export const getTodos = async (req: Request, res: Response) => {
  const todos = await Todo.findAll();
  res.json(todos);
};

export const createTodo = async (req: Request, res: Response) => {
  const { title, completed } = req.body;
  const newTodo = await Todo.create({ title, completed });
  res.status(201).json(newTodo);
};

export const updateTodo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  const todo = await Todo.findByPk(id);
  if (!todo) return res.status(404).json({ message: 'Todo not found' });

  // Update only the fields provided in the request body
  if (title !== undefined) todo.title = title;
  if (completed !== undefined) todo.completed = completed;

  await todo.save();
  res.json(todo);
};

export const deleteTodo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const todo = await Todo.findByPk(id);
  if (!todo) return res.status(404).json({ message: 'Todo not found' });

  await todo.destroy();
  res.status(204).send();
};