import "server-only";

import {
  PICKUP_ENABLED,
  PREPARATION_MAX_DAYS,
  PREPARATION_MIN_DAYS,
  applyServiceMarkup,
  formatDaysRange,
  totalDays,
} from "@/lib/delivery/config";
import {
  CDEK_TARIFF_COURIER,
  CDEK_TARIFF_PVZ,
  calculateTariff,
  cdekConfigured,
  resolveCityCode,
} from "@/lib/delivery/cdek";
import {
  calculateRussianPostTariff,
  russianPostConfigured,
} from "@/lib/delivery/russian-post";
import type {
  DeliveryDestination,
  DeliveryQuote,
  Parcel,
  QuoteResponse,
} from "@/lib/delivery/types";

function withTotals(
  q: Omit<
    DeliveryQuote,
    | "productionMinDays"
    | "productionMaxDays"
    | "totalMinDays"
    | "totalMaxDays"
    | "hint"
  > & { hint?: string }
): DeliveryQuote {
  const { totalMinDays, totalMaxDays } = totalDays(
    q.deliveryMinDays,
    q.deliveryMaxDays
  );
  const hint =
    q.hint ??
    `Доставка после подготовки: ${formatDaysRange(
      q.deliveryMinDays,
      q.deliveryMaxDays
    )}. Ориентировочный срок получения: ${formatDaysRange(
      totalMinDays,
      totalMaxDays
    )}.`;
  return {
    ...q,
    productionMinDays: PREPARATION_MIN_DAYS,
    productionMaxDays: PREPARATION_MAX_DAYS,
    totalMinDays,
    totalMaxDays,
    hint,
  };
}

/**
 * Build all available delivery quotes for a destination + parcel. Each carrier
 * is independent: a failure in one never blocks the others, and missing keys
 * simply omit that carrier (with a notice). `declaredValue` is the goods
 * subtotal in rubles (for insured value).
 */
export async function getDeliveryQuotes(
  destination: DeliveryDestination,
  parcel: Parcel,
  declaredValue: number
): Promise<QuoteResponse> {
  const quotes: DeliveryQuote[] = [];
  const notices: string[] = [];

  // --- CDEK (PVZ + courier) ---
  if (cdekConfigured) {
    try {
      const cityCode =
        (await resolveCityCode({
          city: destination.city,
          postalCode: destination.postalCode,
        })) ?? undefined;
      const to = {
        city: destination.city,
        postalCode: destination.postalCode,
        address: destination.address,
        cityCode,
      };

      const [pvz, courier] = await Promise.all([
        calculateTariff(CDEK_TARIFF_PVZ, to, parcel),
        calculateTariff(CDEK_TARIFF_COURIER, to, parcel),
      ]);

      if (pvz) {
        quotes.push(
          withTotals({
            provider: "cdek",
            method: "cdek_pvz",
            label: "СДЭК до ПВЗ",
            price: applyServiceMarkup(pvz.deliverySum),
            deliveryMinDays: pvz.periodMin,
            deliveryMaxDays: pvz.periodMax,
            tariffCode: String(pvz.tariffCode),
            requiresPvz: true,
          })
        );
      }
      if (courier) {
        quotes.push(
          withTotals({
            provider: "cdek",
            method: "cdek_courier",
            label: "СДЭК курьером",
            price: applyServiceMarkup(courier.deliverySum),
            deliveryMinDays: courier.periodMin,
            deliveryMaxDays: courier.periodMax,
            tariffCode: String(courier.tariffCode),
          })
        );
      }
      if (!pvz && !courier) {
        notices.push("СДЭК: не удалось рассчитать доставку для этого адреса.");
      }
    } catch (err) {
      console.error("[delivery] CDEK quote error:", err);
      notices.push("СДЭК временно недоступен.");
    }
  } else {
    notices.push("СДЭК временно недоступен.");
  }

  // --- Russian Post ---
  if (russianPostConfigured) {
    try {
      if (destination.postalCode && /^\d{6}$/.test(destination.postalCode)) {
        const rp = await calculateRussianPostTariff({
          toPostalCode: destination.postalCode,
          weightGrams: parcel.weightGrams,
          declaredValueRub: declaredValue,
          dimensions: {
            lengthCm: parcel.lengthCm,
            widthCm: parcel.widthCm,
            heightCm: parcel.heightCm,
          },
        });
        if (rp) {
          quotes.push(
            withTotals({
              provider: "russian_post",
              method: "russian_post",
              label: "Почта России",
              price: applyServiceMarkup(rp.price),
              deliveryMinDays: rp.deliveryMinDays,
              deliveryMaxDays: rp.deliveryMaxDays,
              tariffCode: rp.mailType,
            })
          );
        } else {
          notices.push("Почта России: не удалось рассчитать для этого индекса.");
        }
      } else {
        notices.push("Для расчёта Почты России укажите индекс (6 цифр).");
      }
    } catch (err) {
      console.error("[delivery] Russian Post quote error:", err);
      notices.push("Почта России временно недоступна.");
    }
  } else {
    notices.push("Почта России временно недоступна.");
  }

  // --- Pickup ("Самовывоз после готовности") ---
  if (PICKUP_ENABLED) {
    quotes.push(
      withTotals({
        provider: "pickup",
        method: "pickup",
        label: "Самовывоз после готовности",
        price: 0,
        deliveryMinDays: 0,
        deliveryMaxDays: 0,
        hint: "Бесплатно. Заберите заказ после подготовки — мы сообщим, когда он будет готов.",
      })
    );
  }

  return { ok: true, quotes, notices: notices.length ? notices : undefined };
}

/**
 * Recompute a SINGLE quote for the chosen method — used at checkout to validate
 * the price the client sent (never trust the client's number). Returns the
 * fresh quote or null if it is no longer available.
 */
export async function recomputeQuote(
  method: string,
  destination: DeliveryDestination,
  parcel: Parcel,
  declaredValue: number
): Promise<DeliveryQuote | null> {
  const { quotes } = await getDeliveryQuotes(destination, parcel, declaredValue);
  return quotes.find((q) => q.method === method) ?? null;
}
