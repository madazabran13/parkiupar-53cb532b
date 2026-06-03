/// <reference types="cypress" />

describe("Landing page (smoke)", () => {
  it("la SPA carga y muestra título de ParkiUpar", () => {
    cy.visit("/");
    cy.title().should("match", /Parki\s*Upar|ParkiUpar/i);
  });

  it("hay al menos un CTA o enlace hacia /login", () => {
    cy.visit("/");
    cy.get('a[href="/login"], a[href*="/login"]', { timeout: 10_000 })
      .first()
      .should("be.visible");
  });

  it("ruta inexistente cae en SPA fallback (no 404 del CDN)", () => {
    cy.request({ url: "/_ruta_inexistente_xyz", failOnStatusCode: false })
      .its("status")
      .should("be.lessThan", 400);
    cy.visit("/_ruta_inexistente_xyz");
    cy.get("body").should("be.visible");
  });
});
