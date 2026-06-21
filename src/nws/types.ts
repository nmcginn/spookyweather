export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type TornadoWarning = {
  id: string;
  vtec: string | null;
  messageType: string;
  polygon: GeoJsonPolygon | null;
  counties: string;
  sent: string;
  expires: string;
  detection: "RADAR INDICATED" | "OBSERVED" | null;
  damageThreat: "CONSIDERABLE" | "CATASTROPHIC" | null;
  motion: string | null;
  headline: string | null;
  description: string;
  instruction: string | null;
  senderName: string;
};
