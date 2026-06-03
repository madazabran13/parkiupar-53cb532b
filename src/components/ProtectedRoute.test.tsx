import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const mockUseAuth = vi.fn();
const mockUseTenant = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/hooks/useTenant", () => ({
  useTenant: () => mockUseTenant(),
}));

function renderWithRouter(initialPath = "/dashboard", element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/suspended" element={<div>Suspended Page</div>} />
        <Route path="/access-denied" element={<div>Access Denied Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("<ProtectedRoute />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra skeleton mientras carga la sesión (auth loading)", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    mockUseTenant.mockReturnValue({ tenant: null, loading: false });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("muestra skeleton mientras carga el tenant", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, role: "admin", loading: false });
    mockUseTenant.mockReturnValue({ tenant: null, loading: true });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("redirige a /login cuando no hay user", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    mockUseTenant.mockReturnValue({ tenant: null, loading: false });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirige a /suspended cuando tenant.is_active=false y rol no es superadmin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      role: "admin",
      loading: false,
    });
    mockUseTenant.mockReturnValue({
      tenant: { id: "t1", is_active: false },
      loading: false,
    });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Suspended Page")).toBeInTheDocument();
  });

  it("permite acceso al superadmin aunque el tenant esté suspendido", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      role: "superadmin",
      loading: false,
    });
    mockUseTenant.mockReturnValue({
      tenant: { id: "t1", is_active: false },
      loading: false,
    });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("redirige a /access-denied cuando el rol no está en allowedRoles", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      role: "conductor",
      loading: false,
    });
    mockUseTenant.mockReturnValue({
      tenant: { id: "t1", is_active: true },
      loading: false,
    });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Access Denied Page")).toBeInTheDocument();
  });

  it("renderiza children cuando el rol está permitido", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      role: "admin",
      loading: false,
    });
    mockUseTenant.mockReturnValue({
      tenant: { id: "t1", is_active: true },
      loading: false,
    });

    renderWithRouter(
      "/dashboard",
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Dashboard content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
