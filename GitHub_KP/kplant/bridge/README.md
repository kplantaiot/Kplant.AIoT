# Kplant Bridge (MQTT -> Supabase)

## Requisitos
- Node.js 18+

## Configuracion
1. Copia `.env.example` a `.env`.
2. Completa `SUPABASE_SERVICE_ROLE_KEY` con tu key real.

## Instalar
```bash
npm install
```

## Ejecutar
```bash
npm start
```

El bridge escucha:
- `+/SENSORS`
- `+/STATUS`

Y procesa solo dispositivos con prefijo `KPPL` (configurable en `DEVICE_PREFIX`).

## Deploy en Raspberry Pi (systemd)
Usa la guia:
- `DEPLOY_RPI.md`

Archivo de servicio listo:
- `systemd/kplant-bridge.service`
