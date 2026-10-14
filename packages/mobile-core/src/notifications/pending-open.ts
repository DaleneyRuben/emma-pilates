export function usePendingUntilReady<Item>(open: (item: Item) => void) {
  return { deliver: (item: Item) => void item, onReady: () => void open };
}
