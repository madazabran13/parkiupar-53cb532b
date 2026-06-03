/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Login programático contra Supabase usando E2E_USER / E2E_PASS.
       * Setea el sesión en localStorage y recarga la SPA.
       */
      loginViaSupabase(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginViaSupabase", () => {
  const url = Cypress.env("SUPABASE_URL");
  const anon = Cypress.env("SUPABASE_ANON_KEY");
  const email = Cypress.env("E2E_USER");
  const password = Cypress.env("E2E_PASS");

  if (!url || !anon || !email || !password) {
    throw new Error(
      "Faltan env vars CYPRESS_SUPABASE_URL / SUPABASE_ANON_KEY / E2E_USER / E2E_PASS",
    );
  }

  cy.request({
    method: "POST",
    url: `${url}/auth/v1/token?grant_type=password`,
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: { email, password },
  }).then(({ body }) => {
    const projectRef = new URL(url).host.split(".")[0];
    const key = `sb-${projectRef}-auth-token`;
    window.localStorage.setItem(key, JSON.stringify(body));
  });
});

export {};
