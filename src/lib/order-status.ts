/**
 * The order lifecycle for Turkey → Iraq sourcing.
 *
 * Order matters: the array is the canonical sequence shown to customers as a
 * progress timeline. `on_hold` and `cancelled` are terminal/side states and are
 * deliberately kept out of the main sequence.
 */

export const ORDER_STATUSES = [
  "received",
  "quoted",
  "confirmed",
  "factory_order",
  "production",
  "ready_to_ship",
  "in_transit",
  "customs",
  "out_for_delivery",
  "delivered",
] as const;

export const SIDE_STATUSES = ["on_hold", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number] | (typeof SIDE_STATUSES)[number];

export const ALL_STATUSES: readonly OrderStatus[] = [...ORDER_STATUSES, ...SIDE_STATUSES];

/** Statuses that still need work — what the staff queue is made of. */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  "received",
  "quoted",
  "confirmed",
  "factory_order",
  "production",
  "ready_to_ship",
  "in_transit",
  "customs",
  "out_for_delivery",
  "on_hold",
];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

type Copy = { en: string; ar: string; tr: string };

export const STATUS_LABELS: Record<OrderStatus, Copy> = {
  received: { en: "Received", ar: "تم الاستلام", tr: "Alındı" },
  quoted: { en: "Quoted", ar: "تم التسعير", tr: "Teklif verildi" },
  confirmed: { en: "Confirmed", ar: "تم التأكيد", tr: "Onaylandı" },
  factory_order: { en: "Factory order", ar: "طلب المصنع", tr: "Fabrika siparişi" },
  production: { en: "In production", ar: "قيد الإنتاج", tr: "Üretimde" },
  ready_to_ship: { en: "Ready to ship", ar: "جاهز للشحن", tr: "Sevkiyata hazır" },
  in_transit: { en: "In transit", ar: "قيد النقل", tr: "Yolda" },
  customs: { en: "Customs", ar: "التخليص الجمركي", tr: "Gümrük" },
  out_for_delivery: { en: "Out for delivery", ar: "قيد التوصيل", tr: "Dağıtımda" },
  delivered: { en: "Delivered", ar: "تم التسليم", tr: "Teslim edildi" },
  on_hold: { en: "On hold", ar: "معلّق", tr: "Beklemede" },
  cancelled: { en: "Cancelled", ar: "ملغى", tr: "İptal edildi" },
};

export function statusLabel(status: OrderStatus, lang: "en" | "ar" | "tr" = "en"): string {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

/** 1-based position in the customer-facing timeline, 0 for side states. */
export function statusStep(status: OrderStatus): number {
  const index = (ORDER_STATUSES as readonly string[]).indexOf(status);
  return index === -1 ? 0 : index + 1;
}
