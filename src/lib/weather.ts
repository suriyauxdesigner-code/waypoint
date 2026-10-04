import type { ISODate } from "@/lib/types";
import { parseISO } from "@/lib/calc/dates";

/**
 * Weather is provider-shaped so a live forecast API can drop in later.
 * Until then we show typical climate for the month (clearly labelled).
 */
export interface WeatherSnapshot {
  high: number;
  low: number;
  summary: string;
  icon: "sun" | "cloud-sun" | "cloud-rain" | "cloud-fog";
  source: "climate" | "forecast";
}

export interface WeatherProvider {
  get(city: string, date: ISODate): WeatherSnapshot | null;
}

const CLIMATE: Record<string, Partial<Record<number, Omit<WeatherSnapshot, "source">>>> = {
  bangalore: { 10: { high: 27, low: 17, summary: "Pleasant", icon: "cloud-sun" }, 11: { high: 26, low: 16, summary: "Cool evenings", icon: "cloud-sun" } },
  kochi: { 10: { high: 31, low: 24, summary: "Humid, showers", icon: "cloud-rain" }, 11: { high: 32, low: 24, summary: "Warm & humid", icon: "cloud-sun" } },
  munnar: { 10: { high: 21, low: 13, summary: "Damp & green", icon: "cloud-fog" }, 11: { high: 22, low: 11, summary: "Misty mornings", icon: "cloud-fog" } },
  varkala: { 10: { high: 31, low: 24, summary: "Passing showers", icon: "cloud-sun" }, 11: { high: 31, low: 23, summary: "Sunny, sea breeze", icon: "sun" } },
  thiruvananthapuram: { 10: { high: 31, low: 24, summary: "Warm, some rain", icon: "cloud-rain" }, 11: { high: 31, low: 23, summary: "Warm & sunny", icon: "sun" } },
  jaipur: { 10: { high: 28, low: 13, summary: "Dry, mild", icon: "sun" }, 11: { high: 23, low: 8, summary: "Cool & dry", icon: "sun" } },
};

export const climateProvider: WeatherProvider = {
  get(city, date) {
    const month = parseISO(date).getUTCMonth();
    const entry = CLIMATE[city.toLowerCase()]?.[month];
    return entry ? { ...entry, source: "climate" } : null;
  },
};
