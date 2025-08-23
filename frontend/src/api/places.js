import { API_BASE_URL } from '../utils/api';

export function getPlaces() {
  return fetch(`${API_BASE_URL}/places`).then(res => res.json());
}

export function getPlace(id) {
  return fetch(`${API_BASE_URL}/places/${id}`).then(res => res.json());
}

export function createPlace(data) {
  return fetch(`${API_BASE_URL}/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function updatePlace(id, data) {
  return fetch(`${API_BASE_URL}/places/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function deletePlace(id) {
  return fetch(`${API_BASE_URL}/places/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());
}
