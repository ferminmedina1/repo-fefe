# CRM Automatizaciones: Estrategia de Triggers y Filtros Logicos

Fecha: 2026-03-19
Alcance: modulo CRM actual (opportunities + pipelines + entidades CRM relacionadas)

## 1) Estado actual del editor de triggers

Implementado hoy en el editor:
- Tipos de trigger:
  - `opportunity_updated`
  - `pipeline_stage_changed`
- Filtros por trigger:
  - `pipelineId` (opcional)
  - `stageName` (opcional)
- Soporte multi-trigger:
  - `trigger_config.triggers[]`

Evidencia en codigo:
- `src/pages/CrmAutomationEditor.tsx:66`
- `src/pages/CrmAutomationEditor.tsx:124`
- `src/pages/CrmAutomationEditor.tsx:258`
- `src/pages/CrmAutomationEditor.tsx:739`

## 2) Inventario de elementos CRM utiles como fuente de trigger

### 2.1 Opportunity lifecycle

Fuente principal para triggers de negocio.

Campos y comportamiento existente utiles para eventos/filtros:
- pipeline y etapa:
  - `pipeline_id`, `stage`
- ownership:
  - `owner_id`
- valor y probabilidad:
  - `value`, `probability`
- fechas:
  - `estimated_close_date`
- datos personalizados:
  - `custom_fields`

Evidencia:
- `supabase/migrations/20260126_create_crm_opportunities.sql:2`
- `src/pages/Opportunities.tsx:119`
- `src/pages/Opportunities.tsx:120`
- `src/pages/Opportunities.tsx:121`
- `src/pages/Opportunities.tsx:122`
- `src/pages/Opportunities.tsx:985`
- `src/pages/Opportunities.tsx:986`

Triggers candidatos directos:
- Opportunity created
- Opportunity updated
- Opportunity deleted
- Opportunity moved stage
- Opportunity owner changed
- Opportunity value changed
- Opportunity probability changed
- Opportunity expected close date changed
- Opportunity custom field changed

### 2.2 Pipelines y reglas de etapa

Util para triggers de cambios estructurales o reglas SLA.

Entidades:
- `crm_pipelines` (incluye `stages`)
- `crm_stage_rules` (SLA, auto-assign, reminder)

Evidencia:
- `supabase/migrations/20260126_create_crm_pipelines.sql:2`
- `supabase/migrations/20260211_create_crm_stage_rules.sql:2`
- `src/pages/Opportunities.tsx:250`
- `src/pages/Opportunities.tsx:1665`

Triggers candidatos:
- Pipeline stage catalog changed
- Stage SLA breached (derivado por scheduler)
- Stage rule changed

### 2.3 Actividades y log de actividades

Ideal para automaciones de seguimiento comercial.

Entidades:
- `crm_activities`
- `crm_activity_log`

Evidencia:
- `supabase/migrations/20260211_create_crm_activities.sql:2`
- `supabase/migrations/20260211_create_crm_activities.sql:17`
- `src/data/crm/activityRepository.ts:13`
- `src/data/crm/activityLogRepository.ts:13`

Triggers candidatos:
- Activity created
- Activity completed
- Activity overdue (derivado por scheduler)
- Activity type changed
- Activity log action = X

### 2.4 Mensajeria CRM

Fuente para automaciones de outreach y retry.

Entidades:
- `crm_message_templates`
- `crm_message_logs`

Evidencia:
- `supabase/migrations/20260211_create_crm_message_templates_logs.sql:2`
- `supabase/migrations/20260211_create_crm_message_templates_logs.sql:18`
- `src/data/crm/messageLogRepository.ts:8`

Triggers candidatos:
- Message queued
- Message sent
- Message failed
- Message failed N times (agregado)

### 2.5 Scoring y etiquetado

Entidades:
- `crm_scoring_rules`
- `crm_tags`

Evidencia:
- `supabase/migrations/20260211_create_crm_scoring_rules.sql:2`
- `supabase/migrations/20260211_create_crm_tags.sql:2`
- `src/data/crm/scoringRuleRepository.ts:8`
- `src/data/crm/tagRepository.ts:8`

Triggers candidatos:
- Score crossed threshold
- Score changed by delta
- Tag added
- Tag removed

### 2.6 Campos custom de oportunidades

Entidad:
- `crm_opportunity_custom_field_definitions`

Evidencia:
- `supabase/migrations/20260317190000_create_crm_opportunity_custom_field_definitions.sql:1`

Triggers candidatos:
- Custom field changed (per key)
- Custom field became empty / not empty
- Select option changed to X

### 2.7 Schedules existentes en CRM

Entidad:
- `crm_report_schedules`

Evidencia:
- `supabase/migrations/20260219_add_crm_report_schedules.sql:3`

