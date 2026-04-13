# ✅ CRM Automatizaciones — Checklist de Desarrollo (Production-Ready)

Checklist para implementar un módulo de automatizaciones tipo workflow builder (estilo GHL/n8n), **limitado exclusivamente al CRM** en:
- **Opportunities**
- **Pipelines**

---

## 0) Alcance y límites (obligatorio antes de construir)

### ✅ In scope (v1)
- [ ] Crear workflows con disparadores de CRM (eventos de oportunidades/pipelines).
- [ ] Definir condiciones (if/else) sobre campos de oportunidad y estado de pipeline/etapa.
- [ ] Ejecutar acciones dentro del CRM (sin salir a sistemas externos en v1).
- [ ] Permitir publicar/pausar/versionar workflows.
- [ ] Ejecutar workflows en background con reintentos y trazabilidad.

### ❌ Out of scope (v1)
- [ ] Integraciones externas tipo webhooks, Zapier, etc.
- [ ] Constructor visual avanzado con nodos custom complejos.
- [ ] Automatizaciones fuera de CRM (facturación, inventario, etc.).

### Criterio de aceptación
- [ ] Existe documento de alcance firmado por producto + ingeniería con ejemplos de casos cubiertos y excluidos.

---

## 1) Casos de uso mínimos de negocio

- [ ] **CU1**: Cuando una oportunidad entra a una etapa, asignar owner automáticamente según regla.
- [ ] **CU2**: Si una oportunidad queda sin actividad por X días, crear tarea de seguimiento.
- [ ] **CU3**: Si probabilidad supera umbral, mover a etapa objetivo automáticamente.
- [ ] **CU4**: Si oportunidad se marca perdida, aplicar tags y cerrar tareas abiertas.
- [ ] **CU5**: Reglas por pipeline (workflow activo solo en pipeline específico).

### Criterio de aceptación
- [ ] Cada caso tiene: trigger, condiciones, acciones, expected result, y edge cases documentados.

---

## 2) Modelo funcional del workflow (diseño de producto)

### 2.1 Entidades
- [ ] `automation_workflows` (definición + estado + versión publicada)
- [ ] `automation_workflow_versions` (JSON inmutable por versión)
- [ ] `automation_executions` (instancia corrida por evento)
- [ ] `automation_execution_steps` (paso por paso + duración + estado)
- [ ] `automation_dead_letter_queue` (fallas no recuperables)

### 2.2 Estados
- [ ] Workflow: `draft | published | paused | archived`
- [ ] Ejecución: `queued | running | success | failed | canceled | dead_letter`
- [ ] Paso: `pending | running | success | failed | skipped`

### 2.3 Versionado
- [ ] Publicar crea snapshot inmutable.
- [ ] Nuevas ejecuciones usan siempre última versión publicada.
- [ ] Ejecuciones en curso no cambian de versión.

### Criterio de aceptación
- [ ] Contrato funcional aprobado (FSM de estados + reglas de transición).

---

## 3) Triggers, condiciones y acciones (solo CRM)

### 3.1 Triggers v1
- [ ] Opportunity creada.
- [ ] Opportunity actualizada (cambio de campo relevante).
- [ ] Opportunity movida de etapa/pipeline.
- [ ] Opportunity ganada/perdida.

### 3.2 Condiciones v1
- [ ] Igualdad/diferencia (`=`, `!=`).
- [ ] Comparadores numéricos (`>`, `<`, `>=`, `<=`) para valor/probabilidad.
- [ ] Presencia/ausencia de datos.
- [ ] Contiene/no contiene (tags, texto corto).
- [ ] AND / OR (sin anidación infinita en v1, profundidad acotada).

### 3.3 Acciones v1 (internas CRM)
- [ ] Cambiar etapa.
- [ ] Cambiar pipeline (si regla lo permite).
- [ ] Asignar responsable.
- [ ] Crear tarea.
- [ ] Actualizar campos de oportunidad.
- [ ] Agregar/remover tags.
- [ ] Agregar nota de sistema en historial.

