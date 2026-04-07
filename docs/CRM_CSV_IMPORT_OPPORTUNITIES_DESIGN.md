# Diseño funcional — Importación CSV de Oportunidades CRM

Fecha: 2026-03-17
Estado: Propuesta para implementación

## 1) Objetivo
Permitir que un usuario nuevo importe oportunidades históricas desde CSV al módulo CRM, con:
- Validación previa completa antes de insertar.
- Detección de filas inválidas/incompletas.
- Opción de excluir filas inválidas o corregir CSV y reintentar.
- Asignación a pipeline/etapa de forma segura y mantenible.

## 2) Esquema objetivo (tabla `crm_opportunities`)
### Campos obligatorios reales
- `company_id`
- `name`
- `email`
- `phone`

### Campos con default o recomendados
- `status` default: `abierta`
- `stage` (obligatorio lógico en app; usar fallback controlado)
- `probability` default: `0`
- `currency` default: `ARS`
- `score_total` default: `0`

### Campos opcionales frecuentes en importación
- `pipeline_id`, `owner_id`, `estimated_close_date`, `value`, `source`, `tags`, `description`, `next_step`, `expected_revenue`.

## 2.1 Esquema objetivo (tabla `crm_pipelines`)
### Campos clave
- `company_id` (obligatorio)
- `name` (obligatorio)
- `stages` `text[]` con default:
  - `nuevo`
  - `en_proceso`
  - `ganado`
  - `perdido`

### Implicancias para importación
- Si se crea pipeline en el wizard y no se definen etapas personalizadas, usar el default del schema.
- Si una fila trae `stage` vacía y hay pipeline seleccionada, usar `stages[0]` de esa pipeline.
- Si una fila trae `stage` no incluida en `stages` de la pipeline asignada, marcar error de validación.

## 3) Recomendación profesional sobre pipelines
### ¿Permitir “crear pipeline” durante la importación?
Sí, pero **de forma controlada**. No crear pipelines ad-hoc fila por fila.

### Recomendación concreta
- Modo por defecto: **usar pipeline existente** (más mantenible).
- Opción adicional (wizard): **crear 1 pipeline nuevo antes de importar** con nombre + etapas.
- No permitir creación implícita por cada valor distinto de `pipeline_name` en CSV, porque:
  - genera proliferación de pipelines “sucios”; 
  - complica reportes y automatizaciones;
  - aumenta soporte y limpieza manual.

Conclusión: crear pipeline durante importación **sí es mantenible** solo como paso explícito y único del flujo (no automático por fila).

## 4) UX propuesta (Wizard de 5 pasos)
1. **Subir CSV**
   - Mostrar template descargable.
   - Límite sugerido: 5.000 filas por import (paginable si crece).

2. **Mapeo de columnas**
   - Auto-detectar aliases:
     - `nombre|name` → `name`
     - `mail|email` → `email`
     - `telefono|phone|celular` → `phone`
     - `etapa|stage`, `pipeline|pipeline_name`, etc.
   - Campos obligatorios marcados.

3. **Configuración de pipeline**
   - Opción A: pipeline existente + etapa por defecto.
  - Opción B: crear pipeline nuevo (nombre + etapas opcionales) y usarlo.
   - Opción C: sin pipeline (`pipeline_id = null`) con `stage` por defecto global.

4. **Pre-check (sin insertar)**
   - Validación de formato y negocio por fila.
   - Resumen: válidas, inválidas, warnings.
   - Tabla de errores con fila + columna + motivo.

5. **Confirmación de importación**
   - Acción 1: “Importar solo válidas (omitir inválidas)”.
  - Acción 2: “Corregir en base al reporte de errores mostrado en UI y reintentar”.

## 5) Reglas de validación
## 5.1 Hard errors (bloquean esa fila)
- `name` vacío.
- `email` vacío o formato inválido.
- `phone` vacío.
- `probability` fuera de 0–100.
- `status` fuera de catálogo permitido (`abierta`, `ganada`, `perdida`, ... según catálogo final).
- `pipeline_id` inexistente o de otra empresa.
- `pipeline_name` no encontrado cuando el modo elegido es “usar pipeline por nombre del CSV”.
- `owner_id` inexistente o de otra empresa.
- `estimated_close_date` o `close_date` inválida.
- `stage` no pertenece al arreglo `stages` de la pipeline asignada.

