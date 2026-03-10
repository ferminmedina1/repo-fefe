# Guías de desarrollo

## Rendimiento: evitar queries dentro de bucles (N+1)

**Nunca** llamar a un repositorio o hacer queries dentro de un bucle (`for`, `forEach`, `map`, etc.).

**Mal:**
```ts
for (const item of items) {
  const result = await repo.findById(item.id); // query por cada iteración
}
```

**Bien:**
```ts
const ids = items.map(i => i.id);
const results = await repo.findByIds(ids); // una sola query
const resultMap = new Map(results.map(r => [r.id, r]));

for (const item of items) {
  const result = resultMap.get(item.id);
}
```

Siempre traer todos los registros necesarios en una sola query y agruparlos en un `Map<Id, Resultado>` antes de iterar.
