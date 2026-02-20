# Diagrama de Arquitectura Actual (Kittypau)

> Nota: Este diagrama esta en Mermaid. Puedes exportarlo a PNG/SVG desde cualquier editor Mermaid.

```mermaid
flowchart LR
  ESP[ESP8266 / ESP32-CAM] -->|MQTT TLS| HIVE[HiveMQ Cloud]
  HIVE -->|Subscribe +/SENSORS +/STATUS| BRIDGE[RPi Bridge v2.4]
  BRIDGE -->|service_role INSERT/UPDATE| DB[(Supabase PostgreSQL)]
  DB -->|Realtime| APP[App Web Next.js - Vercel]
  BRIDGE -->|KPBR0001/STATUS| HIVE
```

## Flujo detallado
```mermaid
flowchart TD
  ESP[ESP8266/ESP32-CAM] -->|SENSORS cada 10s| MQTT[HiveMQ Cloud]
  ESP -->|STATUS cada 15s| MQTT
  MQTT -->|wildcard +/SENSORS| BRIDGE[RPi Bridge v2.4]
  MQTT -->|wildcard +/STATUS| BRIDGE
  BRIDGE -->|INSERT| SR[sensor_readings]
  BRIDGE -->|UPDATE| DEV[devices]
  BRIDGE -->|UPSERT| BH[bridge_heartbeats]
  BRIDGE -->|Publish KPBR0001/STATUS cada 60s| MQTT
  SR --> VIEW1[latest_readings VIEW]
  BH --> VIEW2[bridge_status_live VIEW]
  VIEW2 --> VIEW3[admin_dashboard_live VIEW]
  DEV --> APP[Next.js App]
  VIEW1 --> APP
```

## Notas
- Bridge escribe directamente a Supabase (service_role), NO pasa por webhook API.
- Bridge auto-registra dispositivos desconocidos con `device_state: 'factory'`.
- Bridge actualiza `device_state: 'linked'` en cada STATUS recibido.
- Bridge publica telemetria propia como KPBR0001/STATUS cada 60s.
