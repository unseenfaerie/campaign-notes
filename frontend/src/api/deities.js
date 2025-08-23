import { API_BASE_URL } from '../utils/api';

export function getDeities() {
  return fetch(`${API_BASE_URL}/deities`).then(res => res.json());
}

export function getDeity(id) {
  return fetch(`${API_BASE_URL}/deities/${id}`).then(res => res.json());
}

export function createDeity(data) {
  return fetch(`${API_BASE_URL}/deities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function updateDeity(id, data) {
  return fetch(`${API_BASE_URL}/deities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function deleteDeity(id) {
  return fetch(`${API_BASE_URL}/deities/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());
}
