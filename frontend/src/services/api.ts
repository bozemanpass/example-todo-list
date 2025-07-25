import axios from 'axios';
import { Todo } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const fetchTodos = async (): Promise<Todo[]> => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createTodo = async (todo: Partial<Todo>): Promise<Todo> => {
  const response = await axios.post(API_URL, todo);
  return response.data;
};

export const updateTodo = async (id: number, updates: Partial<Todo>): Promise<Todo> => {
  const response = await axios.put(`${API_URL}/${id}`, updates);
  return response.data;
};