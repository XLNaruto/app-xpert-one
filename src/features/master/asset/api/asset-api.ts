import { mockDelay } from '@/lib/utils'
import type { AssetFormValues } from '../schemas'
import type { AssetRecord } from '../types'

/**
 * In-memory asset master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let assets: AssetRecord[] = [
  { id: 1, assetName: 'Laptop', createdAt: '2025-01-12T09:00:00.000Z' },
  { id: 2, assetName: 'Vehicle', createdAt: '2025-01-12T09:00:00.000Z' },
  { id: 3, assetName: 'Furniture', createdAt: '2025-01-12T09:00:00.000Z' },
]

function nextId(): number {
  return assets.reduce((max, a) => Math.max(max, a.id), 0) + 1
}

export async function fetchAssets(): Promise<AssetRecord[]> {
  return mockDelay([...assets])
}

export async function createAsset(values: AssetFormValues): Promise<AssetRecord> {
  const record: AssetRecord = {
    id: nextId(),
    assetName: values.assetName.trim(),
    createdAt: new Date().toISOString(),
  }
  assets = [record, ...assets]
  return mockDelay({ ...record })
}

export async function updateAsset(
  id: number,
  values: AssetFormValues,
): Promise<AssetRecord> {
  const index = assets.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Asset not found')
  const updated: AssetRecord = { ...assets[index], assetName: values.assetName.trim() }
  assets = assets.map((a) => (a.id === id ? updated : a))
  return mockDelay({ ...updated })
}

export async function deleteAsset(id: number): Promise<void> {
  assets = assets.filter((a) => a.id !== id)
  return mockDelay(undefined)
}
