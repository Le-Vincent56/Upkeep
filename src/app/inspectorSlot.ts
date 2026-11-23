import { createContext, useContext } from 'react';

/** The frame's right-hand column; a screen portals its pinned panel into it. Null until mounted. */
export const InspectorSlotContext = createContext<HTMLElement | null>(null);

export function useInspectorSlot(): HTMLElement | null {
  return useContext(InspectorSlotContext);
}
