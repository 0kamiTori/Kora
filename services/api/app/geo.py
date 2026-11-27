"""Cálculos geográficos sencillos (suficientes para distancias urbanas)."""
import math

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))


def polyline_length_m(points: list[dict]) -> float:
    return sum(
        haversine_m(a["lat"], a["lng"], b["lat"], b["lng"]) for a, b in zip(points, points[1:])
    )


def _to_xy(lat: float, lng: float, ref_lat: float) -> tuple[float, float]:
    """Proyección plana local en metros alrededor de `ref_lat`."""
    x = math.radians(lng) * EARTH_RADIUS_M * math.cos(math.radians(ref_lat))
    y = math.radians(lat) * EARTH_RADIUS_M
    return x, y


def distance_to_polyline_m(lat: float, lng: float, points: list[dict]) -> float:
    """Distancia del punto al tramo más cercano de la ruta de referencia."""
    if not points:
        return 0.0
    if len(points) == 1:
        return haversine_m(lat, lng, points[0]["lat"], points[0]["lng"])
    px, py = _to_xy(lat, lng, lat)
    best = math.inf
    for a, b in zip(points, points[1:]):
        ax, ay = _to_xy(a["lat"], a["lng"], lat)
        bx, by = _to_xy(b["lat"], b["lng"], lat)
        dx, dy = bx - ax, by - ay
        length_sq = dx * dx + dy * dy
        t = 0.0 if length_sq == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
        best = min(best, math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
    return best
