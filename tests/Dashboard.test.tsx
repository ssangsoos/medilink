import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Dashboard from "../src/pages/Dashboard";
import i18n from "../src/i18n";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  navigate: vi.fn(),
  writes: vi.fn(),
  profile: null as unknown,
  jobs: [] as unknown[],
  failJobs: false,
  failRoles: false,
  items: [] as unknown[],
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { getUser: m.getUser, signOut: vi.fn() }, from: m.from },
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => m.navigate }));
vi.mock("../src/components/LanguageSwitcher", () => ({ default: () => null }));
vi.mock("../src/components/map/MapCanvas", () => ({
  default: ({
    items,
    onSelect,
    children,
    callout,
  }: {
    items: { id: string; name: string }[];
    onSelect: (p: unknown) => void;
    children: ReactNode;
    callout: ReactNode;
  }) => (
    <div data-testid="map">
      {items.map((p) => (
        <button key={p.id} onClick={() => onSelect(p)}>
          {p.name}
        </button>
      ))}
      {callout}
      {children}
    </div>
  ),
}));
beforeEach(async () => {
  await i18n.changeLanguage("ko");
  vi.clearAllMocks();
  m.failJobs = false;
  m.failRoles = false;
  m.profile = {
    id: "owner",
    role: "hospital",
    name: "원장",
    hospital_name: "테스트병원",
    address: "인천 남동구",
    latitude: 37.4,
    longitude: 126.7,
    seeking_positions: ["치과위생사"],
  };
  m.items = [
    {
      id: "a",
      name: "테스트인재",
      license_type: "치과위생사",
      role: "worker",
      latitude: 37.41,
      longitude: 126.71,
      phone: "010-****-1234",
    },
    {
      id: "b",
      name: "선택밖인재",
      license_type: "간호사",
      latitude: 37.42,
      longitude: 126.72,
    },
  ];
  m.jobs = [
    {
      id: "j1",
      hospital_id: "owner",
      title: "구인공고",
      status: "active",
      schedule_type: "always",
      job_category: "치과위생사",
      created_at: "2026-09-01T00:00:00Z",
    },
  ];
  m.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  m.from.mockImplementation((table: string) => {
    let write: Record<string, unknown> | undefined;
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      order: vi.fn(() => q),
      in: vi.fn(() => q),
      or: vi.fn(() => q),
      update: vi.fn((p) => {
        write = p;
        m.writes(table, p);
        return q;
      }),
      single: vi.fn(async () => ({ data: m.profile, error: null })),
      then: (resolve: (v: unknown) => void) => {
        if (write && table === "profiles")
          resolve(
            m.failRoles
              ? { data: null, error: { message: "denied" } }
              : { data: [{ ...(m.profile as object), ...write }], error: null },
          );
        else
          resolve({
            data: table === "public_profiles" ? m.items : m.jobs,
            error:
              table === "job_postings" && m.failJobs
                ? { message: "offline" }
                : null,
          });
      },
    };
    return q;
  });
});
describe("redesigned dashboard integration", () => {
  it("removes a selected profile when it disappears from the safe public view", async () => {
    render(<Dashboard />);
    await screen.findByText("테스트병원");
    fireEvent.click(screen.getByRole("button", { name: "테스트인재" }));
    expect(
      screen.getByRole("heading", { name: "테스트인재" }),
    ).toBeInTheDocument();
    m.items = [];
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "테스트인재" }),
      ).not.toBeInTheDocument(),
    );
  });
  it("ignores an old authentication result after a newer load succeeds", async () => {
    let finish!: (v: unknown) => void;
    m.getUser.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<Dashboard />);
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    await screen.findByText("테스트병원");
    await act(async () => finish({ data: { user: null } }));
    expect(m.navigate).not.toHaveBeenCalled();
  });
  it("shows hospital identity, public status, and only selected-role pins", async () => {
    render(<Dashboard />);
    await screen.findByText("테스트병원");
    expect(await screen.findByText("공고 ON")).toBeInTheDocument();
    expect(screen.getByText("테스트인재")).toBeInTheDocument();
    expect(screen.queryByText("선택밖인재")).not.toBeInTheDocument();
    expect(m.from).toHaveBeenCalledWith("public_profiles");
  });
  it("does not claim there are no postings when the request fails", async () => {
    m.failJobs = true;
    render(<Dashboard />);
    await screen.findByText("테스트병원");
    await waitFor(() =>
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0),
    );
    expect(
      screen.queryByText("아직 올린 공고가 없어요"),
    ).not.toBeInTheDocument();
  });
  it("opens list view without creating another data source", async () => {
    render(<Dashboard />);
    await screen.findByText("테스트병원");
    const calls = m.from.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "목록 보기" }));
    expect(
      within(screen.getByRole("region", { name: "검색 결과" })).getByRole(
        "button",
        { name: /테스트인재/ },
      ),
    ).toBeInTheDocument();
    expect(m.from).toHaveBeenCalledTimes(calls);
  });
});
