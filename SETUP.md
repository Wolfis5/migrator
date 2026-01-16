# Setup y Ejecución desde bizee.com

## Requisitos Previos

1. Node.js instalado
2. Acceso a MongoDB
3. Proyecto bizee.com configurado

## Pasos de Configuración

### 1. Instalar Dependencias en bizee.com

```bash
cd /Users/victor/Documents/Projects/bizee.com
npm install mongodb js-yaml uuid
```

### 2. Crear archivo `.env`

Crear un archivo `.env` en el directorio `programatic-migration`:

```bash
cd /Users/victor/Documents/Projects/programatic-migration
touch .env
```

Editar el archivo `.env` y agregar:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_DATABASE=test
MONGODB_COLLECTION=pages
```

**Importante:** Reemplazar con tus credenciales reales de MongoDB.

### 3. Verificar Estructura de Directorios

Asegúrate de que existan estos directorios en `bizee.com`:

```
bizee.com/
├── content/
│   ├── collections/
│   │   └── guides/          # Aquí se crearán los archivos .md
│   └── trees/
│       └── collections/
│           └── guides.yaml  # Se actualizará este archivo
```

## Ejecutar Migración

### Desde el directorio bizee.com:

```bash
cd /Users/victor/Documents/Projects/bizee.com
node ../programatic-migration/migrate-state-hybrid.js {state-slug} {state-number}
```

### Ejemplo:

```bash
cd /Users/victor/Documents/Projects/bizee.com
node ../programatic-migration/migrate-state-hybrid.js maine 20
```

### Parámetros:

- `{state-slug}`: Slug del estado en minúsculas con guiones (ej: `maine`, `new-york`, `california`)
- `{state-number}`: Número asignado al estado (se mantiene por compatibilidad)

## Verificar Resultados

Después de ejecutar, verifica los archivos generados:

```bash
# Ver archivos generados
ls -la content/collections/guides/{state}*.md
ls -la content/collections/guides/*.{state}.md

# Ver cambios en el árbol
git diff content/trees/collections/guides.yaml
```

## Solución de Problemas

### Error: Cannot find module 'mongodb'

**Solución:** Instalar dependencias en bizee.com:
```bash
cd /Users/victor/Documents/Projects/bizee.com
npm install mongodb js-yaml uuid
```

### Error: Cannot find .env file

**Solución:** Crear el archivo `.env` en `programatic-migration/` con tu MongoDB URI.

### Error: Cannot find content/collections/guides

**Solución:** Asegúrate de ejecutar el script desde el directorio `bizee.com`:
```bash
cd /Users/victor/Documents/Projects/bizee.com
node ../programatic-migration/migrate-state-hybrid.js maine 20
```

### Error de conexión a MongoDB

**Solución:**
- Verifica tu `MONGODB_URI` en el archivo `.env`
- Asegúrate de que tu IP esté whitelisted en MongoDB Atlas (si usas Atlas)
- Verifica tus credenciales de MongoDB

## Archivos Generados

El script crea 6 archivos por estado:

1. `{state}.md` - Página principal (ej: `maine.md`)
2. `business-names.{state}.md` - Business names
3. `registered-agent.{state}.md` - Registered agent
4. `filing-fees-requirements.{state}.md` - Filing fees
5. `business-taxes.{state}.md` - Business taxes
6. `faqs.{state}.md` - FAQs

Todos los archivos se crean en: `bizee.com/content/collections/guides/`
