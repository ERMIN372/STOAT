/**
 * Seller / data-operator details used by the legal pages (privacy & offer) and
 * the footer. Edit this one file to update requisites everywhere.
 * Not legal advice — have a lawyer review the final documents.
 */
export const seller = {
  brand: "STOAT",
  /** Юридический статус: «Самозанятый (НПД)» или «Индивидуальный предприниматель». */
  legalStatus: "Самозанятый (плательщик налога на профессиональный доход)",
  /** ФИО (для самозанятого/ИП) или наименование организации. */
  legalName: "Горностаев Дмитрий Андреевич",
  inn: "503234018901",
  /** ОГРНИП — только если ИП; для самозанятого пусто. */
  ogrnip: "",
  email: "stoat.ermins@yandex.ru",
  phone: "+7 932 494-97-11",
  phoneHref: "+79324949711",
  /** Почтовый адрес. Пусто — строка адреса не показывается в документах. */
  address: "",
  /** Домен сайта без протокола. */
  site: "stoat-kohl.vercel.app",
  /** Дата редакции документов. */
  updatedAt: "24 июня 2026 г.",
};
