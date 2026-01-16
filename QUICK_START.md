# Guía Rápida de Migración

## Comando Principal

```bash
node programatic-migration/migrate-state-hybrid.js {state-slug} {state-number}
```

**Ejemplo:**
```bash
node programatic-migration/migrate-state-hybrid.js maine 20
```

## Qué Hace

1. ✅ Conecta a MongoDB y obtiene documentos del estado
2. ✅ Descarga HTML de producción (`https://bizee.com/{state}-llc`)
3. ✅ Enriquece contenido comparando MongoDB vs HTML
4. ✅ Transforma hero y blocks a formato Statamic
5. ✅ Genera 6 archivos (1 principal + 5 hijas)
6. ✅ Actualiza árbol preservando formato original

## Archivos Generados

- `{state}.md` - Página principal
- `business-names.{state}.md`
- `registered-agent.{state}.md`
- `filing-fees-requirements.{state}.md`
- `business-taxes.{state}.md`
- `faqs.{state}.md`

## Verificación Rápida

```bash
# Ver archivos generados
ls -la content/collections/guides/{state}*.md
ls -la content/collections/guides/*.{state}.md

# Ver cambios en árbol
git diff content/trees/collections/guides.yaml
```

## Puntos Clave

- ✅ Usa **nombres de estado** (maine) no números (20) para archivos
- ✅ **Preserva formato** del árbol YAML (guiones, indentación)
- ✅ **Estructura padre-hijo** correcta (páginas hijas bajo principal)
- ✅ **Enriquecimiento HTML** para contenido completo
- ✅ **Videos Wistia** transformados correctamente
- ✅ **IDs existentes** se reutilizan si archivos ya existen

## Documentación Completa

Ver [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) para detalles completos.
