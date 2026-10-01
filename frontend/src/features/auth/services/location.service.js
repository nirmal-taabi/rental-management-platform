import { supabase } from '../../../services/supabaseClient';

const readLookupRows = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const locationService = {
  getStates: () => readLookupRows(
    supabase.from('location_states').select('id, name').order('name'),
  ),
  getCitiesByState: async (stateId) => {
    const normalizedStateId = Number(stateId);
    if (!Number.isSafeInteger(normalizedStateId) || normalizedStateId < 1) {
      throw new Error('State id must be a positive integer.');
    }

    return readLookupRows(
      supabase
        .from('location_cities')
        .select('id, name')
        .eq('state_id', normalizedStateId)
        .order('name'),
    );
  },
};