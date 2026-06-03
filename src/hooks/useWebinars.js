// ════════════════════════════════════════════════════════════════════
// useWebinars — Hook para coleccion de webinars (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useCollection } from './useCollection';
import {
  listWebinars,
  createWebinar,
  updateWebinar,
  deleteWebinar,
  subscribeWebinars,
  fromRow,
} from '@/services/webinarsService';

export const useWebinars = (options = {}) => {
  const service = useMemo(() => ({
    list:      listWebinars,
    create:    createWebinar,
    update:    updateWebinar,
    remove:    deleteWebinar,
    subscribe: subscribeWebinars,
    fromRow,
  }), []);
  return useCollection(service, options);
};
