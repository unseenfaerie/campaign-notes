import { API_BASE_URL } from '../utils/api';

export function getOrganizations() {
  return fetch(`${API_BASE_URL}/organizations`).then(res => res.json());
}

export function getOrganization(id) {
  return fetch(`${API_BASE_URL}/organizations/${id}`).then(res => res.json());
}

export function createOrganization(data) {
  return fetch(`${API_BASE_URL}/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function updateOrganization(id, data) {
  return fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export function deleteOrganization(id) {
  return fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());
}
