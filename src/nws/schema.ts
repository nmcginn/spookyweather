import { z } from "zod";

const GeoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.array(z.number()))),
});

const NwsParametersSchema = z
  .object({
    VTEC: z.array(z.string()).optional(),
    tornadoDetection: z.array(z.string()).optional(),
    tornadoDamageThreat: z.array(z.string()).optional(),
    eventMotionDescription: z.array(z.string()).optional(),
  })
  .passthrough();

const NwsPropertiesSchema = z
  .object({
    id: z.string(),
    areaDesc: z.string(),
    sent: z.string(),
    expires: z.string(),
    messageType: z.string(),
    senderName: z.string(),
    headline: z.string().nullable().optional(),
    description: z.string(),
    instruction: z.string().nullable().optional(),
    parameters: NwsParametersSchema.optional(),
  })
  .passthrough();

export const NwsFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: GeoJsonPolygonSchema.nullable(),
  properties: NwsPropertiesSchema,
});

export const NwsFeatureCollectionSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    features: z.array(NwsFeatureSchema),
  })
  .passthrough();

export type NwsFeature = z.infer<typeof NwsFeatureSchema>;
export type NwsFeatureCollection = z.infer<typeof NwsFeatureCollectionSchema>;