Hallazgo:
- Ya existe modelo de frecuencia (`daily|weekly|monthly|yearly`) y hora (`send_time`) para reportes.
- Conviene reutilizar conceptos (tz, periodicidad, ventanas) para `cron/scheduled triggers`.

## 3) Benchmark de CRMs (referencias externas)

## 3.1 HubSpot

Hallazgos relevantes:
- Diferencia explicita entre triggers por evento y por filtros.
- Trigger por schedule con recurrencia (once, annual, monthly, weekly, daily).
- Re-enrollment como comportamiento configurable.
- Trigger por webhook.

Referencias:
- https://knowledge.hubspot.com/workflows/set-your-workflow-enrollment-triggers
- https://knowledge.hubspot.com/workflows/use-based-on-a-schedule-workflow-enrollment-triggers

Lecciones aplicables:
- Separar claramente `event trigger` vs `filter-based trigger`.
- Permitir re-ejecucion configurable (`once`, `every-time`, `cooldown`).
- Schedule trigger debe exigir criterio de elegibilidad para evitar ejecuciones masivas involuntarias.

## 3.2 Salesforce

Hallazgos relevantes:
- Variantes de triggered flows: record-triggered, schedule-triggered, scheduled paths, API/on-demand, event-triggered.
- Diferencia operativa entre before-save/after-save y rutas asincronas.
- Orden de ejecucion y consideraciones de runtime.

Referencias:
- https://help.salesforce.com/s/articleView?id=sf.flow_concepts_trigger.htm&type=5
- https://help.salesforce.com/s/articleView?id=platform.flow_considerations_trigger_record.htm&type=5
- https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_start.htm&type=5

Lecciones aplicables:
- Definir modelo de ejecucion sincronico vs asincronico por trigger tipo.
- Priorizar idempotencia y run order cuando varios workflows compiten por la misma entidad.
- Incorporar paths diferidos para evitar impacto de latencia en eventos de escritura.

## 3.3 GoHighLevel

Estado de evidencia:
- El Help Center publico devolvio 404 en rutas de workflows durante este relevamiento.
- Se confirmo portal de developers/API (sin detalle de triggers en la extraccion actual).

Referencia recuperada:
- https://developers.gohighlevel.com/

Uso recomendado de la referencia:
- Considerar GHL como inspiracion UX de builder y composicion de pasos, pero basar decisiones funcionales en evidencia verificable (HubSpot/Salesforce + modelo interno).

## 4) Propuesta de expansion de tipos de trigger

## 4.1 Catalogo recomendado (MVP+)

### A) Event-based (reaccion inmediata)
- `opportunity_created`
- `opportunity_updated` (ya existe)
- `opportunity_deleted`
- `opportunity_stage_changed` (ya parcialmente cubierto por `pipeline_stage_changed`)
- `opportunity_owner_changed`
- `opportunity_value_changed`
- `opportunity_probability_changed`
- `opportunity_custom_field_changed`
- `activity_created`
- `activity_completed`
- `message_status_changed`

### B) Time-based (scheduler / cron)
- `schedule_cron`
- `schedule_interval`
- `schedule_daily`
- `schedule_weekly`
- `schedule_monthly`

Notas:
- Tu pedido de cron de dia/hora/min/seg se cubre en `schedule_cron` + `timezone`.

### C) State-based (condicion sostenida / vencimientos)
- `opportunity_stagnant` (N horas/dias sin cambios)
- `sla_breached` (por `crm_stage_rules.sla_days`)
- `activity_overdue`
- `no_reply_timeout` (si se integra con message logs)

### D) Manual/API
- `manual_trigger`
- `webhook_received`
- `api_invoked`

## 4.2 Modelo de trigger propuesto en `trigger_config`

```json
{
  "evaluation": {
    "mode": "any",
    "cooldownSeconds": 0,
    "reEnrollment": "every_time"
  },
  "triggers": [
    {
      "id": "trg_1",
      "type": "opportunity_stage_changed",
      "enabled": true,
      "event": {
        "entity": "crm_opportunities",
        "when": "updated",
        "field": "stage"
      },
      "filterGroupId": "fg_1"
    },
    {
      "id": "trg_2",
      "type": "schedule_cron",
      "enabled": true,
      "schedule": {
        "timezone": "America/Argentina/Buenos_Aires",
        "cron": "0 0 9 * * 1-5"
      },
      "filterGroupId": "fg_2"
    }
  ],
  "filterGroups": [
    {
      "id": "fg_1",
      "logic": "all",
      "conditions": [
        { "field": "pipeline_id", "op": "eq", "value": "uuid" },
        { "field": "stage", "op": "in", "value": ["nuevo", "en_proceso"] },
        { "field": "value", "op": "gte", "value": 100000 }
      ]
    },
    {
      "id": "fg_2",
      "logic": "all",
      "conditions": [
        { "field": "owner_id", "op": "is_not_null" },
        { "field": "estimated_close_date", "op": "lte", "value": "now+7d" }
      ]
    }
  ],
  "settings": {
    "maxRetries": 3,
    "retryBackoffSeconds": 30
  },
  "steps": []
}
```

