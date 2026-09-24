import type { AdminPromotionDto } from "@pilates/api-contracts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isApiError } from "../api/problem";
import { usePromotionOrder } from "./promotion-queries";

type Drag =
  | { mode: "keyboard"; id: string; from: number }
  | {
      mode: "pointer";
      id: string;
      from: number;
      target: number;
      startY: number;
      offsetY: number;
    };

const moveItem = <Item>(items: Item[], from: number, to: number): Item[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as Item);
  return next;
};

const failureMessage = (error: unknown): string =>
  isApiError(error) && error.code === "promotion_order_incomplete"
    ? "No pudimos guardar el orden: la lista cambió. Vuelve a intentarlo."
    : "No pudimos guardar el orden. Vuelve a intentarlo.";

/**
 * AW17 with follow-up 39: the carousel order is edited by dragging a card's
 * handle with the pointer or by taking it with the space bar and moving it
 * with the arrows. The order on screen is the saved one until a drop; a
 * drop persists every live id at once and the answer replaces the list, so
 * two cards never show the same position. A refused drop restores the
 * saved order and says so.
 */
export function usePromotionDragOrder(promotions: AdminPromotionDto[]) {
  const save = usePromotionOrder();
  const [pending, setPending] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const cards = useRef(new Map<string, HTMLElement>());

  const byId = new Map(promotions.map((item) => [item.id, item]));
  const order = (pending ?? promotions.map((item) => item.id)).filter((id) =>
    byId.has(id),
  );
  const ordered = order.map((id) => byId.get(id) as AdminPromotionDto);
  const headlineOf = (id: string) => byId.get(id)?.headline ?? "";

  const commit = async (ids: string[], id: string) => {
    const position = ids.indexOf(id) + 1;
    setPending(ids);
    setFailure(null);
    try {
      await save.mutateAsync(ids);
      setAnnouncement(
        `${headlineOf(id)} soltada en la posición ${position}. Orden guardado.`,
      );
    } catch (error) {
      setFailure(failureMessage(error));
      setAnnouncement("");
    } finally {
      setPending(null);
    }
  };

  const registerCard = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element === null) cards.current.delete(id);
      else cards.current.set(id, element);
    },
    [],
  );

  // Where the lifted card would land: after every other card whose middle
  // the pointer has passed.
  const targetFor = (id: string, clientY: number): number =>
    order.filter((other) => {
      if (other === id) return false;
      const rect = cards.current.get(other)?.getBoundingClientRect();
      return rect !== undefined && clientY > rect.top + rect.height / 2;
    }).length;

  useEffect(() => {
    if (drag?.mode !== "pointer") return undefined;
    const onMove = (event: PointerEvent) =>
      setDrag((current) =>
        current?.mode === "pointer"
          ? {
              ...current,
              target: targetFor(current.id, event.clientY),
              offsetY: event.clientY - current.startY,
            }
          : current,
      );
    const onUp = () => {
      const { id, from, target } = drag;
      setDrag(null);
      if (target !== from) void commit(moveItem(order, from, target), id);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  });

  const onPointerDown = (id: string) => (event: ReactPointerEvent) => {
    if (event.button !== 0 || drag !== null || save.isPending) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const from = order.indexOf(id);
    setDrag({
      mode: "pointer",
      id,
      from,
      target: from,
      startY: event.clientY,
      offsetY: 0,
    });
  };

  const onKeyDown = (id: string) => (event: KeyboardEvent) => {
    const grabbed = drag?.mode === "keyboard" && drag.id === id;
    const index = order.indexOf(id);
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (save.isPending) return;
      if (!grabbed) {
        setDrag({ mode: "keyboard", id, from: index });
        setFailure(null);
        setAnnouncement(
          `${headlineOf(id)} tomada en la posición ${index + 1}. Usa las flechas para moverla y la barra espaciadora para soltarla.`,
        );
        return;
      }
      setDrag(null);
      if (index === drag.from) {
        setPending(null);
        setAnnouncement(
          `${headlineOf(id)} soltada en la posición ${index + 1}.`,
        );
      } else {
        void commit(order, id);
      }
      return;
    }
    if (!grabbed) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setDrag(null);
      setPending(null);
      setAnnouncement(
        `Movimiento cancelado: ${headlineOf(id)} sigue en la posición ${drag.from + 1}.`,
      );
      return;
    }
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const to = index + step;
    if (to < 0 || to >= order.length) return;
    setPending(moveItem(order, index, to));
    setAnnouncement(
      `${headlineOf(id)} en la posición ${to + 1} de ${order.length}.`,
    );
  };

  const pointerDrag = drag?.mode === "pointer" ? drag : null;
  // The marker sits before the card at `target` once the lifted card is
  // taken out of the count, which the full list has not done yet.
  const insertion =
    pointerDrag === null
      ? null
      : {
          before:
            pointerDrag.target < pointerDrag.from
              ? pointerDrag.target
              : pointerDrag.target + 1,
          label: `Soltar en posición ${pointerDrag.target + 1}`,
        };

  return {
    ordered,
    insertion,
    announcement,
    failure,
    saving: save.isPending,
    cardRef: registerCard,
    cardState: (id: string) => ({
      dragging: drag?.id === id,
      dimmed: drag !== null && drag.id !== id,
      offsetY: pointerDrag?.id === id ? pointerDrag.offsetY : 0,
    }),
    handleState: (id: string) => ({
      grabbed: drag?.mode === "keyboard" && drag.id === id,
      onPointerDown: onPointerDown(id),
      onKeyDown: onKeyDown(id),
    }),
  };
}