### Criterio de aceptación
- [ ] Matriz Trigger x Condición x Acción validada con negocio y QA.

---

## 4) Arquitectura técnica y ejecución

### 4.1 Patrón de ejecución
- [ ] Separar claramente:
  - [ ] API de definición/publicación de workflows.
  - [ ] Motor evaluador (conditions engine).
  - [ ] Worker/queue de ejecuciones.
- [ ] Diseñar ejecución **asíncrona** para no bloquear operaciones de CRM.

### 4.2 Eventos
- [ ] Definir `domain events` para opportunities/pipelines.
- [ ] Publicar eventos con `event_id` único e idempotente.
- [ ] Persistir payload mínimo + metadata (company_id, entity_id, actor_id, timestamp).

### 4.3 Idempotencia y reintentos
- [ ] `idempotency_key` por ejecución/paso.
- [ ] Reintentos con backoff exponencial y límite.
- [ ] Mover a DLQ cuando excede reintentos.

### 4.4 Rendimiento
- [ ] Evitar N+1: nunca consultas por iteración en loops; usar consultas bulk + maps.
- [ ] Límites de profundidad/pasos por workflow para evitar loops infinitos.
- [ ] Timeouts por paso y timeout total por ejecución.

### Criterio de aceptación
- [ ] Cargas de prueba demuestran que operaciones de CRM no degradan por ejecución de automatizaciones.

---

## 5) Seguridad, multi-tenant y cumplimiento

- [ ] RLS y aislamiento estricto por `company_id` en todas las tablas de automatización.
- [ ] Validación de permisos por rol CRM para crear/editar/publicar workflows.
- [ ] Sanitizar y validar payload de entrada (schemas estrictos).
- [ ] Auditoría completa de cambios: quién creó/editó/publicó/pausó.
- [ ] Secrets: no almacenar credenciales sensibles en definición JSON.
- [ ] Hard limits anti-abuso (rate limit por compañía y por workflow).

### Criterio de aceptación
- [ ] Tests de seguridad multi-tenant pasan (sin acceso cruzado entre compañías).

---

## 6) API y contratos

- [ ] Definir contratos API versionados para:
  - [ ] CRUD de workflows.
  - [ ] Publicar/pausar/archivar.
  - [ ] Simular workflow (dry-run).
  - [ ] Consultar ejecuciones + pasos.
- [ ] Validación de schema en requests/responses.
- [ ] Errores consistentes (`code`, `message`, `details`, `trace_id`).
- [ ] Paginación y filtros para listados de ejecuciones.

### Criterio de aceptación
- [ ] API docs actualizadas y testeadas con casos positivos/negativos.

---

## 7) UX mínima del Workflow Builder (v1)

- [ ] Lista de workflows con estado y métricas básicas.
- [ ] Editor v1 simple (form-driven) con:
  - [ ] Trigger único.
  - [ ] Grupo de condiciones.
  - [ ] Secuencia lineal de acciones.
- [ ] Validaciones en tiempo real (reglas incompletas, condiciones inválidas).
- [ ] Flujo Draft → Publish con confirmación.
- [ ] Vista de historial de ejecuciones por workflow.

### Criterio de aceptación
- [ ] Un usuario no técnico puede crear y publicar CU1-CU3 sin soporte de ingeniería.

---

## 8) Observabilidad y operación

- [ ] Logging estructurado con `trace_id`, `workflow_id`, `execution_id`, `company_id`.
- [ ] Métricas mínimas:
  - [ ] ejecuciones/min
  - [ ] success rate
  - [ ] latency p50/p95/p99
  - [ ] retries
  - [ ] dead letters
- [ ] Alertas operativas:
  - [ ] caída del worker
  - [ ] aumento de failed rate
  - [ ] DLQ por encima de umbral
- [ ] Dashboard operativo de automatizaciones.

