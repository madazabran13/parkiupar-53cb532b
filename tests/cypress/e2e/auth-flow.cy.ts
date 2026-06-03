/// <reference types="cypress" />

describe("Login page (UI smoke)", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("renderiza inputs de email y password", () => {
    cy.get('input[type="email"], input[name="email"]').first().should("be.visible");
    cy.get('input[type="password"], input[name="password"]').first().should("be.visible");
  });

  it("muestra botón de submit del formulario de login", () => {
    cy.get('button[type="submit"]').first().should("be.visible");
  });

  it("validación cliente: submit con campos vacíos no navega al dashboard", () => {
    cy.get('button[type="submit"]').first().click();
    cy.wait(500);
    cy.url().should("not.match", /\/dashboard/);
  });
});

describe("Protección de rutas privadas", () => {
  it("acceder a /dashboard sin sesión redirige a /login", () => {
    cy.visit("/dashboard");
    cy.url({ timeout: 10_000 }).should("match", /\/login/);
  });
});
