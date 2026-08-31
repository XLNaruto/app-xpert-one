import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { decryptParams, encryptId } from '@/lib/crypto'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { ASSET_DEFAULT_SORT } from '../constants'
import { useAssets } from '../api/use-assets'
import { useAsset } from '../api/use-asset'
import { useDeleteAsset } from '../api/use-asset-mutations'
import type { AssetRecord, StockTarget } from '../types'

/** An asset row as the stock dialogs address it — its own level, never a variant's. */
function toStockTarget(record: AssetRecord | null): StockTarget | null {
  return record
    ? {
        level: 'asset',
        assetId: record.id,
        name: record.assetName,
        quantity: record.quantity,
      }
    : null
}

/**
 * Orchestrates the asset master list screen: the list query, the add/edit
 * dialog and the delete flow. The page consumes this and only renders.
 *
 * `dataToken` is the optional `?data=` token — present only on the way back from
 * an employee record that was opened out of a stock ledger on this screen, where
 * it names the asset whose ledger should come back up.
 */
export function useAssetList(dataToken?: string) {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, ASSET_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useAssets(params)
  const deleteAsset = useDeleteAsset()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null)
  // Only an asset WITHOUT variants owns stock, so only such a row opens these.
  const [stockFor, setStockFor] = useState<AssetRecord | null>(null)
  const [historyFor, setHistoryFor] = useState<AssetRecord | null>(null)

  /**
   * Reopen the ledger the reader left, when Back on an employee record returned
   * them here. The asset is read on its own rather than looked for in `rows`:
   * the list may have been on another page, or filtered, when they left.
   *
   * Seeded once — closing the dialog has to stick, and the token is dropped from
   * the URL as soon as it's been honoured so a refresh doesn't reopen it.
   */
  const returningTo = useMemo(() => {
    const raw = dataToken
      ? decryptParams<{ id?: number; history?: boolean }>(dataToken)
      : null
    if (raw?.history !== true) return undefined
    const id = Number(raw.id)
    return Number.isFinite(id) && id > 0 ? id : undefined
  }, [dataToken])

  const returningAsset = useAsset(returningTo ?? Number.NaN)
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || returningTo === undefined || !returningAsset.data) return
    seeded.current = true
    setHistoryFor(returningAsset.data)
    void navigate({ to: '/master/asset', search: {}, replace: true })
  }, [navigate, returningAsset.data, returningTo])

  /** Open the dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the dialog seeded with a record (edit). */
  const openEdit = (record: AssetRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  /**
   * Open the asset's own screen — its variants, and their stock, live there.
   * The id rides along encrypted; the path stays static.
   */
  const openDetail = (record: AssetRecord) => {
    navigate({ to: '/master/asset/detail', search: { data: encryptId(record.id) } })
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAsset.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Asset deleted')
        setPendingDelete(null)
      },
      // A 409 names what's in the way — a live handout, or stock still on the
      // shelf. Show the server's sentence rather than a generic failure.
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't delete the asset.")),
    })
  }

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    openDetail,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteAsset.isPending,
    stockFor,
    setStockFor,
    historyFor,
    setHistoryFor,
    /** What the stock dialogs are pointed at — always the asset's own level here. */
    stockTarget: toStockTarget(stockFor),
    historyTarget: toStockTarget(historyFor),
  }
}
