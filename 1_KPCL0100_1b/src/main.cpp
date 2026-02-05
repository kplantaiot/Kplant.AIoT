#include <Arduino.h>

void setup() {
  // Configura el monitor serial
  Serial.begin(115200);
  
  // Espera 2 segundos para dar tiempo a que se conecte el monitor serial
  delay(2000); 
  
  // Imprime un mensaje de inicio
  Serial.println("--- PRUEBA MINIMA COMENZADA ---");
}

void loop() {
  // Imprime un mensaje cada segundo
  Serial.println("Hola desde la ESP32-CAM!");
  delay(1000);
}