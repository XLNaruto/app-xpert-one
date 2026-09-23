import { Combobox } from '@/components/ui/combobox'
import { useDocumentTypeSelect } from '@/features/master/document-type'

/**
 * One card's Document Type dropdown — scroll-lazy and server-searched.
 *
 * It's a component of its own because each card holds its own value (and its own
 * search term), and a hook can't be called per row inside the cards' `map`.
 */
export function DocumentTypeCombobox({
  value,
  selectedLabel,
  onChange,
  disabled,
}: {
  value: string
  /** The saved type's name, when it's already in hand — no read is made for it. */
  selectedLabel?: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const select = useDocumentTypeSelect({
    selected: value || undefined,
    selectedLabel,
    // A locked card only shows its label; there's nothing to list.
    enabled: !disabled,
  })

  return (
    <Combobox
      className="w-full"
      value={value}
      onChange={onChange}
      {...select}
      placeholder="Select Type"
      searchPlaceholder="Search document type"
      disabled={disabled}
    />
  )
}
