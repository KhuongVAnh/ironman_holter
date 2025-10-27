// #include <WiFi.h>
// #include <HTTPClient.h>
// #include <Arduino.h>

// const char *ssid = "Android Xr của Vank"; // WiFi SSID
// const char *password = "vanhvinh";        // WiFi password
// const char *serverUrl = "http://172.20.10.2:4000/api/readings/telemetry";

// const int ecgPin = 34;     // OUT pin of AD8232 -> GPIO34 (ADC input)
// const int loMinusPin = 14; // LO- pin of AD8232
// const int loPlusPin = 27;  // LO+ pin of AD8232
// const int sdnPin = 25;

// const int SAMPLE_RATE = 250;                    // Hz
// const int DURATION = 2;                         // seconds mỗi batch
// const int NUM_SAMPLES = SAMPLE_RATE * DURATION; // 500 mẫu
// const int BUFFER_SIZE = NUM_SAMPLES * 2;        // giữ 4s dữ liệu

// float ecgData[BUFFER_SIZE]; // buffer rolling
// int indexSample = 0;

// void setup()
// {
//   Serial.begin(9600);
//   analogReadResolution(12); // ESP32 ADC 12-bit (0-4095)

//   pinMode(loMinusPin, INPUT);
//   pinMode(loPlusPin, INPUT);
//   pinMode(ecgPin, INPUT);

//   pinMode(sdnPin, OUTPUT);
//   digitalWrite(sdnPin, LOW); // LOW = bật module, HIGH = shutdown

//   Serial.println("ECG Monitor Started...");

//   // init buffer
//   for (int i = 0; i < BUFFER_SIZE; i++)
//   {
//     ecgData[i] = 0;
//   }

//   // WiFi connect
//   WiFi.begin(ssid, password);
//   Serial.print("Đang kết nối WiFi");
//   while (WiFi.status() != WL_CONNECTED)
//   {
//     delay(500);
//     Serial.print(".");
//   }
//   Serial.println("\nWiFi connected!");
// }

// void loop()
// {
//   if (indexSample < NUM_SAMPLES)
//   {
//     // đọc ADC
//     int ecgValue = analogRead(ecgPin);
//     float V = ((float)ecgValue / 4095.0) * 3.3;
//     float mV = (V - 1.65); // dịch offset về 0, đổi sang mV

//     // check lead-off
//     int loMinus = digitalRead(loMinusPin);
//     int loPlus = digitalRead(loPlusPin);

//     if (loMinus == 1 || loPlus == 1)
//     {
//       Serial.println("Lead off detected!");
//     }
//     else
//     {
//       // lưu vào nửa sau của buffer
//       ecgData[indexSample + NUM_SAMPLES] = mV;
//       indexSample++;
//     }

//     delay(1000 / SAMPLE_RATE); // delay để đạt ~250Hz (≈4ms)
//   }
//   else
//   {
//     // đủ 2s thì in và gửi
//     Serial.println("=== ECG Data (4s rolling) ===");
//     String result = "";

//     for (int i = 0; i < BUFFER_SIZE; i++)
//     {
//       result += String(ecgData[i], 3);
//       if (i < BUFFER_SIZE - 1)
//         result += ",";
//     }
//     // Serial.println(result);

//     // reset chỉ số để ghi tiếp batch 2s tiếp theo
//     indexSample = 0;

//     // dịch buffer: giữ lại 2s cuối cùng
//     for (int i = 0; i < NUM_SAMPLES; i++)
//     {
//       ecgData[i] = ecgData[i + NUM_SAMPLES];
//       ecgData[i + NUM_SAMPLES] = 0;
//     }

//     // gửi lên server
//     if (WiFi.status() == WL_CONNECTED)
//     {
//       HTTPClient http;
//       http.begin(serverUrl);
//       http.addHeader("Content-Type", "application/json");

//       // Fake heart rate
//       int hr = random(60, 120);

//       String ecg = "[" + result + "]";
//       String json = "{\"device_id\":\"device_1\",\"heart_rate\":" + String(hr) +
//                     ",\"ecg_signal\":" + ecg + "}";

//       int httpCode = http.POST(json);
//       if (httpCode > 0)
//       {
//         Serial.print("Response code: ");
//         Serial.println(httpCode);
//         String payload = http.getString();
//         Serial.println("Server response: " + payload);
//       }
//       else
//       {
//         Serial.print("Error sending POST: ");
//         Serial.println(httpCode);
//       }
//       http.end();
//     }
//   }
// }

// // const int ecgPin = 34;     // OUT pin of AD8232 -> GPIO34 (ADC input)
// // const int loMinusPin = 14; // LO- pin of AD8232 (optional)
// // const int loPlusPin = 27;  // LO+ pin of AD8232 (optional)
// // const int sdnPin = 25;
// // const int SAMPLE_RATE = 250;                    // Hz
// // const int DURATION = 5;                         // seconds
// // const int NUM_SAMPLES = SAMPLE_RATE * DURATION; // 1250 mẫu
// // float ecgData[NUM_SAMPLES];                     // Mảng chứa dữ liệu
// // int indexSample = 0;

// // void setup()
// // {
// //   Serial.begin(9600);
// //   analogReadResolution(12); // ESP32 ADC 12-bit (0-4095)
// //   pinMode(loMinusPin, INPUT);
// //   pinMode(loPlusPin, INPUT);
// //   pinMode(ecgPin, INPUT);
// //   pinMode(sdnPin, OUTPUT);
// //   digitalWrite(sdnPin, LOW); // LOW = bật module, HIGH = shutdown
// //   Serial.println("ECG Monitor Started...");
// // }

// // void loop()
// // {
// //   if (indexSample < NUM_SAMPLES)
// //   {
// //     // Đọc giá trị ADC
// //     int ecgValue = analogRead(ecgPin);
// //     float V = ((float)ecgValue / 4095) * 3.3;
// //     // Kiểm tra điện cực có bị tuột không
// //     int loMinus = digitalRead(loMinusPin);
// //     int loPlus = digitalRead(loPlusPin);

// //     if (loMinus == 1 || loPlus == 1)
// //     {
// //       Serial.println("Lead off detected!");
// //     }
// //     else
// //     {
// //       //     // Lưu vào mảng
// //       //     ecgData[indexSample] = V;
// //       //     indexSample++;

// //       //   }
// //       //   // Delay để đạt ~250 Hz (1000/250 = 4 ms)
// //       //   delay(4);
// //       // }
// //       // else
// //       // {
// //       //   // In dữ liệu ra Serial khi đủ 5 giây
// //       //   Serial.println("=== ECG Data (5s) ===");
// //       //   String result = "";
// //       //   for (int i = 0; i < NUM_SAMPLES; i++)
// //       //   {
// //       //     result += String(ecgData[i], 3);
// //       //     if (i < NUM_SAMPLES - 1)
// //       //     { // chỉ thêm dấu phẩy nếu chưa phải phần tử cuối
// //       //       result += ",";
// //       //     }
// //       //   }
// //       //   indexSample = 0;
// //       //   Serial.println(result);
// //       Serial.println(V);
// //       delay(500);
// //     }
// //   }
// // }