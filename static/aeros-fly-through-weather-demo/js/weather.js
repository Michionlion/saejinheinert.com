"use strict";

import { noise3 } from "./noise.js";
import { getCesiumViewer } from "./scenario.js";
import { calculateIcing } from "./impact.js";
import { mapToRange } from "./util.js";

let radians = Cesium.Math.toRadians;
let degrees = Cesium.Math.toDegrees;

let cloudPrimitives = null;

export const RAIN_LOCATION = Cesium.Cartesian3.fromDegrees(
  -77.402,
  40.249,
  2000
);

export function initialize() {
  console.log(`initalizing weather shader`);
  enableWeatherShader();

  console.log(`Initalizing weather model`);
  let viewer = getCesiumViewer();
  let geos = new Array();

  for (let cloudData of getCloudCoverage()) {
    let geo = getCloudBox(cloudData);
    if (geo) geos.push(geo);
  }

  if (cloudPrimitives != null) {
    viewer.scene.primitives.remove(cloudPrimitives);
  }
  cloudPrimitives = new Cesium.Primitive({
    geometryInstances: geos,
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: true,
      closed: true,
      flat: true,
    }),
  });
  viewer.scene.primitives.add(cloudPrimitives);
}

/////////////////////////////////
///      WEATHER EFFECTS      ///
/////////////////////////////////

let weatherShader = null;

let postProcessingStage = null;

const fragmentShaderURI = "assets/shader/weather.frag";

function enableWeatherShader() {
  if (weatherShader === undefined) return;
  if (weatherShader === null) {
    fetch(fragmentShaderURI)
      .then((response) => response.text())
      .then((text) => {
        if (!text) {
          return Promise.reject("loaded shader is empty");
        }
        weatherShader = text;
        // console.log(fragmentShader);
        enableWeatherShader();
      })
      .catch((reason) => {
        console.log(`Failed to fetch ${fragmentShaderURI}: ${reason}`);
        // TODO: should we do this?
        weatherShader = undefined;
      });
    return;
  }
  let viewer = getCesiumViewer();
  if (postProcessingStage === null) {
    postProcessingStage = new Cesium.PostProcessStage({
      name: "screen_weather",
      fragmentShader: weatherShader,
      uniforms: {
        elapsedTime: () =>
          Cesium.JulianDate.secondsDifference(
            viewer.clock.currentTime,
            viewer.clock.startTime
          ),
        raining: () => window.raining ?? 0.0,
        icing: () => window.icing ?? 0.0,
        iceNormal: () => window.iceNormal ?? 1.0,
        iceMaterial: "assets/img/ice.png",
        iceColor: () =>
          window.iceColor ?? new Cesium.Color(0.87, 0.9, 0.97, 1.0),
        rainTintColor: () =>
          window.tintColor ?? new Cesium.Color(0.1, 0.3, 0.9, 1.0),
        rainTintLimit: () => window.tintLimit ?? 0.175,
        rainBlurLimit: () => window.blurLimit ?? 1.0,
        rainBrightness: () => window.brightness ?? 0.75,
      },
    });
    viewer.scene.postProcessStages.add(postProcessingStage);
  }
}

let lastRaining = null;
export function setRaining(raining) {
  if (lastRaining === raining || !postProcessingStage) return;
  lastRaining = raining;
  let rainPercent = raining;
  if (raining === true) {
    rainPercent = 1.0;
  } else if (raining === false || raining <= 0.0) {
    rainPercent = 0.0;
  }

  postProcessingStage.uniforms.raining = rainPercent;
}

let lastIcing = null;
export function setIcing(icing) {
  if (lastIcing === icing || !postProcessingStage) return;
  lastIcing = icing;
  let icePercent = icing;
  if (icing === true) {
    icePercent = 1.0;
  } else if (icing === false || icing <= 0.0) {
    icePercent = 0.0;
  }

  postProcessingStage.uniforms.icing = icePercent;
}

export function updateWeatherEffects(time) {
  if (!postProcessingStage) return;
  let viewer = getCesiumViewer();
  let position = viewer.camera.positionCartographic;
  let cloudCoverage = getCloudCoverageAt(position);
  if (cloudCoverage == null) {
    setRaining(false);
  } else {
    let raining = mapToRange(cloudCoverage, [0.5, 1], [0, 1]);
    // console.log(
    //   `Cloud Coverage: ${(cloudCoverage * 100).toFixed(0)}%; raining=${raining}`
    // );
    setRaining(raining);
  }

  let icing = calculateIcing(time) / 100.0;
  setIcing(icing);
}

/////////////////////////////////
/// NOISE AND CLOUD FUNCTIONS ///
/////////////////////////////////

// noise scale
const NOISE_SCALE = 0.25;
// noise offset
export const NOISE_OFFSET = {
  lat: 10.5,
  lon: 11.5,
};
// resolution in degrees
const CLOUD_COVERAGE_RESOLUTION = 0.05;
// layer height in meters
const CLOUD_COVERAGE_LAYER_HEIGHT = 500;
// base layer height in meters
const CLOUD_COVERAGE_BASE_HEIGHT = 1800;
// half grid size
const CLOUD_COVERAGE_HALF_GRID_SIZE = 12;
// number of layers
const CLOUD_COVERAGE_LAYERS = 5;
// data center
export const CLOUD_COVERAGE_ORIGIN = Cesium.Cartographic.fromDegrees(
  -77.402,
  40.249,
  CLOUD_COVERAGE_BASE_HEIGHT
);
// actual data array
const CLOUD_COVERAGE = calculateCloudCoverage();

