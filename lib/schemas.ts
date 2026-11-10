import { z } from "zod";

// Foto: imagen ya reducida en el navegador (JPEG/PNG/WebP), máx. ~150 KB.
const photo = z.string().max(200_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional();

export const resultsSettings = {
  resultsMode: z.enum(["on_vote", "after_votes", "on_close"]),
  resultsMin: z.number().int().min(5).max(1000),
};

export const settingsSchema = z.object(resultsSettings);

export const createSchema = z.object({
  resultsMode: resultsSettings.resultsMode.default("on_vote"),
  resultsMin: resultsSettings.resultsMin.default(5),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional().nullable(),
  closesAt: z.string().datetime({ offset: true }).optional().nullable(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    kind: z.enum(["party", "person"]),
    photo,
  })).min(2).max(24),
});

export const respondSchema = z.object({
  ratings: z.record(z.string().uuid(), z.number().min(0).max(100)),
});

// Edición de elementos desde el panel: `photo` ausente = conservar, null = quitar, string = nueva foto.
export const itemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(60),
    kind: z.enum(["party", "person"]),
    photo,
  })).min(2).max(24),
});
