import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, Building2, List, LogOut, MapPin, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PostingStatusBar from "../components/map/PostingStatusBar";
import RoleFilter from "../components/map/RoleFilter";
import TalentCard from "../components/map/TalentCard";
import HospitalSheet from "../components/map/HospitalSheet";
import MapCanvas from "../components/map/MapCanvas";
import type { MapProfile } from "../types/mapProfile";
import type { JobPosting } from "../types/jobPosting";
import { MEDICAL_LICENSE_TYPES, HOSPITAL_TYPES } from "../lib/medicalConstants";
import { hasMapPosition, matchesMapRoles } from "../lib/mapGeometry";
import { haversineKm, formatDistance } from "../lib/distance";
import "./Dashboard.css";

type OwnProfile = MapProfile & { is_exposed?: boolean };
const defaultCenter = { lat: 37.5665, lng: 126.978 };
// Use local calendar date, not UTC midnight; existing deployment supports multiple regions.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const visibleJob = (j: JobPosting) =>
  j.status === "active" && (!j.work_end_date || j.work_end_date >= today());

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [items, setItems] = useState<MapProfile[]>([]);
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [postingsError, setPostingsError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<MapProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState<string | null>(null);
  const [rolesBusy, setRolesBusy] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [listView, setListView] = useState(false);
  const [center, setCenter] = useState(defaultCenter);
  const loadSequence = useRef(0);
  const hospitalAccount = profile?.role === "hospital";
  const selfLocation = useMemo(
    () =>
      profile && hasMapPosition(profile)
        ? { lat: profile.latitude, lng: profile.longitude }
        : null,
    [profile],
  );

  const load = useCallback(
    async (initial = false) => {
      const sequence = ++loadSequence.current;
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (sequence !== loadSequence.current) return;
        if (authError || !user) {
          navigate("/login");
          return;
        }
        const { data: own, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (sequence !== loadSequence.current) return;
        if (error || !own) throw new Error("profile");
        setProfile(own);
        if (initial) {
          setRoles(own.seeking_positions || []);
          if (hasMapPosition(own))
            setCenter({ lat: own.latitude, lng: own.longitude });
        }
        const [peers, jobs] = await Promise.all([
          supabase
            .from("public_profiles")
            .select("*")
            .eq("role", own.role === "hospital" ? "worker" : "hospital"),
          own.role === "hospital"
            ? supabase
                .from("job_postings")
                .select("*")
                .eq("hospital_id", user.id)
            : supabase
                .from("job_postings")
                .select("*")
                .eq("status", "active")
                .or(`work_end_date.is.null,work_end_date.gte.${today()}`),
        ]);
        if (sequence !== loadSequence.current) return;
        if (peers.error)
          setLoadError(
            t("mapUi.loadFailed", {
              defaultValue: "목록을 불러오지 못했습니다. 다시 시도해 주세요.",
            }),
          );
        else {
          setItems(peers.data || []);
          setSelected((current) =>
            current
              ? ((peers.data || []).find(
                  (p: MapProfile) => p.id === current.id,
                ) ?? null)
              : null,
          );
          setLoadError("");
        }
        if (jobs.error) {
          setPostingsError(
            t("mapUi.postingsFailed", {
              defaultValue: "공고 상태를 불러오지 못했습니다.",
            }),
          );
        } else {
          setPostings(jobs.data || []);
          setPostingsError("");
        }
      } catch {
        if (sequence === loadSequence.current)
          setLoadError(
            t("mapUi.loadFailed", {
              defaultValue: "목록을 불러오지 못했습니다. 다시 시도해 주세요.",
            }),
          );
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [navigate, t],
  );
  const invalidateLoads = useCallback(() => { loadSequence.current++; }, []);
  useEffect(() => {
    void load(true);
    return invalidateLoads;
  }, [load, invalidateLoads]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (p) =>
          hasMapPosition(p) &&
          (hospitalAccount
            ? matchesMapRoles(p.license_type, roles, activeRole)
            : !hospitalFilter || p.hospital_type === hospitalFilter),
      ),
    [items, hospitalAccount, roles, activeRole, hospitalFilter],
  );
  const jobsByHospital = useMemo(() => {
    const grouped = new Map<string, JobPosting[]>();
    for (const j of postings.filter(visibleJob))
      grouped.set(j.hospital_id, [...(grouped.get(j.hospital_id) || []), j]);
    return grouped;
  }, [postings]);
  const distance = (item: MapProfile) =>
    selfLocation && hasMapPosition(item)
      ? haversineKm(
          selfLocation.lat,
          selfLocation.lng,
          item.latitude,
          item.longitude,
        )
      : null;
  const outOfRange = (item: MapProfile) => {
    const d = distance(item);
    return (
      hospitalAccount &&
      d !== null &&
      item.work_radius != null &&
      d > item.work_radius
    );
  };
  const selectPin = (item: MapProfile) => {
    setExpanded(false);
    setSelected(item);
    if (listView) {
      setListView(false);
      if (hasMapPosition(item))
        setCenter({ lat: item.latitude, lng: item.longitude });
    }
  };
  const closeOverlays = () => {
    setSelected(null);
    setExpanded(false);
  };
  const ensureOwner = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user || user.id !== profile?.id)
      throw new Error("auth changed");
    return user;
  };

  const saveRoles = async (next: string[]) => {
    if (rolesBusy || !next.length) return;
    setRolesBusy(true);
    setRolesError("");
    try {
      const user = await ensureOwner();
      const { error } = await supabase
        .from("profiles")
        .update({ seeking_positions: next })
        .eq("id", user.id);
      if (error) throw error;
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("id,seeking_positions")
        .eq("id", user.id)
        .single();
      if (
        readError ||
        data?.id !== user.id ||
        JSON.stringify([...(data.seeking_positions || [])].sort()) !==
          JSON.stringify([...next].sort())
      )
        throw new Error("readback mismatch");
      setRoles(next);
      setActiveRole(null);
      closeOverlays();
      await load();
    } catch {
      const message = t("mapUi.rolesSaveFailed", {
        defaultValue: "직종 저장에 실패했습니다. 기존 설정을 유지합니다.",
      });
      setRolesError(message);
      throw new Error(message);
    } finally {
      setRolesBusy(false);
    }
  };
  const enablePostings = async () => {
    if (actionBusy) return;
    // Closed/expired jobs must be reviewed instead of accidentally republished.
    const eligible = postings.filter(
      (j) =>
        j.status === "paused" &&
        (!j.work_end_date || j.work_end_date >= today()),
    );
    if (!eligible.length) {
      navigate("/hospital/jobs");
      return;
    }
    if (
      !window.confirm(
        t("mapUi.enableConfirm", {
          defaultValue:
            "일시중지된 공고 {{count}}개를 공개할까요? 마감·만료 공고는 변경하지 않습니다.",
          count: eligible.length,
        }),
      )
    )
      return;
    setActionBusy(true);
    try {
      const user = await ensureOwner();
      const { error } = await supabase
        .from("job_postings")
        .update({ status: "active" })
        .eq("hospital_id", user.id)
        .eq("status", "paused")
        .in(
          "id",
          eligible.map((j) => j.id),
        );
      if (error) throw error;
      const { data, error: readError } = await supabase
        .from("job_postings")
        .select("*")
        .eq("hospital_id", user.id);
      if (
        readError ||
        !data ||
        eligible.some(
          (j) => !data.some((p: JobPosting) => p.id === j.id && visibleJob(p)),
        )
      )
        throw new Error("readback mismatch");
      setPostings(data);
      setPostingsError("");
    } catch {
      setPostingsError(
        t("mapUi.enableFailed", {
          defaultValue:
            "공고 공개 여부를 확인하지 못했습니다. 공고 관리에서 확인해 주세요.",
        }),
      );
    } finally {
      setActionBusy(false);
    }
  };
  const toggleExposure = async () => {
    if (actionBusy || !profile) return;
    setActionBusy(true);
    try {
      const user = await ensureOwner();
      const next = !profile.is_exposed;
      const { error } = await supabase
        .from("profiles")
        .update({ is_exposed: next })
        .eq("id", user.id);
      if (error) throw error;
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("id,is_exposed")
        .eq("id", user.id)
        .single();
      if (readError || data?.id !== user.id || data.is_exposed !== next)
        throw new Error("readback mismatch");
      setProfile({ ...profile, is_exposed: next });
    } catch {
      setLoadError(t("dashboard.statusChangeFailed"));
    } finally {
      setActionBusy(false);
    }
  };

  if (loading)
    return <div className="mn-loading">{t("dashboard.loading")}</div>;
  if (!profile)
    return (
      <div className="mn-loading">
        <p role="alert">{loadError}</p>
        <button onClick={() => void load(true)}>
          {t("mapUi.retry", { defaultValue: "다시 시도" })}
        </button>
      </div>
    );
  const title = hospitalAccount
    ? profile.hospital_name || profile.name
    : t("dashboard.findHospital");
  const navigation = (
    <>
      <button
        aria-current="page"
        onClick={() => {
          setListView(false);
          closeOverlays();
        }}
      >
        <MapPin size={18} />
        <span>{t("mapUi.mapTab", { defaultValue: "지도에서 찾기" })}</span>
      </button>
      <button
        onClick={() =>
          navigate(hospitalAccount ? "/hospital/jobs" : "/worker/profile")
        }
      >
        <Briefcase size={18} />
        <span>
          {hospitalAccount
            ? t("mapUi.jobsTab", { defaultValue: "내 공고" })
            : t("dashboard.editResume")}
        </span>
      </button>
      {hospitalAccount && (
        <button onClick={() => navigate("/hospital/edit")}>
          <Building2 size={18} />
          <span>{t("mapUi.hospitalTab", { defaultValue: "병원 정보" })}</span>
        </button>
      )}
    </>
  );
  const talentCard =
    selected && hospitalAccount ? (
      <TalentCard
        key={selected.id}
        talent={selected}
        hospitalName={profile.hospital_name || profile.name || ""}
        distanceLabel={
          distance(selected) !== null
            ? formatDistance(distance(selected)!)
            : undefined
        }
        outOfRange={outOfRange(selected)}
        onClose={() => setSelected(null)}
      />
    ) : null;
  return (
    <div
      className={`mn-dashboard ${hospitalAccount ? "mn-hospital-account" : "mn-worker-account"}`}
    >
      <header className="mn-header">
        <div className="mn-identity">
          <h1 title={title}>{title}</h1>
          <p>
            {hospitalAccount
              ? `${profile.address || ""} · ${t("mapUi.hospitalAccount", { defaultValue: "병원 계정" })}`
              : profile.name}
          </p>
        </div>
        <nav
          className="mn-top-nav"
          aria-label={t("mapUi.mainNav", { defaultValue: "주 메뉴" })}
        >
          {navigation}
        </nav>
        <div className="mn-brand">medinoti</div>
        <details className="mn-account-menu">
          <summary
            aria-label={t("mapUi.accountSettings", {
              defaultValue: "계정 설정",
            })}
          >
            •••
          </summary>
          <div>
            <LanguageSwitcher />
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
              }}
            >
              <LogOut size={16} />
              {t("dashboard.logout")}
            </button>
          </div>
        </details>
      </header>
      {hospitalAccount && (
        <PostingStatusBar
          postings={postings}
          expanded={expanded}
          onExpandedChange={(open) => {
            setExpanded(open);
            setSelected(null);
          }}
          onManage={() => navigate("/hospital/jobs")}
          onCreate={() => navigate("/hospital/post")}
          onEdit={(id) => navigate(`/hospital/jobs/${id}/edit`)}
          onEnable={() => void enablePostings()}
          error={postingsError}
          busy={actionBusy}
        />
      )}
      <main className="mn-map-main">
        {hospitalAccount ? (
          <div className="mn-filter-position">
            <RoleFilter
              roles={roles}
              options={Array.from(
                new Set([...MEDICAL_LICENSE_TYPES, ...roles]),
              )}
              activeRole={activeRole}
              onActiveRoleChange={(r) => {
                setActiveRole(r);
                closeOverlays();
              }}
              onRolesChange={saveRoles}
              onOpen={closeOverlays}
              busy={rolesBusy}
              error={rolesError}
            />
          </div>
        ) : (
          <div className="mn-worker-filter">
            <button
              aria-pressed={!hospitalFilter}
              onClick={() => {
                setHospitalFilter(null);
                closeOverlays();
              }}
            >
              {t("mapUi.all", { defaultValue: "전체" })}
            </button>
            {HOSPITAL_TYPES.map((r) => (
              <button
                key={r.value}
                aria-pressed={hospitalFilter === r.value}
                onClick={() => {
                  setHospitalFilter(r.value);
                  closeOverlays();
                }}
              >
                {t("hospitalType." + r.value)}
              </button>
            ))}
          </div>
        )}
        <div className="mn-map-stage">
          <MapCanvas
            items={filteredItems}
            center={center}
            selfLocation={selfLocation}
            hospitalAccount={hospitalAccount}
            selected={selected}
            onSelect={selectPin}
            onClose={closeOverlays}
            isOutOfRange={outOfRange}
            postingCount={(id) => jobsByHospital.get(id)?.length || 0}
            callout={talentCard}
          />
          <button
            className="mn-list-toggle"
            onClick={() => {
              setListView((v) => !v);
              closeOverlays();
            }}
          >
            <List size={16} />
            {listView
              ? t("mapUi.mapView", { defaultValue: "지도 보기" })
              : t("mapUi.listView", { defaultValue: "목록 보기" })}
          </button>
          {loadError && (
            <div role="alert" className="mn-fetch-error">
              {loadError}
              <button onClick={() => void load()}>
                {t("mapUi.retry", { defaultValue: "다시 시도" })}
              </button>
            </div>
          )}
          {!hospitalAccount && postingsError && (
            <div role="alert" className="mn-fetch-error">
              {postingsError}
            </div>
          )}
          {listView && (
            <section
              className="mn-result-list"
              aria-label={t("mapUi.results", { defaultValue: "검색 결과" })}
            >
              <h2>{t("dashboard.resultCount", { n: filteredItems.length })}</h2>
              {filteredItems.map((p) => (
                <button
                  className="mn-result"
                  key={p.id}
                  onClick={() => selectPin(p)}
                >
                  <strong>{p.hospital_name || p.name}</strong>
                  <span>
                    {hospitalAccount
                      ? t("licenseTypes." + p.license_type, {
                          defaultValue: p.license_type || "",
                        })
                      : t("hospitalType." + p.hospital_type)}
                  </span>
                  <small>{p.address}</small>
                  {!hospitalAccount && (
                    <small>
                      {t("mapUi.pinPostings", {
                        defaultValue: "공고 {{count}}",
                        count: jobsByHospital.get(p.id)?.length || 0,
                      })}
                    </small>
                  )}
                </button>
              ))}
              {!filteredItems.length && <p>{t("dashboard.noResults")}</p>}
            </section>
          )}
          {hospitalAccount && !listView && (
            <div className="mn-legend">
              <span>
                <i />
                {t("mapUi.withinRange", { defaultValue: "출퇴근 가능" })}
              </span>
              <span>
                <i />
                {t("mapUi.outsideRange", { defaultValue: "거리 밖" })}
              </span>
            </div>
          )}
          {!hospitalAccount && !selected && (
            <button
              className={`mn-exposure ${profile.is_exposed ? "on" : ""}`}
              disabled={actionBusy}
              aria-pressed={!!profile.is_exposed}
              onClick={() => void toggleExposure()}
            >
              {profile.is_exposed
                ? t("dashboard.seekingExposed")
                : t("dashboard.seekingHidden")}
            </button>
          )}
          {!hospitalAccount && selected && (
            <div className="mn-hospital-sheet-position">
              <HospitalSheet
                key={selected.id}
                hospital={selected}
                postings={jobsByHospital.get(selected.id) || []}
                workerName={profile.name || ""}
                workerRole={t("licenseTypes." + profile.license_type, {
                  defaultValue: profile.license_type || "",
                })}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
          {postingsError && hospitalAccount && (
            <button className="mn-retry-postings" onClick={() => void load()}>
              <X size={14} />
              {t("mapUi.retry", { defaultValue: "다시 시도" })}
            </button>
          )}
        </div>
      </main>
      <nav
        className="mn-bottom-nav"
        aria-label={t("mapUi.mainNav", { defaultValue: "주 메뉴" })}
      >
        {navigation}
      </nav>
    </div>
  );
}