/**
 * @param {Cesium.Cartographic|Cesium.Cartesian3} position
 */
export function getCloudCoverageAt(position, rounded = false) {
  let cartographic;
  if (position instanceof Cesium.Cartographic) {
    cartographic = position;
  } else if (position instanceof Cesium.Cartesian3) {
    cartographic = Cesium.Cartographic.fromCartesian(position);
  } else {
    return undefined;
  }

  let rounder = (num) => num;
  if (rounded) rounder = Math.round;

  let alt = rounder(
    (cartographic.height - CLOUD_COVERAGE_BASE_HEIGHT) /
      CLOUD_COVERAGE_LAYER_HEIGHT
  );
  let lat =
    rounder(
      degrees(cartographic.latitude - CLOUD_COVERAGE_ORIGIN.latitude) /
        CLOUD_COVERAGE_RESOLUTION
    ) + NOISE_OFFSET.lat;
  let lon =
    rounder(
      degrees(cartographic.longitude - CLOUD_COVERAGE_ORIGIN.longitude) /
        CLOUD_COVERAGE_RESOLUTION
    ) + NOISE_OFFSET.lon;

  if (alt < 0 || alt >= CLOUD_COVERAGE_LAYERS) return null;

  return noise3(alt * NOISE_SCALE, lat * NOISE_SCALE, lon * NOISE_SCALE);
}

export function* getCloudCoverage() {
  for (let lats of CLOUD_COVERAGE) {
    for (let lons of lats) {
      for (let entry of lons) {
        yield entry;
      }
    }
  }
}

export function getCloudBox(cloudData) {
  let cloudCoverage = cloudData.getValue();
  if (cloudCoverage < 0.5) {
    // console.log(`rejected ${cloudData} for ${cloudCoverage} coverage`);
    return null;
  }
  let color = [1, 1, 1];
  let min = cloudData.position;
  let max = Cesium.Cartographic.clone(min);
  max.latitude += radians(CLOUD_COVERAGE_RESOLUTION);
  max.longitude += radians(CLOUD_COVERAGE_RESOLUTION);
  max.height += CLOUD_COVERAGE_LAYER_HEIGHT;

  if (cloudCoverage > 0.6) {
    let col = mapToRange(cloudCoverage, [0.6, 1], [1, 0.65]);
    color = [col * 0.8, col * 0.8, col * 0.9];
  }
  let geoInstance = new Cesium.GeometryInstance({
    geometry: new Cesium.RectangleGeometry({
      rectangle: Cesium.Rectangle.fromCartographicArray([min, max]),
      vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      height: min.height,
      extrudedHeight: max.height,
    }),
    id: `CLOUD[${cloudData.grid.lat},${cloudData.grid.lon},${cloudData.grid.alt}]`,
    attributes: {
      color: new Cesium.ColorGeometryInstanceAttribute(
        ...color,
        cloudCoverage / CLOUD_COVERAGE_LAYERS
      ),
    },
  });
  geoInstance.cloudData = cloudData;

  return geoInstance;
}

function calculateCloudCoverage() {
  // array of latitude arrays of longitude arrays
  let coverage = [];
  // map grid points to entries
  // let map = new Map();

  for (let alt = 0; alt < CLOUD_COVERAGE_LAYERS; alt++) {
    let latitudeArray = [];
    for (
      let lat = -CLOUD_COVERAGE_HALF_GRID_SIZE;
      lat < CLOUD_COVERAGE_HALF_GRID_SIZE;
      lat++
    ) {
      let longitudeArray = [];
      for (
        let lon = -CLOUD_COVERAGE_HALF_GRID_SIZE;
        lon < CLOUD_COVERAGE_HALF_GRID_SIZE;
        lon++
      ) {
        let position = Cesium.Cartographic.fromDegrees(
          degrees(CLOUD_COVERAGE_ORIGIN.longitude) +
            lon * CLOUD_COVERAGE_RESOLUTION,
          degrees(CLOUD_COVERAGE_ORIGIN.latitude) +
            lat * CLOUD_COVERAGE_RESOLUTION,
          CLOUD_COVERAGE_BASE_HEIGHT + alt * CLOUD_COVERAGE_LAYER_HEIGHT
        );
        let entry = {
          grid: {
            lat,
            lon,
            alt,
          },
          position,
          // TODO: cloud coverage per box is from "minimum" corner, not center!
          getValue: (time = 0) => getCloudCoverageAt(position),
        };
        longitudeArray[lon + CLOUD_COVERAGE_HALF_GRID_SIZE] = entry;
        // map.set(entry.grid, entry);
      }
      latitudeArray[lat + CLOUD_COVERAGE_HALF_GRID_SIZE] = longitudeArray;
    }
    coverage[alt] = latitudeArray;
  }

  return coverage;
}