## 5.2 Warnings (importable)
- `value` nulo.
- `source` vacío.
- `tags` vacíos.
- `stage` vacía (se aplicará `stages[0]` de la pipeline seleccionada o `nuevo` como fallback final).

## 5.3 Reglas de consistencia
- Si `status = ganada`: opcionalmente requerir `close_date`.
- Si `status = perdida`: recomendar `lost_reason`.
- Si hay `pipeline_id`, `stage` debe existir en etapas de esa pipeline.
- Si no hay `pipeline_id`, permitir `stage` y usar `nuevo` cuando venga vacía.
- Normalizar `stage` a minúsculas y trim antes de validar (`Nuevo` -> `nuevo`).

## 6) Estrategia anti-duplicados
Definir modo en UI:
- **Insert only** (MVP): siempre crea nuevas.
- **Upsert por clave** (fase 2): por `email+phone+name` o `external_id` si se agrega.

Recomendación MVP: Insert only + reporte de potenciales duplicados detectados por hash (`email_normalized + phone_normalized`).

## 7) Arquitectura técnica recomendada
## 7.1 Frontend
- Nuevo flujo `Import Opportunities CSV` en módulo CRM.
- Parser CSV con `papaparse` (ya usado en productos).
- Validación inicial de tipos/headers en cliente para feedback rápido.

## 7.2 Backend (recomendado)
Crear endpoint/edge function transaccional:
- `crm-opportunities-import-validate`
- `crm-opportunities-import-commit`

### `validate`
- Recibe filas parseadas + configuración pipeline.
- Normaliza datos.
- Resuelve referencias en **bulk** (sin N+1):
  - Traer owners por ids/correos en una query.
  - Traer pipelines/etapas en una query.
  - Construir `Map<pipelineId, Set<stage>>` para validar pertenencia de etapa.
- Retorna:
  - `validRows[]`
  - `invalidRows[]` con errores detallados
  - `summary`

### `commit`
- Recibe `importSessionId` o `validRows` firmadas.
- Inserta en lotes (ej. 500) en `crm_opportunities`.
- Opcional: crea pipeline al inicio si usuario eligió esa opción.
- Devuelve métricas finales y ids creados.

## 7.3 Rendimiento (obligatorio)
Evitar queries dentro de bucles.

Patrón requerido:
1. Extraer todos los `owner_id`, `pipeline_name`, `stage` del CSV.
2. Resolver en consultas bulk.
3. Construir `Map` de lookup.
4. Iterar filas usando mapas en memoria.

## 8) Manejo de errores y experiencia del usuario
- Mostrar reporte de errores en UI dentro del modal de importación (sin descarga obligatoria).
- Cada error con: fila, columna, valor recibido, regla violada.
- Mensaje claro:
  - “Podés importar solo las filas válidas”
  - “o corregir y reintentar para importar todo”.

## 9) Seguridad y multi-tenant
- Validar `company_id` por sesión autenticada (no confiar en CSV).
- Verificar que `pipeline_id` y `owner_id` pertenezcan a la empresa.
- Auditar importación:
  - usuario, fecha, archivo, total filas, válidas, inválidas.

## 10) MVP recomendado (alcance)
1. Upload + mapping básico.
2. Pre-check completo.
3. Importar válidas / cancelar y corregir.
4. Pipeline existente o creación explícita de 1 pipeline nuevo.
5. Insert por lotes + reporte final.

## 12) Defaults operativos recomendados (alineados al schema)
- `stage` default global: `nuevo`.
- Pipeline creado durante import (sin etapas manuales):
  - `['nuevo', 'en_proceso', 'ganado', 'perdido']`.
- Cuando se asigna una pipeline existente, el default de etapa debe ser siempre su primer elemento `stages[0]`.

## 11) Criterios de aceptación
- Si CSV tiene filas inválidas, el usuario ve detalle antes de insertar.
- Usuario puede elegir importar solo válidas.
- Oportunidades creadas respetan campos obligatorios (`name`, `email`, `phone`, `company_id`).
- Si se elige pipeline, las oportunidades quedan correctamente asignadas.
- No hay consultas N+1 durante validación ni commit.
- Se registra auditoría de importación.
