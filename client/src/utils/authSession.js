import { parseJwt } from './jwt';

const ACTIVE_ROLE_KEY = 'activeRole';
const ROLE_HIERARCHY = ['CLIENT', 'LIQUIDADOR', 'ADMIN'];

export function getAvailableRoles(baseRole) {
  const idx = ROLE_HIERARCHY.indexOf(baseRole);
  if (idx < 0) return [baseRole];
  return ROLE_HIERARCHY.slice(0, idx + 1).reverse(); // highest first
}

export function setActiveRole(role) {
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function getSession() {
  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : null;
  if (!user) return { token, user: null, activeRole: null };
  const stored = localStorage.getItem(ACTIVE_ROLE_KEY);
  const available = getAvailableRoles(user.role);
  const activeRole = stored && available.includes(stored) ? stored : user.role;
  return { token, user, activeRole };
}
