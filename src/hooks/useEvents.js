// ════════════════════════════════════════════════════════════════════
// useEvents — Hook para coleccion de eventos (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useCollection } from './useCollection';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  subscribeEvents,
  fromRow,
} from '@/services/eventsService';

export const useEvents = (options = {}) => {
  const service = useMemo(() => ({
    list:      listEvents,
    create:    createEvent,
    update:    updateEvent,
    remove:    deleteEvent,
    subscribe: subscribeEvents,
    fromRow,
  }), []);
  return useCollection(service, options);
};
