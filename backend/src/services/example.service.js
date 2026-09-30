import { findExampleById as findExampleByIdRepository } from '../repositories/example.repository.js';

export const getExampleById = async (id) => {
  const record = await findExampleByIdRepository(id);

  if (!record) {
    return null;
  }

  return record;
};
