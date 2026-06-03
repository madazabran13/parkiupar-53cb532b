/// <reference types="cypress" />

const hasCreds =
  Cypress.env("SUPABASE_URL") &&
  Cypress.env("SUPABASE_ANON_KEY") &&
  Cypress.env("E2E_USER") &&
  Cypress.env("E2E_PASS");

(hasCreds ? describe : describe.skip)("Flujo autenticado: dashboard reachable", () => {
  beforeEach(() => {
    cy.loginViaSupabase();
  });

  it("/dashboard renderiza sin redirect a /login", () => {
    cy.visit("/dashboard");
    cy.url({ timeout: 10_000 }).should("match", /\/dashboard/);
  });
});
