# ESP32-CAM OTA - Diagnostico y Progreso

**Fecha:** 2026-02-09
**Dispositivo:** KPCL0040 (ESP32-CAM AI-Thinker)
**IP:** 192.168.1.88 (red Casa 15)
**Firmware:** v1.0.0 con ArduinoOTA + Camera Streaming

---

## Estado actual

El firmware fue subido exitosamente por USB (COM11) y funciona correctamente:
- WiFi: OK (Casa 15, 192.168.1.88)
- MQTT: OK (Kittypau1 @ HiveMQ Cloud, publicando SENSORS y STATUS)
- Timezone: OK (Chile CLT/CLST)
- Camara: OK (Stream en http://192.168.1.88:81/stream, UI en :80)
- Sensores: ERR_HX711 + ERR_DHT (hardware no conectado)
- ArduinoOTA: Habilitado pero con problemas de transferencia

---

## Problema OTA identificado

### Sintomas
- `pio run -e ota -t upload` falla con "Error Uploading" tras ~10 segundos
- El dispositivo responde "OK" al paquete UDP de invitacion OTA (verificado con script Python)
- La conexion TCP de vuelta al PC se establece correctamente (verificado)
- La transferencia de datos comienza (~5 chunks de 1024 bytes) pero se interrumpe

### Causa raiz
Durante la transferencia OTA, el `loop()` principal del ESP32-CAM ejecuta simultaneamente:
1. `ArduinoOTA.handle()` - necesita CPU constante durante la transferencia
2. `mqttManagerLoop()` - TLS a HiveMQ consume CPU significativa
3. `sensorsReadAndPublish()` - HX711 tiene timeouts bloqueantes (~3s)
4. Camera tasks en Core 0 (WebServer en puertos 80/81)

El handler OTA no recibe suficiente tiempo de CPU para procesar los chunks del firmware, causando que el `connection.recv(10)` de espota.py (que espera "OK" del ESP32 tras cada chunk) falle por timeout.

### Pruebas realizadas

| Test | Resultado |
|------|-----------|
| Ping 192.168.1.88 | OK (187ms) |
| TCP puerto 80 (Camera UI) | OK |
| TCP puerto 81 (Camera Stream) | OK |
| TCP puerto 3232 (OTA) | CERRADO (OTA usa UDP, no TCP) |
| UDP puerto 3232 (OTA invitation) | OK - responde "OK" |
| TCP conexion de vuelta (ESP32 -> PC) | OK (script Python custom) |
| espota.py con host_ip explicito | FALLA tras ~5 chunks |
| espota.py con firewall desactivado | FALLA (mismo comportamiento) |
| Firewall de Windows | Regla "ESP32 OTA" agregada para 192.168.1.88 |

### Solucion implementada (pendiente de subir)

Archivo modificado: `firmware-esp32cam/src/main.cpp`

Se agrego un flag `otaInProgress` que pausa MQTT y sensores durante la transferencia OTA:

```cpp
static volatile bool otaInProgress = false;

// En setup():
ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Iniciando... (pausando MQTT y sensores)");
    otaInProgress = true;
});
ArduinoOTA.onEnd([]() {
    Serial.println("[OTA] Completo.");
    otaInProgress = false;
});

// En loop():
ArduinoOTA.handle();
if (otaInProgress) return;  // Solo OTA durante actualizacion
// ... resto del loop (WiFi, MQTT, sensores)
```

**Estado:** Compilado exitosamente (Flash 36.4%), pero no se pudo subir porque:
1. COM11 (FTDI) requiere modo flash (IO0 a GND + RST)
2. El ESP32-CAM no entro en modo flash durante las pruebas

---

## Pasos pendientes para completar

1. **Subir firmware con fix OTA por USB:**
   - Conectar IO0 a GND con jumper
   - Resetear el ESP32-CAM
   - Ejecutar: `pio run -e esp32cam -t upload --upload-port COM11`
   - Desconectar jumper IO0-GND
   - Resetear para bootear normalmente

2. **Probar OTA con el fix:**
   - Esperar a que el dispositivo conecte a WiFi (~10s)
   - Ejecutar: `pio run -e ota -t upload`
   - Deberia funcionar porque MQTT y sensores se pausan durante la transferencia

3. **Reactivar firewall de Windows:**
   - Ejecutar como Admin: `netsh advfirewall set publicprofile state on`
   - La regla "ESP32 OTA" queda activa para futuras subidas

---

## Configuracion actual del dispositivo

```
DEVICE_ID:    KPCL0040
DEVICE_TYPE:  ESP32-CAM(AI-Thinker)
MQTT_USER:    Kittypau1
MQTT_BROKER:  cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT:    8883
OTA_IP:       192.168.1.88
WiFi:         Casa 15
Timezone:     Chile (CLT/CLST)
```

## Notas adicionales

- La primera carga exitosa por USB se hizo en esta misma sesion sin problemas (COM11, sin modo flash) - posiblemente el FTDI estaba en un estado diferente
- El fix de `otaInProgress` tambien deberia aplicarse al firmware ESP8266 en `firmware-esp8266/src/main.cpp` por consistencia
- Considerar agregar `ArduinoOTA.onError` para resetear el flag en caso de error
