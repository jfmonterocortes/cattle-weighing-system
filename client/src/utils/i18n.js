const messages = {
  es: {
    appTitle: 'Sistema de Pesaje de Ganado',
    loginTitle: 'Iniciar sesión',
    searchPlaceholder: 'Buscar por nombre, teléfono o número de planilla',
  },
};

export function t(key, locale = 'es') {
  return messages[locale]?.[key] || key;
}

