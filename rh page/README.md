# Control de asistencia móvil

MVP para registrar entradas y salidas desde el teléfono. El servidor es la fuente de hora; además valida que el dispositivo esté dentro de una geocerca configurada para la empresa.

## Arranque

1. Copia `.env.example` a `.env` y reemplaza las coordenadas por las de la empresa.
2. Ejecuta `docker compose up --build`.
3. Abre `http://localhost:5173` e inicia con las credenciales `INITIAL_ADMIN_*` de `.env`.

La API queda documentada en `http://localhost:8000/docs`.

## Prueba con QR fijo

El administrador entra al panel y selecciona **Mostrar QR para imprimir**. Ese QR apunta a la estación `recepcion` y no caduca. Cada colaborador mantiene su sesión en su propio teléfono: al escanearlo, confirma el registro y el servidor determina si es entrada o salida según su último movimiento, además de comprobar la geocerca.

La sesión dura 30 días por defecto (`JWT_EXPIRY_DAYS`). Cada empleado debe usar únicamente su teléfono personal y cerrar sesión si lo presta o lo pierde.

## Despliegue de prueba: Render + Neon

El archivo `render.yaml` y `Dockerfile.render` empaquetan frontend y API en un solo servicio HTTPS. Crea primero una base PostgreSQL en Neon y después, en Render, crea un **Blueprint** desde el repositorio. Render solicitará las variables marcadas como secretas/manuales:

- `DATABASE_URL`: cadena de conexión de Neon.
- `COMPANY_LATITUDE` y `COMPANY_LONGITUDE`: ubicación de la oficina.
- `INITIAL_ADMIN_PASSWORD` y `EMPLOYEE_INITIAL_PASSWORD`: contraseñas iniciales privadas.

Tras el despliegue, Render entrega una URL HTTPS. El navegador puede solicitar ubicación desde esa URL sin certificados locales.

## Alcance actual

- Inicio de sesión con JWT y roles `admin` / `employee`.
- Registro de entrada o salida usando geolocalización del navegador.
- Hora tomada del servidor y validación de radio en metros.
- Historial personal y vista administrativa de registros.

El navegador requiere HTTPS para obtener ubicación fuera de `localhost`. Antes de producción hay que configurar HTTPS, una política de privacidad y un mecanismo de corrección de registros.
