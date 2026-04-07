# Reporte — Alcance recomendado para Workflow Editor CRM (nivel profesional)

Fecha: 2026-03-14
Ámbito: SOLO CRM (`opportunities` + `pipelines`)

---

## 1) Estado actual (base ya disponible)

Hoy el editor ya cubre una base sólida:
- Alta de workflow y navegación al editor.
- Trigger editable.
- Bloques de tipo `condition`, `action`, `response`.
- Variables/operadores/valor por bloque.
- Ramificación real por condición (`trueBranch` / `falseBranch`).
- Persistencia en `trigger_config`.
- Estados de workflow (`draft`, `published`, `archived`) y guardado.

Esto ya habilita un **MVP funcional** de automatizaciones internas CRM.

---

## 2) Qué debe abarcar un editor profesional (con lo que ya tenemos)

## 2.1 Definición del flujo (builder)

Capacidades mínimas profesionales:
- Múltiples triggers por workflow (OR entre triggers) o trigger compuesto configurable.
- Bloques con tipado fuerte por categoría:
  - Condiciones (if/else, reglas compuestas).
  - Acciones CRM.
  - Respuestas/mensajería interna.
  - Control de flujo (wait, split, go-to, end).
- Reordenar bloques (drag & drop por rama).
- Duplicar bloque y copiar/pegar entre ramas.
- Reconvergencia visual de ramas (join).
- Validación visual en tiempo real (bloques incompletos, ramas huérfanas, ciclos).

## 2.2 Motor de condiciones

- Operadores completos: `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `not_contains`, `is_empty`, `is_not_empty`, `in`, `not_in`.
- Grupos AND/OR anidados (profundidad limitada configurable).
- Tipado por campo (texto, numérico, fecha, enum, referencia).
- Normalización de valores (timezone, moneda, case-insensitive según regla).

## 2.3 Acciones CRM (internas)

Set profesional inicial:
- `update_opportunity` (campos, probabilidad, monto, fecha estimada).
- `move_stage` / `move_pipeline` con validaciones.
- `assign_owner` (manual/regla round-robin).
- `create_task` con vencimiento, prioridad y asignado.
- `add_tag` / `remove_tag`.
- `create_note` en historial.
- `pause_workflow_instance` / `cancel_instance`.

## 2.4 Control de ejecución

- `wait` por duración o hasta condición/evento.
- Timeouts por bloque y timeout total por ejecución.
- Reintentos por bloque (backoff exponencial).
- Política ante error (`stop`, `continue`, `go_to_fallback`).

## 2.5 Observabilidad dentro del editor

- Simulador de flujo (dry-run) con payload de ejemplo.
- “Execution preview” por bloque (qué haría y por qué).
- Historial por workflow/version con pasos ejecutados.
- Métricas por bloque: success/fail rate y latencia promedio.

## 2.6 Gobernanza y seguridad

- Versionado publicable (draft -> published -> paused -> archived).
- “Published snapshot” inmutable.
- Auditoría de cambios (quién, cuándo, qué cambió).
- Permisos por rol CRM: ver/crear/editar/publicar/archivar.
- Límites anti abuso por empresa (rate, concurrencia, pasos máximos).

---

## 3) Mapeo recomendado a tu modelo de datos actual

Tu esquema actual ya soporta casi todo lo importante:
- `crm_automation_workflows`: definición activa + estado.
- `crm_automation_workflow_versions`: snapshot inmutable por versión.
- `crm_automation_executions`: corrida por evento.
- `crm_automation_execution_steps`: trazabilidad paso a paso.
- `crm_automation_dead_letter_queue`: manejo de fallas no recuperables.

Sugerencia de contrato JSON en `trigger_config` (v1.1+):
- `triggers[]`
- `graph` o `steps[]` con:
  - `id`, `type`, `config`, `trueBranch[]`, `falseBranch[]`, `nextStepId` (si aplica)
- `settings`:
  - `maxDurationMs`, `retryPolicy`, `errorPolicy`, `timezone`

---

## 4) Roadmap realista por fases

## Fase 1 (MVP productivo corto)
- Trigger único.
- Condiciones + ramas true/false.
- Acciones internas básicas (`move_stage`, `assign_owner`, `create_task`, `tags`).
- Guardar/publicar/archivar.
- Registro básico de ejecuciones.

Resultado: usable por operaciones comerciales sin depender de ingeniería.

## Fase 2 (Profesional core)
- Drag & drop + reconvergencia de ramas.
- Simulador (dry-run) y validaciones avanzadas.
- Wait/timeouts/retries/error policy por bloque.
- Versionado robusto (diff entre versiones + rollback).

Resultado: motor confiable y mantenible para escala media.

## Fase 3 (Enterprise)
- Templates reutilizables por industria.
- Librería de bloques y snippets.
- A/B de workflows y analytics por conversión.
- Multi-trigger avanzado y reglas de prioridad.

Resultado: plataforma de automatización CRM competitiva a nivel mercado.

---

## 5) Matriz de capacidades (prioridad)

Prioridad alta (hacer ahora):
- Reconvergencia visual + continuidad de flujo tras condición.
- Reordenar bloques en rama.
- Validaciones de publicación (sin errores de diseño).
- Acción `wait` y política de reintentos básica.
- Vista de ejecuciones por workflow (mínimo filtro por estado/fecha).

Prioridad media:
- Editor de expresiones avanzado (AND/OR anidado).
- Duplicar/copiar-pegar bloques.
- Plantillas de workflows.

Prioridad baja:
- Features de IA para autogenerar reglas.
- Integraciones externas (si siguen fuera de alcance v1).

---

## 6) Requisitos no funcionales (para considerarlo “pro”)

- Idempotencia por evento/workflow (`idempotency_key`).
- p95 de inicio de ejecución < 5s.
- Trazabilidad completa por `execution_id` y `step_id`.
- Error handling consistente + DLQ operable.
- Aislamiento multi-tenant estricto (`company_id` en todo).

---

## 7) Riesgos principales y mitigación

- Riesgo: workflows inválidos o ambiguos.
  - Mitigación: validador de grafo previo a publicar + lint de reglas.

- Riesgo: loops/ejecuciones infinitas.
  - Mitigación: límites de profundidad/pasos/tiempo y detector de ciclos.

- Riesgo: degradación de CRM operativo.
  - Mitigación: ejecución async con colas + bulk queries + límites por tenant.

- Riesgo: baja adopción por UX compleja.
  - Mitigación: templates + modo guiado + onboarding en editor.

---

## 8) KPI de producto sugeridos

- Time-to-first-workflow publicado.
- % workflows publicados sobre creados.
- Tasa de éxito de ejecución.
- Tiempo promedio de diagnóstico de fallo.
- Incremento en conversión de oportunidades atribuible a automatizaciones.

---

## 9) Conclusión ejecutiva

Con lo que ya está implementado y la base SQL disponible, el módulo puede evolucionar a un **workflow editor profesional** sin cambiar de arquitectura.

El siguiente salto de valor más importante es:
1) reconvergencia y ordenamiento visual,
2) validador de publicación,
3) observabilidad por ejecución/paso.

Eso te lleva de “builder funcional” a “motor CRM confiable para producción”.