### Criterio de aceptación
- [ ] On-call puede diagnosticar una falla en < 10 minutos usando logs + métricas.

---

## 9) Calidad, testing y hardening

### 9.1 Testing
- [ ] Unit tests del motor de condiciones.
- [ ] Unit tests de acciones CRM.
- [ ] Integration tests de trigger→ejecución→acción.
- [ ] Tests de concurrencia/idempotencia.
- [ ] Tests de permisos y RLS.
- [ ] Tests de regresión para `opportunities` y `pipelines` existentes.

### 9.2 Performance
- [ ] Carga con eventos pico (objetivo definido por negocio).
- [ ] Stress test de múltiples workflows activos por compañía.
- [ ] Verificación de consumo de DB/CPU/latencia bajo carga.

### 9.3 Resiliencia
- [ ] Simular caídas de worker/DB y validar recuperación.
- [ ] Verificar retry + DLQ + replay manual.

### Criterio de aceptación
- [ ] Suite crítica automatizada en CI obligatoria para merge a main.

---

## 10) Migraciones y datos

- [ ] Migraciones SQL versionadas para tablas/índices/constraints.
- [ ] Índices clave (`company_id`, `workflow_id`, `execution_status`, `created_at`).
- [ ] Backfill seguro si se requieren datos históricos.
- [ ] Estrategia de rollback de migraciones documentada.

### Criterio de aceptación
- [ ] Migraciones corren en staging/prod sin downtime no planificado.

---

## 11) Despliegue y release strategy

- [ ] Feature flag por compañía para activación gradual.
- [ ] Entornos: dev → staging → prod con paridad.
- [ ] Smoke tests post-deploy automáticos.
- [ ] Canary interno antes de habilitar clientes.
- [ ] Plan de rollback funcional y técnico.

### Criterio de aceptación
- [ ] Release checklist firmada por Producto + Ingeniería + QA.

---

## 12) Runbook operativo

- [ ] Procedimiento para pausar workflows global o por compañía.
- [ ] Procedimiento para replay de DLQ.
- [ ] Procedimiento para desactivar acción problemática.
- [ ] Matriz de severidad/incidentes y tiempos de respuesta.
- [ ] Contactos y ownership (equipo responsable).

### Criterio de aceptación
- [ ] Runbook validado mediante simulacro de incidente.

---

## 13) Definición de Done (Go-Live)

- [ ] Todos los criterios de aceptación anteriores cumplidos.
- [ ] 0 vulnerabilidades críticas/altas abiertas para este módulo.
- [ ] Error budget y SLO definidos para automatizaciones CRM.
- [ ] Documentación de usuario + documentación técnica publicadas.
- [ ] Monitoreo y alertas activas en producción.
- [ ] Feature flag habilitado inicialmente a grupo piloto.

---

## 14) SLO sugeridos para v1 (ajustables)

- [ ] Disponibilidad del motor de ejecución: **99.9% mensual**.
- [ ] Latencia de inicio de ejecución p95: **< 5s** desde trigger.
- [ ] Success rate (sin contar reglas inválidas de usuario): **> 99%**.
- [ ] Tiempo de recuperación ante fallo crítico (MTTR): **< 30 min**.

---

## 15) Roadmap recomendado (post-v1)

- [ ] Webhooks salientes y acciones externas.
- [ ] Builder visual de nodos (ramificación avanzada).
- [ ] Plantillas de workflows por industria.
- [ ] Testing sandbox con datos simulados.
- [ ] Version compare y diff visual entre workflows.

---

## Resumen ejecutivo

Sí, **es totalmente implementable** en este CRM, siempre que se respete:
1. Alcance controlado de v1 (solo opportunities/pipelines).
2. Arquitectura asíncrona con idempotencia + observabilidad.
3. Seguridad multi-tenant estricta y rollout gradual con feature flags.

Con esta checklist, el módulo nace con estándares de producción desde el inicio en lugar de “parchar” después.
