import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import NetworkGuard from "./NetworkGuard";

const mockNavigate = vi.fn();
const mockSetHandler = vi.fn(() => () => {});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/networkStatus", () => ({
  setNetworkErrorHandler: (...args: unknown[]) => mockSetHandler(...args),
}));

function CurrentPath() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("<NetworkGuard />", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: originalOnLine });
  });

  it("se registra como handler de errores de red", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NetworkGuard />
      </MemoryRouter>,
    );
    expect(mockSetHandler).toHaveBeenCalledTimes(1);
    expect(typeof mockSetHandler.mock.calls[0][0]).toBe("function");
  });

  it("no redirige cuando ya estamos en /no-internet", () => {
    render(
      <MemoryRouter initialEntries={["/no-internet"]}>
        <NetworkGuard />
        <CurrentPath />
      </MemoryRouter>,
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirige automáticamente cuando el navegador ya está offline al montar", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NetworkGuard />
      </MemoryRouter>,
    );
    expect(mockNavigate).toHaveBeenCalledWith("/no-internet", { replace: true });
    expect(sessionStorage.getItem("no-internet-return")).toBe("/dashboard");
  });

  it("redirige cuando el browser dispara el evento offline", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NetworkGuard />
      </MemoryRouter>,
    );
    window.dispatchEvent(new Event("offline"));
    expect(mockNavigate).toHaveBeenCalledWith("/no-internet", { replace: true });
  });

  it("no renderiza output visual", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NetworkGuard />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
