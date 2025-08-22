import { API_BASE_URL } from '../utils/api';

export function getItems() {
  return fetch(`${API_BASE_URL}/items`).then(res => res.json());
}

export function getItem(id) {
  return fetch(`${API_BASE_URL}/items/${id}`).then(res => res.json());
}

export function createItem(data) {
  return fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function updateItem(id, data) {
  return fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function deleteItem(id) {
  return fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());
}
