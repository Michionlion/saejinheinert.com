"use strict";

import { getAircraft } from "./scenario.js";
import { getCloudCoverageAt } from "./weather.js";
import { mapToPercent } from "./util.js";

const SPEED_ELEMENT_ID = "speed";
const ICED_ELEMENT_ID = "iced";
const ALTITUDE_ELEMENT_ID = "altitude";

let lastVelocity;
export function setVelocity(time) {
  let div = window.document.getElementById(SPEED_ELEMENT_ID);
  let positionDelta = getAircraft().velocity.getValue(time);
  let velocity = Cesium.Cartesian3.magnitude(positionDelta).toFixed(2);
  if (lastVelocity == velocity) return;
  lastVelocity = velocity;

  div.innerHTML = `${velocity} m/s`;
}

let lastIced;
export function setIced(time) {
  let div = window.document.getElementById(ICED_ELEMENT_ID);

  let iced = calculateIcing(time).toFixed(0);

  if (lastIced == iced) return;
  lastIced = iced;

  div.classList.toggle("warn", iced > 30);
  div.classList.toggle("bad", iced > 50);
  div.innerHTML = `${iced}% iced`;
}

let lastAltitude;
export function setAltitude(time) {
  let div = window.document.getElementById(ALTITUDE_ELEMENT_ID);
  let position = getAircraft().position.getValue(time);
  let height = Cesium.Cartographic.fromCartesian(position).height.toFixed(0);

  if (lastAltitude == height) return;

  div.innerHTML = `${height} meters`;
}

export function calculateIcing(time) {
  let position = getAircraft().position.getValue(time);
  let height = Cesium.Cartographic.fromCartesian(position).height;
  let cloud = getCloudCoverageAt(position) ?? 0;
  // console.log(cloud);

  let iced = mapToPercent(height * cloud * 1.15, [1800, 2450]);

  return iced;
}

export function update(time) {
  setIced(time);
  setVelocity(time);
  setAltitude(time);
}
