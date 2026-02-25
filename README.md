# PGAI COINREFRI

Plataforma de Gestión de Activos Informáticos (PGAI) para inventario, mantenimiento, auditoría y reportes de equipos de COINREFRI.

## Características principales

- API REST desacoplada (Express + SQLite) para uso web y futura app móvil.
- Frontend React + Vite, interfaz empresarial responsive con sidebar fijo.
- Control por roles:
  - `admin`: control total, usuarios, configuración y auditoría.
  - `tech`: gestión de equipos, mantenimientos e importaciones técnicas.
  - `read`: consulta de información y reportes.
- Seguridad:
  - Contraseñas con hash bcrypt.
  - JWT con expiración (`8h`).
  - Bloqueo de cuenta por intentos fallidos (`5` intentos / `15` min).
  - Registro de auditoría de acciones.
- Inventario con soporte de importación masiva desde Excel y sincronización por escaneo técnico.
- Dashboard con métricas por estado, tipo y sede.
- Sedes iniciales precargadas: `PAITA`, `LIMA`, `TACNA`.

## Stack

- Backend: Express + better-sqlite3
- Frontend: React 19 + Vite + Tailwind + Recharts
- Seguridad: bcryptjs + jsonwebtoken

## Ejecución local

1. Instalar dependencias
   ```bash
   npm install
   ```
2. Crear archivo `.env.local` (o usar variables de entorno):
   ```bash
   JWT_SECRET=tu_secreto_seguro
   ```
3. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```
4. Abrir:
   - App: `http://localhost:3000`
   - API docs (OpenAPI-lite): `http://localhost:3000/api/docs.json`

## Credenciales iniciales

- Usuario: `admin`
- Clave: `admin123`

> Recomendación: cambiar la contraseña del administrador en el primer uso.
