import * as Scenario from "./js/scenario.js";

import * as Weather from "./js/weather.js";

import * as Impacts from "./js/impact.js";

Scenario.initialize(Impacts.update, Weather.updateWeatherEffects);

Weather.initialize();

window.scenario = Scenario;
window.weather = Weather;
window.setRaining = Weather.setRaining;
window.setIcing = Weather.setIcing;

window.offset = (lat, lon) => {
  Weather.NOISE_OFFSET.lat = lat;
  Weather.NOISE_OFFSET.lon = lon;
  Weather.initialize();
};

console.log(
  "Initialized ",
  Scenario.TOTAL_TIME,
  "second scenario between ",
  Scenario.START_TIME,
  Scenario.STOP_TIME
);

console.log("Jumping to 1:40 minutes in!");
Scenario.getCesiumViewer().clock.currentTime = Cesium.JulianDate.fromDate(
  new Date(2020, 4, 11, 12, 1, 40, 0)
);
