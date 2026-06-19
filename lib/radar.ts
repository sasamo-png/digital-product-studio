// Radar de Anuncios — tipos, traducción PT→ES y utilidades.
// Módulo isomorfo (sin APIs de Node): lo usan tanto la ruta API (servidor)
// como la página cliente. La llamada al microservicio vive en la ruta API.

export type RadarCountry = { code: string; label: string };

// Países disponibles (LATAM + global). Se usa en el selector de la página.
export const RADAR_COUNTRIES: RadarCountry[] = [
  { code: "ALL", label: "🌎 Todos los países" },
  { code: "AR", label: "Argentina" },
  { code: "BO", label: "Bolivia" },
  { code: "BR", label: "Brasil" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "CR", label: "Costa Rica" },
  { code: "CU", label: "Cuba" },
  { code: "EC", label: "Ecuador" },
  { code: "SV", label: "El Salvador" },
  { code: "GT", label: "Guatemala" },
  { code: "HN", label: "Honduras" },
  { code: "MX", label: "México" },
  { code: "NI", label: "Nicaragua" },
  { code: "PA", label: "Panamá" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Perú" },
  { code: "PR", label: "Puerto Rico" },
  { code: "DO", label: "República Dominicana" },
  { code: "UY", label: "Uruguay" },
  { code: "VE", label: "Venezuela" },
];

export type RadarMediaKind = "video" | "image" | "other";

export interface RadarAd {
  advertiser: string | null;
  libraryId: string | null;
  startedAt: string; // fecha traducida o "—"
  startedScore: number; // clave numérica para ordenar por fecha
  cta: string | null; // traducido al español
  creativeType: string; // "vídeo" | "imagen" | "no identificado"
  mediaKind: RadarMediaKind; // para filtrar por tipo
  copy: string;
  landing: string | null;
  libraryUrl: string | null; // enlace directo al anuncio en Meta
  image: string | null;
  video: string | null;
}

export interface RadarResult {
  pageName: string;
  niche: string;
  nicheSource: "ia" | "robot";
  angle: string | null; // ángulo/promesa dominante (lo aporta la IA)
  activeResultsCount: number | null;
  adsExtracted: number;
  oldestAdDate: string;
  newestAdDate: string;
  validation: { score: number; status: string; reasons: string[] };
  ads: RadarAd[];
  analyzedAt: string | null;
}

// ── URL de la Biblioteca de Anuncios de Meta (solo anuncios activos) ──
export function buildAdsLibraryUrl(keyword: string, country: string): string {
  const c = country || "ALL";
  return (
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all" +
    `&country=${encodeURIComponent(c)}` +
    `&q=${encodeURIComponent(keyword)}` +
    "&search_type=keyword_unordered&media_type=all"
  );
}

// ── Traducción PT→ES de lo que devuelve el robot ──
const NICHE_ES: Record<string, string> = {
  "educação infantil": "educación infantil",
  "esporte / luta": "deporte / lucha",
  emagrecimento: "adelgazamiento",
  finanças: "finanzas",
  relacionamento: "relaciones",
  saúde: "salud",
  "marketing digital": "marketing digital",
  beleza: "belleza",
  pets: "mascotas",
  "não identificado": "no identificado",
};
const STATUS_ES: Record<string, string> = {
  "Oferta forte para monitorar": "Oferta fuerte para monitorizar",
  "Oferta promissora, precisa acompanhar": "Oferta prometedora, conviene seguir",
  "Dados insuficientes, monitorar manualmente":
    "Datos insuficientes, monitorizar manualmente",
};
const REASON_ES: Record<string, string> = {
  "alto volume de resultados ativos": "alto volumen de resultados activos",
  "volume moderado de resultados ativos": "volumen moderado de resultados activos",
  "baixo volume inicial de resultados ativos": "bajo volumen inicial de resultados activos",
  "robô conseguiu ler vários cards de anúncios": "el robot pudo leer varios anuncios",
  "robô conseguiu ler alguns cards de anúncios": "el robot pudo leer algunos anuncios",
  "vários anúncios possuem mídia/imagem/vídeo": "varios anuncios tienen imagen/vídeo",
  "alguns anúncios possuem mídia/imagem/vídeo": "algunos anuncios tienen imagen/vídeo",
  "existe sinal de anúncio antigo/continuidade": "hay señal de anuncio antiguo/continuidad",
  "existe sinal de anúncio recente": "hay señal de anuncio reciente",
};
const TYPE_ES: Record<string, string> = {
  "vídeo": "vídeo",
  imagem: "imagen",
  "não identificado": "no identificado",
};
const CTA_ES: Record<string, string> = {
  "Saiba mais": "Saber más",
  "Comprar agora": "Comprar ahora",
  "Inscrever-se": "Inscribirse",
  Baixar: "Descargar",
  "Enviar mensagem": "Enviar mensaje",
  "Learn more": "Saber más",
  "Shop now": "Comprar ahora",
  "Sign up": "Registrarse",
  Download: "Descargar",
};
const MONTHS_PT_ES: Record<string, string> = {
  jan: "ene", fev: "feb", mar: "mar", abr: "abr", mai: "may", jun: "jun",
  jul: "jul", ago: "ago", set: "sep", out: "oct", nov: "nov", dez: "dic",
  janeiro: "enero", fevereiro: "febrero", "março": "marzo", marco: "marzo",
  abril: "abril", maio: "mayo", junho: "junio", julho: "julio", agosto: "agosto",
  setembro: "septiembre", outubro: "octubre", novembro: "noviembre", dezembro: "diciembre",
};
const MONTHS_NUM: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8,
  set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5,
  junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const tr = (map: Record<string, string>, s: string | null | undefined): string =>
  s ? map[s] ?? s : "";

// "14 de jun de 2023" → "14 de jun de 2023" (meses en español)
export function translateDate(s: string | null | undefined): string {
  if (!s) return "—";
  if (s === "Não identificado") return "No identificado";
  return s.replace(/\p{L}+/gu, (w) => MONTHS_PT_ES[w.toLowerCase()] ?? w);
}

// "14 de jun de 2023" → 20230614 (para ordenar por fecha)
export function dateScore(s: string | null | undefined): number {
  if (!s) return 0;
  const v = String(s).toLowerCase();
  let m = v.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/);
  if (m) return Number(m[3]) * 10000 + (MONTHS_NUM[m[2]] ?? 0) * 100 + Number(m[1]);
  m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  return 0;
}

