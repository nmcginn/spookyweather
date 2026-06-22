export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type WeatherWarning = {
  id: string;
  eventType: string;
  vtec: string | null;
  messageType: string;
  polygon: GeoJsonPolygon | null;
  counties: string;
  sent: string;
  expires: string;
  detection: string | null;
  damageThreat: string | null;
  motion: string | null;
  headline: string | null;
  description: string;
  instruction: string | null;
  senderName: string;
};

/** @deprecated Use WeatherWarning */
export type TornadoWarning = WeatherWarning;
