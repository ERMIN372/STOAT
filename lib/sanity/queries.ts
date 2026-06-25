import { groq } from "next-sanity";

/** Shared projection mapping a `product` document onto the storefront shape. */
const PROJECTION = groq`{
  "id": slug.current,
  name,
  price,
  category,
  isNew,
  description,
  colors[]{ name, hex },
  inventory[]{ size, stock },
  packaging{ weightGrams, lengthCm, widthCm, heightCm },
  images
}`;

/** All published products, new arrivals first. */
export const allProductsQuery = groq`
  *[_type == "product" && defined(slug.current)] | order(isNew desc, _createdAt desc) ${PROJECTION}
`;
