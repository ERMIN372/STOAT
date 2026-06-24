import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Product document — the single thing the store owner edits in the Studio.
 *
 * Mirrors the `Product` type in types/index.ts. The storefront reads these via
 * GROQ (see lib/sanity/queries.ts) and maps them in lib/catalog.ts.
 */
export const product = defineType({
  name: "product",
  title: "Товар",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Название",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug (адрес в URL)",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      description: "Используется в адресе товара: /product/<slug>",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "price",
      title: "Цена, ₽",
      type: "number",
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: "category",
      title: "Категория",
      type: "string",
      options: {
        list: [
          { title: "Кепки", value: "caps" },
          { title: "Футболки", value: "tshirts" },
          { title: "Худи", value: "hoodies" },
          { title: "Аксессуары", value: "accessories" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "isNew",
      title: "Новинка",
      type: "boolean",
      description: "Показывать в блоке «Новинки» на главной",
      initialValue: false,
    }),
    defineField({
      name: "description",
      title: "Описание",
      type: "text",
      rows: 5,
    }),
    defineField({
      name: "colors",
      title: "Цвета",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "name", title: "Название", type: "string" },
            {
              name: "hex",
              title: "Цвет (HEX, напр. #1d2b45)",
              type: "string",
            },
          ],
          preview: { select: { title: "name", subtitle: "hex" } },
        }),
      ],
    }),
    defineField({
      name: "images",
      title: "Фото",
      type: "array",
      of: [defineArrayMember({ type: "image", options: { hotspot: true } })],
      options: { layout: "grid" },
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "inventory",
      title: "Наличие по размерам",
      description:
        "Каждый размер и его остаток. Размер с остатком 0 показывается как «нет в наличии».",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            { name: "size", title: "Размер", type: "string" },
            {
              name: "stock",
              title: "Остаток, шт.",
              type: "number",
              validation: (r) => r.min(0),
              initialValue: 0,
            },
          ],
          preview: {
            select: { title: "size", subtitle: "stock" },
            prepare: ({ title, subtitle }) => ({
              title: title || "—",
              subtitle: `${subtitle ?? 0} шт.`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "category", media: "images.0" },
  },
});
