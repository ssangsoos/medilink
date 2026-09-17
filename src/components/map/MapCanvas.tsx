import { useEffect, useRef, useState, type ReactNode } from "react";
import { GoogleMap, LoadScript, OverlayView } from "@react-google-maps/api";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getMapLanguage, getMapRegion } from "../../i18n";
import {
  hasMapPosition,
  placeMapCallout,
  type MapAnchor,
} from "../../lib/mapGeometry";
import type { MapProfile } from "../../types/mapProfile";

interface Props {
  items: MapProfile[];
  center: { lat: number; lng: number };
  selfLocation: { lat: number; lng: number } | null;
  hospitalAccount: boolean;
  selected: MapProfile | null;
  onSelect: (item: MapProfile) => void;
  onClose: () => void;
  isOutOfRange: (item: MapProfile) => boolean;
  postingCount: (id: string) => number;
  callout?: ReactNode;
  children?: ReactNode;
}
const containerStyle = { width: "100%", height: "100%" };
const markerOffset = (w: number, h: number) => ({ x: -w / 2, y: -h });

function AnchoredCard({
  map,
  position,
  children,
}: {
  map: google.maps.Map;
  position: { lat: number; lng: number };
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<MapAnchor | null>(null);
  const [size, setSize] = useState({ w: 390, h: 500, cardH: 340, cardW: 252 });
  useEffect(() => {
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => {
      const p = overlay
        .getProjection()
        ?.fromLatLngToContainerPixel(
          new google.maps.LatLng(position.lat, position.lng),
        );
      if (p)
        setAnchor((old) =>
          old?.x === p.x && old?.y === p.y ? old : { x: p.x, y: p.y },
        );
    };
    overlay.onRemove = () => {};
    overlay.setMap(map);
    const resize = () => {
      const el = map.getDiv();
      setSize({
        w: el.clientWidth,
        h: el.clientHeight,
        cardH: content.current?.scrollHeight || 340,
        cardW: window.innerWidth >= 768 ? 272 : 252,
      });
      overlay.draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(map.getDiv());
    if (content.current) ro.observe(content.current);
    resize();
    return () => {
      ro.disconnect();
      overlay.setMap(null);
    };
  }, [map, position.lat, position.lng]);
  const p = placeMapCallout(
    anchor || { x: -100, y: -100 },
    size.w,
    size.h,
    size.cardW,
    size.cardH,
  );
  return (
    <div
      ref={root}
      className="mn-map-callout"
      style={{
        left: p.left,
        top: p.top,
        width: p.width,
        visibility: p.visible ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`mn-map-tail ${p.below ? "below" : "above"}`}
        style={{ left: p.tailLeft }}
      />
      <div className="mn-map-callout-scroll" style={{ maxHeight: p.maxHeight }}>
        <div ref={content}>{children}</div>
      </div>
    </div>
  );
}

export default function MapCanvas({
  items,
  center,
  selfLocation,
  hospitalAccount,
  selected,
  onSelect,
  onClose,
  isOutOfRange,
  postingCount,
  callout,
  children,
}: Props) {
  const { t } = useTranslation();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState(false);
  return (
    <>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
        language={getMapLanguage()}
        region={getMapRegion()}
        onError={() => setError(true)}
        loadingElement={
          <div className="mn-map-loading">{t("dashboard.loading")}</div>
        }
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          onClick={onClose}
          onDragStart={onClose}
          options={{
            disableDefaultUI: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            keyboardShortcuts: true,
          }}
        >
          {selfLocation && (
            <OverlayView
              position={selfLocation}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={markerOffset}
            >
              <div className="mn-self-pin">
                <span>＋</span>
                <strong>
                  {hospitalAccount
                    ? t("mapUi.ourHospital", { defaultValue: "우리 병원" })
                    : t("dashboard.me")}
                </strong>
              </div>
            </OverlayView>
          )}
          {items.filter(hasMapPosition).map((item) => (
            <OverlayView
              key={item.id}
              position={{ lat: item.latitude, lng: item.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={markerOffset}
              zIndex={selected?.id === item.id ? 20 : 1}
            >
              <button
                className={`mn-map-pin ${selected?.id === item.id ? "selected" : ""}`}
                aria-label={`${item.hospital_name || item.name} · ${item.license_type ? t("licenseTypes." + item.license_type, { defaultValue: item.license_type }) : t("mapUi.pinPostings", { defaultValue: "공고 {{count}}", count: postingCount(item.id) })}`}
                aria-pressed={selected?.id === item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
              >
                <span
                  className="mn-pin-dot"
                  style={{
                    background: hospitalAccount
                      ? isOutOfRange(item)
                        ? "#8B5CF6"
                        : "#E5484D"
                      : postingCount(item.id) > 0
                        ? "#1FA971"
                        : "#A9B1C0",
                  }}
                />
                {hospitalAccount
                  ? t("licenseTypes." + item.license_type, {
                      defaultValue: item.license_type || "",
                    })
                  : `${item.hospital_name || item.name} · ${t("mapUi.pinPostings", { defaultValue: "공고 {{count}}", count: postingCount(item.id) })}`}
              </button>
            </OverlayView>
          ))}
        </GoogleMap>
      </LoadScript>
      {error && (
        <div role="alert" className="mn-map-error">
          {t("mapUi.mapUnavailable", {
            defaultValue:
              "지도를 불러오지 못했습니다. 목록 보기로 확인해 주세요.",
          })}
        </div>
      )}
      <div className="mn-map-controls">
        <button
          aria-label={t("mapUi.zoomIn", { defaultValue: "지도 확대" })}
          onClick={() => map?.setZoom((map.getZoom() ?? 14) + 1)}
        >
          <Plus size={19} />
        </button>
        <button
          aria-label={t("mapUi.zoomOut", { defaultValue: "지도 축소" })}
          onClick={() => map?.setZoom((map.getZoom() ?? 14) - 1)}
        >
          <Minus size={19} />
        </button>
        <button
          disabled={!selfLocation}
          aria-label={t("mapUi.myLocation", {
            defaultValue: "등록 위치로 이동",
          })}
          onClick={() => {
            if (selfLocation) map?.panTo(selfLocation);
          }}
        >
          <LocateFixed size={19} />
        </button>
      </div>
      {hospitalAccount &&
        selected &&
        hasMapPosition(selected) &&
        map &&
        callout && (
          <AnchoredCard
            key={selected.id}
            map={map}
            position={{ lat: selected.latitude, lng: selected.longitude }}
          >
            {callout}
          </AnchoredCard>
        )}
      {children}
    </>
  );
}
