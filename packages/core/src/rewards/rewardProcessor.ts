import type {
  Inventory,
  ItemInventory,
  ItemTransaction,
  MaterialId,
  TaskCompletionReward,
} from '@tasmate/types';
import { addItems } from '../inventory/inventoryManager';
import { legacyInventoryFromItems } from '../inventory/materialStorage';
import type { AppState as CoreAppState } from '../appState';

export interface ApplyTaskRewardResult {
  reward: TaskCompletionReward;
  itemInventory: ItemInventory;
  inventory: Inventory;
  itemHistory: ItemTransaction[];
}

/**
 * 新しい報酬をアイテム所持数・旧 Inventory へ反映する。
 * 保存・UI の双方で同じ値を参照できるよう、ここで一度に整合させる。
 */
export function applyTaskRewardToState(
  state: Pick<CoreAppState, 'itemInventory' | 'inventory' | 'itemHistory'>,
  reward: TaskCompletionReward,
  legacyMaterials: Partial<Record<MaterialId, number>> = {},
): ApplyTaskRewardResult {
  const stacks = [
    { itemId: 'coin', quantity: reward.coins },
    { itemId: 'stardust', quantity: reward.stardust },
    ...reward.crystals,
    ...reward.materials,
    ...(Object.entries(legacyMaterials) as Array<[MaterialId, number | undefined]>).map(
      ([itemId, quantity]) => ({ itemId, quantity: Math.max(0, Math.floor(quantity ?? 0)) }),
    ),
  ];
  const itemInventory = addItems(state.itemInventory, stacks);
  const createdAt = reward.createdAt;
  const newTransactions: ItemTransaction[] = stacks
    .filter((stack) => stack.quantity > 0)
    .map((stack) => ({
      id: `tx-${reward.id}-${stack.itemId}`,
      itemId: stack.itemId,
      delta: stack.quantity,
      reason: 'reward',
      createdAt,
      taskId: reward.taskId,
    }));
  return {
    reward,
    itemInventory,
    inventory: legacyInventoryFromItems(itemInventory, state.inventory),
    itemHistory: [...newTransactions.reverse(), ...state.itemHistory],
  };
}
