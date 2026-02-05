// mqtt_manager.h
#pragma once
#include <Arduino.h>

void mqttManagerInit();
void mqttManagerLoop();
void mqttManagerPublishStatus(const char* status);
void mqttManagerPublishSensorData(const char* payload);
bool isMqttConnected();
void blinkLED(int blinks); // Blocking blink for MQTT events

// Non-blocking LED control for WiFi status
extern bool wifiBlinkEnable;
extern unsigned long wifiLastBlinkMillis;
extern bool wifiLedState;

void startWifiBlink();
void stopWifiBlink();
void handleWifiBlink();
