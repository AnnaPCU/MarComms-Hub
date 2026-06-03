// ════════════════════════════════════════════════════════════════════
// useCampaigns — Hook para coleccion de campañas (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useCollection } from './useCollection';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  subscribeCampaigns,
  fromRow,
} from '@/services/campaignsService';

export const useCampaigns = (options = {}) => {
  const service = useMemo(() => ({
    list:      listCampaigns,
    create:    createCampaign,
    update:    updateCampaign,
    remove:    deleteCampaign,
    subscribe: subscribeCampaigns,
    fromRow,
  }), []);
  return useCollection(service, options);
};
