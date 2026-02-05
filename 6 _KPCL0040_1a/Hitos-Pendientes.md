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
    *   **[x] Añadir Timestamp a KPCL0033/SENSORS:** Incluido un timestamp en el payload JSON de los mensajes publicados en el tópico `KPCL0033/SENSORS` en el formato `MM-dd-aaaa HH:mm:ss` para un mejor seguimiento y análisis de datos.

3.  **Conectividad MQTT:**
    *   Conexión exitosa a un broker MQTT.
    *   Reconexión automática al broker MQTT si la conexión se pierde.
    *   **[x] Indicador LED para Eventos MQTT:** Implementado un parpadeo del LED integrado de la placa como indicador visual: un parpadeo para cada publicación (publish) y dos parpadeos para cada suscripción (subscribe) al broker MQTT.

4.  **Publicación de Datos de Sensores:**
    *   Lectura y publicación periódica de los datos de los sensores (peso, temperatura, humedad, LDR) en el tópico `KPCL0033/SENSORS`.
    *   **[x] Calibración del sensor de peso:** Asegurada la precisión de las lecturas del sensor de peso mediante un proceso de calibración adecuado (implementado vía comando MQTT y persistencia). Se mantiene la impresión del valor Raw HX711 en el monitor serial para futuras calibraciones.

5.  **Publicación de Estado del Dispositivo:**
    *   Envío periódico de un mensaje de estado (status de WiFi, ID del dispositivo, salud de los sensores) al tópico `KPCL0033/STATUS`.
    *   **[x] Gestión de Credenciales WiFi:** Implementado un sistema para configurar las credenciales WiFi de forma dinámica (ej. a través de un portal cautivo o una app) en lugar de tenerlas pre-programadas (implementado vía comandos MQTT ADDWIFI/REMOVEWIFI).

## Tareas Pendientes

1.  [ ] **Estabilizar Estado del Dispositivo:** El estado `KPCL0033` en el tópico `STATUS` alterna entre "Online" y "Offline" incorrectamente. Se debe investigar y corregir la lógica para que refleje el estado real de la conexión de manera consistente.
2.  [ ] **Mejorar la Gestión de Conexión MQTT:** Investigar y solucionar el error de conexión MQTT con código de retorno `rc=-2`.
3.  [ ] **Seguridad en la Conexión MQTT:** Asegurar la comunicación con el broker MQTT utilizando TLS/SSL para proteger los datos en tránsito.
4.  [x] **Configuración Dinámica del Dispositivo:** Permitir que el `DEVICE_ID` (actualmente "KPCL0033") sea configurable, para facilitar la incorporación de nuevos dispositivos (logrado al usar el `DEVICE_ID` como key en el payload de STATUS).
5.  [ ] **Refactorizar el Código:** Organizar el código en módulos más cohesivos y mejorar la legibilidad y mantenibilidad.
6.  [ ] **Desacoplar Lógica del Indicador LED:** Mover el control del indicador LED (actualmente en `mqtt_manager.cpp`) a su propio módulo para reducir el acoplamiento y mejorar la modularidad.
7.  [ ] **Implementar Actualizaciones OTA:** Añadir la capacidad de actualizar el firmware del dispositivo de forma remota (Over-the-Air).
