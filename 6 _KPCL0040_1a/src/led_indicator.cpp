// led_indicator.cpp
// LED indicator for ESP32-CAM (using GPIO 33 - red LED)

#include "led_indicator.h"
#include "config.h"
#include <Arduino.h>

// ESP32-CAM red LED on GPIO 33 (active LOW)
const int ledPin = PIN_LED;

// Variables para parpadeo no bloqueante
static bool blinkEnable = false;
static unsigned long lastBlinkMillis = 0;
static bool ledState = HIGH; // HIGH = LED apagado (active LOW)

void ledIndicatorInit() {
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, HIGH); // Apagar LED inicialmente
    Serial.println("LED indicator inicializado (GPIO 33)");
}

// Parpadeo bloqueante para eventos especificos
void blinkLED(int times, int duration) {
    bool wasBlinking = blinkEnable;
    if (wasBlinking) {
        stopWifiBlink();
    }

    for (int i = 0; i < times; i++) {
        digitalWrite(ledPin, LOW);  // Encender (active LOW)
        delay(duration);
        digitalWrite(ledPin, HIGH); // Apagar
        if (i < times - 1) {
            delay(duration);
        }
    }

    if (wasBlinking) {
        startWifiBlink();
    }
}

void startWifiBlink() {
    blinkEnable = true;
    lastBlinkMillis = millis();
    ledState = HIGH;
    digitalWrite(ledPin, ledState);
}

void stopWifiBlink() {
    blinkEnable = false;
    digitalWrite(ledPin, HIGH); // Asegurar LED apagado
}

void handleLedIndicator() {
    if (!blinkEnable) return;

    if (millis() - lastBlinkMillis >= 250) {
        lastBlinkMillis = millis();
        ledState = !ledState;
        digitalWrite(ledPin, ledState);
    }
}
