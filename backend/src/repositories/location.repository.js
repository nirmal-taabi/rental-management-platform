import { pool } from '../config/database.js';

export const findAllStates = async (connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id, name FROM location_states ORDER BY name ASC',
  );
  return rows;
};

export const findCitiesByStateId = async (stateId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id, name FROM location_cities WHERE state_id = ? ORDER BY name ASC',
    [stateId],
  );
  return rows;
};