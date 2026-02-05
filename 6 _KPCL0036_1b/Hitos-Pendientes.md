# Listado de Pendientes - Proyecto KittyPaw

Este documento sirve como una guía para el desarrollo del proyecto, documentando los hitos alcanzados y las tareas pendientes.

## Hitos Alcanzados

1.  **Conectividad WiFi:**
    *   Conexión exitosa a redes WiFi conocidas.
    *   Gestión de múltiples credenciales de red.
    *   Reconexión automática en caso de pérdida de señal.
    *   **[x] Indicador LED para Conexión/Reconexión WiFi:** Implementado un parpadeo de 3 veces del LED integrado de la placa mientras el dispositivo está buscando o reconectando a una red WiFi.

2.  **Sincronización de Tiempo:**
    *   Sincronización de la hora del dispositivo a través de un servidor NTP para mantener la precisión temporal.
    *   **[x] Añadir Timestamp a KPCL0037/SENSORS:** Incluido un timestamp en el payload JSON de los mensajes publicados en el tópico `KPCL0037/SENSORS` en el formato `MM-dd-aaaa HH:mm:ss` para un mejor seguimiento y análisis de datos.

3.  **Conectividad MQTT:**
    *   Conexión exitosa a un broker MQTT.
    *   Reconexión automática al broker MQTT si la conexión se pierde.
    *   **[x] Indicador LED para Eventos MQTT:** Implementado un parpadeo del LED integrado de la placa como indicador visual: un parpadeo para cada publicación (publish) y dos parpadeos para cada suscripción (subscribe) al broker MQTT.

4.  **Publicación de Datos de Sensores:**
    *   Lectura y publicación periódica de los datos de los sensores (peso, temperatura, humedad, LDR) en el tópico `KPCL0037/SENSORS`.
    *   **[x] Calibración del sensor de peso:** Asegurada la precisión de las lecturas del sensor de peso mediante un proceso de calibración adecuado (implementado vía comando MQTT y persistencia). Se mantiene la impresión del valor Raw HX711 en el monitor serial para futuras calibraciones.

5.  **Publicación de Estado del Dispositivo:**
    *   Envío periódico de un mensaje de estado (status de WiFi, ID del dispositivo, salud de los sensores) al tópico `KPCL0037/STATUS`.
    *   **[x] Gestión de Credenciales WiFi:** Implementado un sistema para configurar las credenciales WiFi de forma dinámica (ej. a través de un portal cautivo o una app) en lugar de tenerlas pre-programadas (implementado vía comandos MQTT ADDWIFI/REMOVEWIFI).

## Tareas Pendientes

1.  [x] **Estabilizar Estado del Dispositivo:** Reemplazada la lógica frágil (`published_samples_count > 3`) por un sistema con debounce: Online inmediato tras primera publicación exitosa, Offline solo después de 15s sostenidos sin conexión (grace period). Elimina la alternancia incorrecta.
2.  [x] **Mejorar la Gestión de Conexión MQTT:** Implementado backoff exponencial (5s → 10s → 20s → 40s → max 60s) y verificación de heap libre (>20KB) antes de intentar TLS. Previene el error `rc=-2` por falta de memoria.
3.  [x] **Seguridad en la Conexión MQTT:** Ya implementado con TLS/SSL usando certificado ISRG Root X1 (Let's Encrypt) para HiveMQ Cloud en puerto 8883.
4.  [x] **Configuración Dinámica del Dispositivo:** Permitir que el `DEVICE_ID` (actualmente "KPCL0037") sea configurable, para facilitar la incorporación de nuevos dispositivos (logrado al usar el `DEVICE_ID` como key en el payload de STATUS).
5.  [x] **Refactorizar el Código:** Código organizado en módulos desacoplados (wifi_manager, mqtt_manager, sensors, led_indicator). LED desacoplado de MQTT via callback de eventos.
6.  [x] **Desacoplar Lógica del Indicador LED:** Eliminado `#include "led_indicator.h"` de `mqtt_manager.cpp`. Implementado sistema de eventos (`MqttEvent` + callback) donde `main.cpp` registra el handler que controla el LED.
7.  [x] **Implementar Actualizaciones OTA:** Añadido ArduinoOTA con hostname configurable (`DEVICE_ID`). Permite actualizar firmware vía WiFi desde PlatformIO o Arduino IDE.
8.  [x] **Mejorar la estabilidad del peso en modo batería:** Implementado filtro deadband (`WEIGHT_DEADBAND = 2g`): cambios menores al umbral son ignorados, previniendo el drift continuo. Aumentadas las muestras de 3 a 5 para mayor estabilidad.
9.  [ ] **Desplegar Bridge en Raspberry Pi:** Configurar una Raspberry Pi (Zero 2 W o Pi 4) para ejecutar el `bridge.js` de forma permanente (24/7). Un solo bridge con wildcard maneja todos los dispositivos. Incluye: instalar Node.js, configurar `.env`, habilitar como servicio con systemd, y asegurar reconexión automática.
