// mqtt_manager.h
#pragma once
#include <Arduino.h>

void mqttManagerInit();
void mqttManagerLoop();
void mqttManagerPublishStatus(const char* status);
void mqttManagerPublishSensorData(const char* payload);
bool isMqttConnected();
