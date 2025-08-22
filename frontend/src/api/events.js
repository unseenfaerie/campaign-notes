import { API_BASE_URL } from '../utils/api';

export function getEvents() {
  return fetch(`${API_BASE_URL}/events`).then(res => res.json());
}

export function getEvent(id) {
  return fetch(`${API_BASE_URL}/events/${id}`).then(res => res.json());
}

export function updateEvent(id, data) {
  return fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

// Add more event-related API functions as needed
