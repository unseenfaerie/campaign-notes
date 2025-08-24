
import { API_BASE_URL } from '../utils/api';
import { prettifyDate } from '../utils/dateUtils';

export function getFullCharacterById(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/full`).then(res => res.json());
}

export function getCharacterDeities(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/deities`).then(res => res.json());
}

export function getCharacterOrganizations(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/organizations`).then(res => res.json()).then(orgs =>
    orgs.map(org => {
      if (org.history && Array.isArray(org.history)) {
        org.history = org.history.map(record => ({
          ...record,
          joined_date: record.joined_date ? prettifyDate(record.joined_date) : record.joined_date,
          left_date: record.left_date ? prettifyDate(record.left_date) : record.left_date
        }));
      }
      return org;
    })
  );
}

export function getCharacterItems(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/items`).then(res => res.json()).then(items =>
    items.map(item => {
      if (item.history && Array.isArray(item.history)) {
        item.history = item.history.map(record => ({
          ...record,
          acquired_date: record.acquired_date ? prettifyDate(record.acquired_date) : record.acquired_date,
          relinquished_date: record.relinquished_date ? prettifyDate(record.relinquished_date) : record.relinquished_date
        }));
      }
      return item;
    })
  );
}

export function getCharacterEvents(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/events`).then(res => res.json());
}

export function getCharacterRelationships(characterId) {
  return fetch(`${API_BASE_URL}/characters/${characterId}/relationships`).then(res => res.json());
}
