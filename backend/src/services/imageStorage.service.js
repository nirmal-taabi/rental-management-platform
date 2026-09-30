import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const imageStorageRoot = path.resolve(currentDirectory, '../../storage');

export const getProductImageUrl = (shopId, filename) => `/api/v1/products/images/${shopId}/${filename}`;

export const resolveProductImagePath = (shopId, filename) => {
  if (!/^\d+$/.test(String(shopId)) || !/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(String(filename))) return null;
  return path.join(imageStorageRoot, 'catalog', String(shopId), String(filename));
};

const identifyImage = (buffer) => {
  if (buffer?.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer?.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer?.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
};

export const storeProductImages = async (shopId, files = []) => {
  const storedUrls = [];
  try {
    for (const file of files) {
      const extension = identifyImage(file.buffer);
      if (!extension) {
        throw new AppError('Each image must contain valid JPEG, PNG, or WEBP data.', BAD_REQUEST, 'INVALID_PRODUCT_IMAGE');
      }
      const directory = path.join(imageStorageRoot, 'catalog', String(shopId));
      await mkdir(directory, { recursive: true });
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(path.join(directory, filename), file.buffer, { flag: 'wx' });
      storedUrls.push(getProductImageUrl(shopId, filename));
    }
    return storedUrls;
  } catch (error) {
    await deleteProductImages(storedUrls);
    throw error;
  }
};

export const deleteProductImages = async (urls = []) => {
  await Promise.all(urls.map(async (url) => {
    const match = String(url).match(/^\/api\/v1\/products\/images\/(\d+)\/([a-f0-9-]+\.(?:jpg|png|webp))$/i);
    if (!match) return;
    try {
      const filePath = resolveProductImagePath(match[1], match[2]);
      if (filePath) await unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
};