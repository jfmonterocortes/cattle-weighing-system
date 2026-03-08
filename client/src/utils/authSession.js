import { parseJwt } from './jwt';

export function getSession() {
  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : null;
  return { token, user };
}
