// Deterministic Google Maps test double. Never used by the application build.
// Browser screenshots clearly label this as a test map; real SDK auth is tested separately.
import React from "/node_modules/.vite/deps/react.js";
const {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  createContext,
} = React;
const Context = createContext(null);
class LatLng {
  constructor(lat, lng) {
    this.lat = () => lat;
    this.lng = () => lng;
  }
}
class ProjectionOverlay {
  setMap(map) {
    if (this.map) this.map.overlays.delete(this);
    this.map = map;
    if (map) {
      map.overlays.add(this);
      this.onAdd?.();
      this.draw?.();
    } else this.onRemove?.();
  }
  getProjection() {
    return {
      fromLatLngToContainerPixel: (p) =>
        this.map.project({ lat: p.lat(), lng: p.lng() }),
    };
  }
}
window.google = { maps: { LatLng, OverlayView: ProjectionOverlay } };
export function Marker() {
  return null;
}
export function LoadScript({ children }) {
  return children;
}
export function GoogleMap({
  children,
  center,
  zoom,
  onLoad,
  onClick,
  onDragStart,
  mapContainerStyle,
}) {
  const ref = useRef(null),
    [view, setView] = useState({ center, zoom });
  const instance = useMemo(
    () => ({
      overlays: new Set(),
      getDiv: () => ref.current,
      getZoom: () => instance.view.zoom,
      setZoom: (z) => setView((v) => ({ ...v, zoom: z })),
      panTo: (p) => setView((v) => ({ ...v, center: p })),
      project: (p) => ({
        x:
          ref.current.clientWidth / 2 +
          (p.lng - instance.view.center.lng) *
            18000 *
            2 ** (instance.view.zoom - 14),
        y:
          ref.current.clientHeight / 2 +
          (instance.view.center.lat - p.lat) *
            25000 *
            2 ** (instance.view.zoom - 14),
      }),
      view,
    }),
    [],
  );
  instance.view = view;
  useEffect(() => {
    setView((v) => ({ ...v, center }));
  }, [center.lat, center.lng]);
  useLayoutEffect(() => {
    onLoad?.(instance);
    const ro = new ResizeObserver(() => setView((v) => ({ ...v })));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [instance]);
  useEffect(() => {
    instance.overlays.forEach((o) => o.draw?.());
  }, [view]);
  const down = useRef(null);
  return React.createElement(
    "div",
    {
      ref,
      style: {
        ...mapContainerStyle,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#eaf0e7",
        backgroundImage:
          "linear-gradient(#fff 2px,transparent 2px),linear-gradient(90deg,#fff 2px,transparent 2px)",
        backgroundSize: "70px 70px",
      },
      onClick,
      onPointerDown: (e) => {
        down.current = { x: e.clientX, y: e.clientY };
      },
      onPointerMove: (e) => {
        if (
          down.current &&
          Math.abs(e.clientX - down.current.x) +
            Math.abs(e.clientY - down.current.y) >
            15
        ) {
          onDragStart?.();
          down.current = null;
        }
      },
      onPointerUp: () => {
        down.current = null;
      },
    },
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: 10,
          bottom: 2,
          fontSize: 10,
          color: "#667367",
          pointerEvents: "none",
        },
      },
      "테스트 지도 · 예시 데이터 (실서비스 연결 없음)",
    ),
    React.createElement(
      Context.Provider,
      { value: { instance, view } },
      children,
    ),
  );
}
export function OverlayView({
  position,
  children,
  getPixelPositionOffset,
  zIndex,
}) {
  const { instance, view } = useContext(Context);
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 100, h: 44 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: ref.current.offsetWidth, h: ref.current.offsetHeight }),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const p = instance.getDiv() ? instance.project(position) : { x: 0, y: 0 };
  const offset = getPixelPositionOffset?.(size.w, size.h) || { x: 0, y: 0 };
  void view;
  return React.createElement(
    "div",
    {
      ref,
      style: {
        position: "absolute",
        left: p.x + offset.x,
        top: p.y + offset.y,
        zIndex,
      },
    },
    children,
  );
}
OverlayView.OVERLAY_MOUSE_TARGET = "overlayMouseTarget";
