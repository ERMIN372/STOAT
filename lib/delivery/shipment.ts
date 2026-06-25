import "server-only";

import {
  createCdekOrder,
  getCdekOrderInfo,
  cdekConfigured,
} from "@/lib/delivery/cdek";
import {
  createRussianPostShipment,
  russianPostConfigured,
} from "@/lib/delivery/russian-post";
import { setShipment, type Order } from "@/lib/orders";

export interface ShipmentResult {
  ok: boolean;
  message: string;
  trackingNumber?: string;
  shipmentId?: string;
}

/**
 * Create a carrier shipment for a prepared order. Called MANUALLY from the
 * admin (never automatically on payment). Saves the shipment id / tracking
 * number on the order and returns a human-readable result.
 */
export async function createShipmentForOrder(
  order: Order
): Promise<ShipmentResult> {
  const d = order.delivery;
  const parcel = {
    weightGrams: d.weightGrams ?? 500,
    lengthCm: d.lengthCm ?? 30,
    widthCm: d.widthCm ?? 25,
    heightCm: d.heightCm ?? 5,
  };

  if (d.provider === "cdek") {
    if (!cdekConfigured) return { ok: false, message: "СДЭК не настроен (нет ключей API)." };
    const result = await createCdekOrder({
      orderId: order.orderId,
      tariffCode: Number(d.tariffCode) || (d.method === "cdek_courier" ? 137 : 136),
      recipient: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      },
      to: { city: d.city, postalCode: d.postalCode, address: d.address },
      pvzCode: d.method === "cdek_pvz" ? d.pvzCode : undefined,
      parcel,
      declaredValue: order.subtotal,
    });
    if (!result) {
      return { ok: false, message: "СДЭК отклонил создание отправления — см. логи." };
    }
    // Tracking number is assigned asynchronously; try to fetch it once.
    const info = await getCdekOrderInfo(result.uuid);
    await setShipment(order.orderId, {
      shipmentId: result.uuid,
      shipmentStatus: info?.status,
      trackingNumber: info?.cdekNumber,
    });
    return {
      ok: true,
      message: info?.cdekNumber
        ? `Отправление СДЭК создано. Номер: ${info.cdekNumber}`
        : "Отправление СДЭК создано. Номер появится через несколько минут (обновите страницу).",
      shipmentId: result.uuid,
      trackingNumber: info?.cdekNumber,
    };
  }

  if (d.provider === "russian_post") {
    if (!russianPostConfigured)
      return { ok: false, message: "Почта России не настроена (нет ключей API)." };
    if (!d.postalCode)
      return { ok: false, message: "У заказа не указан индекс получателя." };
    const result = await createRussianPostShipment({
      orderId: order.orderId,
      recipient: { name: order.customer.name, phone: order.customer.phone },
      toPostalCode: d.postalCode,
      toAddress: [d.city, d.address].filter(Boolean).join(", "),
      weightGrams: parcel.weightGrams,
      declaredValueRub: order.subtotal,
    });
    if (!result) {
      return {
        ok: false,
        message: "Не удалось подготовить отправление Почты России — см. логи.",
      };
    }
    await setShipment(order.orderId, { shipmentId: result.shipmentId });
    return {
      ok: true,
      message: `Отправление Почты России подготовлено (id ${result.shipmentId}). Присвойте трек-номер в кабинете Отправка и добавьте его вручную.`,
      shipmentId: result.shipmentId,
    };
  }

  return {
    ok: false,
    message: "Для самовывоза отправление не создаётся.",
  };
}

/** Refresh shipment status/tracking from the carrier (CDEK only). */
export async function refreshShipmentStatus(
  order: Order
): Promise<ShipmentResult> {
  const d = order.delivery;
  if (d.provider === "cdek" && d.shipmentId && cdekConfigured) {
    const info = await getCdekOrderInfo(d.shipmentId);
    if (!info) return { ok: false, message: "Не удалось получить статус СДЭК." };
    await setShipment(order.orderId, {
      shipmentStatus: info.status,
      trackingNumber: info.cdekNumber,
    });
    return {
      ok: true,
      message: `Статус СДЭК: ${info.status ?? "—"}${
        info.cdekNumber ? `, номер ${info.cdekNumber}` : ""
      }`,
      trackingNumber: info.cdekNumber,
    };
  }
  return { ok: false, message: "Обновление статуса доступно только для СДЭК." };
}
