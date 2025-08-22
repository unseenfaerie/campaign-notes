import { API_BASE_URL } from '../utils/api';

export function getCharacters() {
  return fetch(`${API_BASE_URL}/characters`).then(res => res.json());
}

export function getCharacter(id) {
  return fetch(`${API_BASE_URL}/characters/${id}`).then(res => res.json());
}

export function updateCharacter(id, data) {
  return fetch(`${API_BASE_URL}/characters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function createCharacter(data) {
  return fetch(`${API_BASE_URL}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function deleteCharacter(id) {
  return fetch(`${API_BASE_URL}/characters/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());
}
