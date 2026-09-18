// ════════════════════════════════════════════════════════════════════
// useSocialPosts — Cuentas y posteos de LinkedIn (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Devuelve:
//   accounts, posts, loading, error, refetch
//   createPost(obj) / updatePost(id, patch) / removePost(id)
//   createAccount(obj) / updateAccount(id, patch) / removeAccount(id)
//
// Si la tabla de cuentas está vacía (migration 0017 recién corrida sin
// seed, o todavía no corrida), `accounts` cae a DEFAULT_SOCIAL_ACCOUNTS
// con ids sintéticos para que la hoja se vea; en ese caso no se puede
// crear posteos hasta que existan cuentas reales.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listAccounts, createAccount, updateAccount, deleteAccount,
  listPosts, createPost, updatePost, deletePost,
  subscribeSocial,
} from '@/services/socialPostsService';
import { DEFAULT_SOCIAL_ACCOUNTS } from '@/constants/socialPosts';

const FALLBACK_ACCOUNTS = DEFAULT_SOCIAL_ACCOUNTS.map((a) => ({ ...a, id: `local-${a.key}`, isFallback: true }));

export const useSocialPosts = (options = {}) => {
  const { realtime = true } = options;
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const [a, p] = await Promise.all([listAccounts(), listPosts()]);
      setAccounts(a);
      setPosts(p);
    } catch (e) {
      console.error('[useSocialPosts] fetch error:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!realtime) return undefined;
    return subscribeSocial(() => refetch());
  }, [realtime, refetch]);

  const wrap = (fn) => async (...args) => {
    try {
      const r = await fn(...args);
      await refetch();
      return r;
    } catch (e) {
      console.error('[useSocialPosts] write error:', e);
      setError(e);
      throw e;
    }
  };

  const api = useMemo(() => ({
    createPost:    wrap(createPost),
    updatePost:    wrap(updatePost),
    removePost:    wrap(deletePost),
    createAccount: wrap(createAccount),
    updateAccount: wrap(updateAccount),
    removeAccount: wrap(deleteAccount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [refetch]);

  const usingFallback = !loading && accounts.length === 0;
  return {
    accounts: usingFallback ? FALLBACK_ACCOUNTS : accounts,
    usingFallback,
    posts,
    loading,
    error,
    refetch,
    ...api,
  };
};
