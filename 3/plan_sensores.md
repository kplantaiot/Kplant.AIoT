Entendido. El hecho de que la temperatura y la humedad muestren consistentemente `-99.0` confirma que mi cambio anterior funciona correctamente al detectar un fallo en la lectura del sensor. El problema no es el reporte, sino el fallo persistente del sensor mismo.

He investigado las mejores prácticas para el sensor DHT22 en el ESP8266. Los fallos constantes como este suelen deberse a problemas de hardware (cableado incorrecto, falta de una resistencia "pull-up", o un sensor defectuoso), los cuales no puedo corregir desde el software.

Sin embargo, puedo aplicar una mejora de software basada en las mejores prácticas para asegurar que la inicialización y configuración del código sean lo más robustas posible.

**Mi plan es el siguiente:**

1.  **Reestructurar la Inicialización en `setup()`:** Moveré la inicialización de los sensores (`dht.begin()` y `LoadCell.begin()`) al principio de la función `setup()`. Actualmente se hace más tarde. Esta es una práctica recomendada para dar a los sensores tiempo suficiente para estabilizarse después de encenderse.
2.  **Simplificar la Verificación de Sensores:** Modificaré la función `check_sensors` para que, después del cambio anterior, solo verifique el estado de los sensores en el arranque, sin reiniciarlos. La función `getHealthStatus` seguirá siendo la encargada de las verificaciones continuas en el `loop`.

Estos cambios harán que la configuración del software sea más robusta y siga las recomendaciones estándar. Si después de esto los sensores siguen fallando (mostrando `-99.0`), confirmaría casi con total certeza que la causa es un problema de hardware.

¿Le parece bien este plan? Procederé con los cambios si está de acuerdo.