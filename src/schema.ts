import { z } from "zod";

export const dataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  content: z.union([
    z.string(),
    z.custom<Uint8Array>((data) => data instanceof Uint8Array),
    z.any().transform((val) => {
      if (Array.isArray(val)) {
        return new Uint8Array(val);
      }
      return val;
    }),
  ]),
  content_type: z.string(),
  expires_at: z.string().transform((val) => new Date(val)),
});

export const formSchema = z.object({
  c: z.union([
    z.string(),
    z.instanceof(File),
  ]),
  sunset: z.string().optional(),
});
