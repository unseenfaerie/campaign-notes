import { API_BASE_URL } from '../utils/api';
import { prettifyDate } from '../utils/dateUtils';

export function getOrganizations() {
  return fetch(`${API_BASE_URL}/organizations`).then(res => res.json()).then(orgs =>
    orgs.map(org => prettifyOrgDates(org))
  );
}

export function getOrganization(id) {
  return fetch(`${API_BASE_URL}/organizations/${id}`).then(res => res.json()).then(org =>
    prettifyOrgDates(org)
  );
}

function prettifyOrgDates(org) {
  if (!org) return org;
  if (org.founded_date) org.founded_date = prettifyDate(org.founded_date);
  if (org.dissolved_date) org.dissolved_date = prettifyDate(org.dissolved_date);
  // Add more fields as needed
  return org;
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