// ── Forma del JSON crudo del robot ──
type RawAd = {
  advertiser?: string | null;
  libraryId?: string | null;
  startedAt?: string | null;
  cta?: string | null;
  creativeType?: string | null;
  copyPreview?: string | null;
  landingPages?: string[];
  domains?: string[];
  images?: string[];
  videos?: string[];
};
export type RawRadar = {
  ok?: boolean;
  pageName?: string;
  niche?: string;
  activeResultsCount?: number | null;
  adsExtracted?: number;
  oldestAdDate?: string;
  newestAdDate?: string;
  validation?: { score?: number; status?: string; reasons?: string[] };
  ads?: RawAd[];
  analyzedAt?: string | null;
};

// Convierte el JSON del robot en un DTO en español, listo para renderizar.
export function serializeRadar(raw: RawRadar): RadarResult {
  const rawAds = Array.isArray(raw.ads) ? raw.ads : [];
  const ads: RadarAd[] = rawAds.map((a) => {
    const landing =
      a.landingPages?.[0] ?? (a.domains?.[0] ? `https://${a.domains[0]}` : null);
    const mediaKind: RadarMediaKind = a.videos?.length
      ? "video"
      : a.images?.length
        ? "image"
        : "other";
    return {
      advertiser: a.advertiser?.trim() || null,
      libraryId: a.libraryId ?? null,
      startedAt: translateDate(a.startedAt),
      startedScore: dateScore(a.startedAt),
      cta: a.cta ? tr(CTA_ES, a.cta) : null,
      creativeType: tr(TYPE_ES, a.creativeType) || "no identificado",
      mediaKind,
      copy: a.copyPreview ?? "",
      landing,
      libraryUrl: a.libraryId
        ? `https://www.facebook.com/ads/library/?id=${a.libraryId}`
        : null,
      image: a.images?.[0] ?? null,
      video: a.videos?.[0] ?? null,
    };
  });

  const v = raw.validation ?? {};
  return {
    pageName: raw.pageName?.trim() || "—",
    niche: tr(NICHE_ES, raw.niche) || "no identificado",
    nicheSource: "robot",
    angle: null,
    activeResultsCount:
      typeof raw.activeResultsCount === "number" ? raw.activeResultsCount : null,
    adsExtracted:
      typeof raw.adsExtracted === "number" ? raw.adsExtracted : ads.length,
    oldestAdDate: translateDate(raw.oldestAdDate),
    newestAdDate: translateDate(raw.newestAdDate),
    validation: {
      score: typeof v.score === "number" ? v.score : 0,
      status: tr(STATUS_ES, v.status) || "—",
      reasons: Array.isArray(v.reasons) ? v.reasons.map((r) => REASON_ES[r] ?? r) : [],
    },
    ads,
    analyzedAt: raw.analyzedAt ?? null,
  };
}
