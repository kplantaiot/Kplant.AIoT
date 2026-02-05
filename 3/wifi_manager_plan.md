Entendido. Su petición es mucho más clara ahora y requiere un cambio importante en la lógica del Wi-Fi. Usted no quiere solo reemplazar una red, sino tener una **lista de redes conocidas** a las que el dispositivo pueda intentar conectarse si pierde la conexión.

Esto es lo que propongo para lograrlo:

1.  **Almacenar una Lista de Redes:**
    *   En lugar de guardar una sola red, crearé un archivo en la memoria (`known_networks.json`) que contendrá una lista de todas las redes Wi-Fi que usted ha registrado.
    *   La red "Jeivos" estará en esta lista por defecto.

2.  **Actualizar la Lista (Comando MQTT):**
    *   Cuando usted envíe nuevas credenciales por MQTT, en lugar de sobrescribir, el código **agregará la nueva red a la lista** (o actualizará la contraseña si la red ya existe).
    *   Ya no se reiniciará el dispositivo. Simplemente se desconectará del Wi-Fi actual para forzar una reconexión inmediata.

3.  **Lógica de Reconexión Inteligente:**
    *   Si el dispositivo pierde la conexión Wi-Fi, primero intentará reconectarse a la **última red que funcionó**.
    *   Si eso falla, recorrerá **toda la lista de redes guardadas**, una por una, hasta que encuentre una que esté disponible y se pueda conectar.

Este sistema es mucho más robusto y se ajusta a lo que describe: el dispositivo siempre intentará encontrar una red conocida para estar en línea.

Debido a que es un cambio estructural grande, necesito su confirmación antes de empezar a implementarlo. ¿Está de acuerdo con este plan?