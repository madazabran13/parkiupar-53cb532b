/// <reference types="cypress" />

import "./commands";

Cypress.on("uncaught:exception", (err) => {
  // El SPA usa ResizeObserver y otros browser APIs que pueden lanzar
  // errores benignos durante navegación rápida. Solo absorbe los conocidos.
  const benign = [
    "ResizeObserver loop",
    "Hydration failed",
    "Failed to fetch dynamically imported module",
  ];
  if (benign.some((b) => err.message.includes(b))) return false;
  return true;
});
