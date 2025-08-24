import { API_BASE_URL } from '../utils/api';
import { prettifyDate } from '../utils/dateUtils';

export function getItems() {
  return fetch(`${API_BASE_URL}/items`).then(res => res.json()).then(items =>
    items.map(item => prettifyItemDates(item))
  );
}

export function getItem(id) {
  return fetch(`${API_BASE_URL}/items/${id}`).then(res => res.json()).then(item =>
    prettifyItemDates(item)
  );
}

function prettifyItemDates(item) {
  if (!item) return item;
  if (item.acquired_date) item.acquired_date = prettifyDate(item.acquired_date);
  if (item.relinquished_date) item.relinquished_date = prettifyDate(item.relinquished_date);
  // Add more fields as needed
  return item;
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
