// ════════════════════════════════════════════════════════════════════
// useTeam — Hook para leer los miembros del equipo (Supabase + realtime)
// ════════════════════════════════════════════════════════════════════
// Inicializa con los defaults de constants/team.js (cero flash de
// pantalla vacía mientras Supabase responde). Después reemplaza con
// los datos reales si están disponibles.
//
// Devuelve: { team, designers, marcomms, people, loading }
// ════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { TEAM_MEMBERS as DEFAULTS } from '@/constants/team';
import { listTeamMembers, subscribeTeamMembers } from '@/services/teamService';
import { deriveServiceOwners, getGreeting, getAccent } from '@/utils/teamHelpers';

export const useTeam = () => {
  const [team, setTeam] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const rows = await listTeamMembers();
      if (!cancelled) setTeam(rows);
    };

    fetch().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const unsubscribe = subscribeTeamMembers(() => {
      // Cualquier INSERT/UPDATE/DELETE → re-fetch
      fetch();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Derivados
  const designers = useMemo(
    () => team.filter((m) => m.team === 'Comunicación').map((m) => m.name),
    [team],
  );
  const marcomms = useMemo(
    () => team.filter((m) => m.team === 'Marketing').map((m) => m.name),
    [team],
  );
  const people = useMemo(() => team.map((m) => m.name), [team]);
  const serviceOwners = useMemo(() => deriveServiceOwners(team), [team]);

  return {
    team,
    designers,
    marcomms,
    people,
    serviceOwners,
    loading,
    // Helpers — closures sobre `team` para que el caller no tenga que pasarlo
    greetingFor: (name) => getGreeting(team, name),
    accentFor:   (name) => getAccent(team, name),
  };
};
