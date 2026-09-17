export interface MapAnchor {
  x: number;
  y: number;
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(v, hi));

/** Use measured card height; when neither side fits, scroll the larger side. */
export function placeMapCallout(
  a: MapAnchor,
  mapW: number,
  mapH: number,
  preferredW: number,
  cardH: number,
) {
  const edge = 10,
    pinH = 36;
  const width = Math.max(0, Math.min(preferredW, mapW - edge * 2));
  const left = clamp(a.x - width / 2, edge, mapW - width - edge);
  const above = Math.max(0, a.y - pinH - edge);
  const under = Math.max(0, mapH - a.y - 10 - edge);
  const below = above < cardH && under > above;
  const maxHeight = Math.min(cardH, below ? under : above);
  const top = below ? a.y + 10 : a.y - pinH - maxHeight;
  return {
    left,
    top: clamp(top, edge, mapH - edge - maxHeight),
    width,
    maxHeight,
    below,
    tailLeft: clamp(a.x - left - 7, 18, Math.max(18, width - 32)),
    visible:
      a.x >= 0 && a.x <= mapW && a.y >= 0 && a.y <= mapH && maxHeight >= 44,
  };
}

export function hasMapPosition<
  T extends { latitude?: number | null; longitude?: number | null },
>(p: T): p is T & { latitude: number; longitude: number } {
  return (
    typeof p.latitude === "number" &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    !(p.latitude === 0 && p.longitude === 0)
  );
}

export function matchesMapRoles(
  role: string | undefined,
  roles: string[],
  activeRole: string | null,
) {
  if (activeRole) return role === activeRole;
  return roles.length === 0 || roles.includes(role ?? "");
}
