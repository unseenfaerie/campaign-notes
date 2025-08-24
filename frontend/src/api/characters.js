import { API_BASE_URL } from '../utils/api';
import { prettifyDate } from '../utils/dateUtils';

export function getCharacters() {
  return fetch(`${API_BASE_URL}/characters`).then(res => res.json()).then(characters =>
    characters.map(char => prettifyCharacterDates(char))
  );
}

export function getCharacter(id) {
  return fetch(`${API_BASE_URL}/characters/${id}`).then(res => res.json()).then(char =>
    prettifyCharacterDates(char)
  );
}

function prettifyCharacterDates(char) {
  if (!char) return char;
  if (char.birth_date) char.birth_date = prettifyDate(char.birth_date);
  if (char.death_date) char.death_date = prettifyDate(char.death_date);
  // Add more fields as needed
  return char;
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
