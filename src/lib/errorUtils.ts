/**
 * Extracts a user-safe error message from an error object.
 * Prevents leaking internal Postgres / Supabase details to the UI.
 *
 * Known safe prefixes (raised intentionally from our RPCs or client validations)
 * are passed through; everything else is replaced with a generic fallback.
 */

const SAFE_PREFIXES = [
  "No hay",
  "No se puede",
  "No se encontr",
  "Usuario no autenticado",
  "Stock insuficiente",
  "El pago",
  "El monto",
  "Cantidad",
  "Debe",
  "Cliente",
  "Producto",
  "La reserva",
  "Faltan",
  "Ingrese",
  "Puntos insuficientes",
  "Pago insuficiente",
];

export function getUserErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado. Intente nuevamente."
): string {
  if (!error) return fallback;

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  // Allow messages that start with known safe prefixes
  if (SAFE_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return raw;
  }

  // Log for observability, but don't show internals to user
  console.error("[sanitised]", raw);
  return fallback;
}
