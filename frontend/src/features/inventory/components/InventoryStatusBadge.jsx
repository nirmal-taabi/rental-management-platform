import { inventoryStatusDescription, inventoryStatusStyle } from '../utils/inventoryStatus';

function InventoryStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${inventoryStatusStyle(status)}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {inventoryStatusDescription(status)}
    </span>
  );
}

export default InventoryStatusBadge;