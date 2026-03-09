#pragma once

#include <Arduino.h>

void mqttClientInit();
void mqttClientLoop();
bool isMqttConnected();
bool mqttPublishSensors(const String& payload);
bool mqttPublishStatus(const String& payload);
