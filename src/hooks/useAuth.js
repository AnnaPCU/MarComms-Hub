// ════════════════════════════════════════════════════════════════════
// useAuth — Hook centralizado de autenticación
// ════════════════════════════════════════════════════════════════════
// Encapsula el login compartido actual (name + password) y deja
// preparada la signature que va a usar Supabase Auth (magic link).
//
// Hoy: validación contra checkPassword/isValidMember de services/auth.
// Futuro: signInWithOtp / onAuthStateChange de Supabase.
//
// Uso:
//   const { user, loading, login, logout, isAuthenticated } = useAuth();
//   login({ name: 'Agus', password: '...' });
// ════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import { checkPassword, isValidMember } from '@/services/auth';
import { findUserByName } from '@/services/usersService';

export const useAuth = (initialUser = null) => {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async ({ name, password }) => {
    setLoading(true);
    setError(null);
    try {
      if (!isValidMember(name)) {
        const err = new Error('Usuario inválido');
        setError(err);
        return { ok: false, error: err };
      }
      if (!checkPassword(password)) {
        const err = new Error('Contraseña incorrecta');
        setError(err);
        return { ok: false, error: err };
      }
      const u = await findUserByName(name);
      setUser(u);
      return { ok: true, user: u };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
};