## 5) Filtros logicos y concatenacion

## 5.1 Operadores recomendados

Comparacion:
- `eq`, `neq`, `gt`, `gte`, `lt`, `lte`

Texto/lista:
- `contains`, `not_contains`, `starts_with`, `ends_with`, `in`, `not_in`

Nulidad/estado:
- `is_null`, `is_not_null`, `is_empty`, `is_not_empty`

Fecha/tiempo:
- `before`, `after`, `between`, `within_next`, `within_last`

Cambio de valor:
- `changed`, `changed_from`, `changed_to`, `changed_by`

## 5.2 Logica booleana

Niveles:
- Nivel trigger: `evaluation.mode = any|all`
- Nivel grupo: `logic = all|any`
- Nivel avanzado (fase 2): grupos anidados tipo AST

Ejemplo expresivo:
- `(pipeline=A AND stage in [X,Y]) OR (owner changed AND value >= 100000)`

## 6) Diseno especifico de cron (pedido explicito)

Campos minimos:
- `timezone` (obligatorio)
- `cron` (obligatorio, 6 campos con segundos)
- `startAt`/`endAt` (opcionales)
- `jitterSeconds` (opcional para distribuir carga)
- `maxRunsPerWindow` (guardrail)

Validaciones:
- Expresion valida + timezone valida.
- Bloqueo de expresiones ultra-frecuentes por defecto (ej: cada segundo) salvo override.
- Preview de proximas 5 ejecuciones en UI.

## 7) Cambios en UI del editor

## 7.1 Trigger builder

Agregar en modal de triggers:
- Selector de tipo extendido (event/time/state/manual).
- Form dinamico por tipo (ej: cron con timezone + expresion + preview).
- Selector de `filterGroup` asociado al trigger.
- Toggle `enabled` por trigger.

## 7.2 Logical filter builder

Agregar bloque visual tipo rule builder:
- Grupos `ALL/ANY`.
- Condiciones por campo/op/valor.
- Reordenamiento y duplicado de reglas.
- Validacion inline por tipo de dato.

## 7.3 Compatibilidad backward

Mantener parser legado:
- `trigger_type` + `triggerFilter` -> migrar en memoria a `triggers[]` + `filterGroups[]`.

## 8) Cambios backend / runtime necesarios

## 8.1 Event ingestion

Crear normalizacion de eventos CRM:
- `source_event_type`
- `entity`
- `before` / `after`
- `changedFields[]`

## 8.2 Evaluador de triggers

Pipeline recomendado:
1. Cargar workflows activos por compania.
2. Evaluar match de `triggers[]` por tipo.
3. Evaluar filtros logicos.
4. Aplicar `reEnrollment` + `cooldown` + idempotencia.
5. Encolar ejecucion en `crm_automation_executions`.

## 8.3 Scheduler cron

Recomendacion:
- Job recurrente (cada minuto) que calcula due workflows por cron/timezone.
- Emite eventos sinteticos hacia el mismo evaluador.
- Evita caminos separados de ejecucion.

## 9) Roadmap sugerido

Fase 1 (rapida, alto impacto):
- Nuevos triggers event-based de opportunity (created, owner changed, value/probability changed).
- Filtros expandibles (operadores + ALL/ANY simple).
- `schedule_daily|weekly|monthly` reutilizando conceptos de `crm_report_schedules`.

Fase 2 (pedido cron completo):
- `schedule_cron` con segundos + timezone + preview.
- `reEnrollment` + `cooldownSeconds`.
- Trigger groups `ANY/ALL` a nivel workflow.

Fase 3 (pro):
- Grupos logicos anidados.
- Triggers por activity/message status.
- Trigger manual/API/webhook.
- Observabilidad avanzada (match reason por trigger/condicion).

## 10) Riesgos y mitigaciones

Riesgos:
- Explosiones de ejecucion por cron o condiciones amplias.
- Doble disparo por updates masivos.
- Costo de queries de evaluacion por evento.

Mitigaciones:
- Guardrails de frecuencia + `maxRunsPerWindow`.
- Idempotency keys y deduplicacion por ventana temporal.
- Cache de workflows activos por company.
- Indices sobre campos frecuentes de filtro.

## 11) Recomendacion ejecutiva

Priorizar una arquitectura unificada de evaluacion (`event` y `schedule` convergen al mismo engine) y adoptar un contrato de trigger declarativo (`triggers[] + filterGroups[] + evaluation`).

Con eso resolves:
- tu necesidad inmediata de mas tipos de trigger (incluyendo cron),
- filtros logicos concatenables,
- y escalabilidad para casos tipo HubSpot/Salesforce sin rehacer el editor.
