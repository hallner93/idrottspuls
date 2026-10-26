export const THEMES = [
  { id: 'green', name: 'Skog', color: '#36594b', soft: '#e9efe8' },
  { id: 'blue', name: 'Hav', color: '#365b7c', soft: '#e8f0f7' },
  { id: 'teal', name: 'Turkos', color: '#285e5a', soft: '#e5f1ef' },
  { id: 'violet', name: 'Violett', color: '#5d4b78', soft: '#efebf5' },
  { id: 'plum', name: 'Plommon', color: '#70465c', soft: '#f4ebf0' },
  { id: 'navy', name: 'Marin', color: '#354d70', soft: '#e9eef5' },
  { id: 'rust', name: 'Terrakotta', color: '#8a4b36', soft: '#f5ece6' },
  { id: 'ochre', name: 'Ockra', color: '#785b24', soft: '#f4f0e1' },
  { id: 'rose', name: 'Rosé', color: '#8a4f68', soft: '#f5ebf0' },
  { id: 'slate', name: 'Skiffer', color: '#485866', soft: '#edf0f1' },
];

export function normalizeTheme(value) {
  return THEMES.some(theme => theme.id === value) ? value : 'green';
}

export function refreshOverviewDate(state, today) {
  if (state.page !== 'overview' || !state.followsToday || state.date === today) return false;
  state.date = today;
  return true;
}

export function navigateToDate(state, date) {
  state.date = date;
  state.followsToday = false;
}

export function returnToToday(state, today) {
  state.date = today;
  state.followsToday = true;
}
