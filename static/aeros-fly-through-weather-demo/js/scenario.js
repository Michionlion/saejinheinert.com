// start time of the demo scenario
export const START_TIME = Cesium.JulianDate.fromDate(
  new Date(2020, 4, 11, 12, 0, 0, 0)
);
// stop time of the demo scenario
export const STOP_TIME = Cesium.JulianDate.fromDate(
  new Date(2020, 4, 11, 12, 3, 0, 0)
);

// length of the demo (20 minutes) in seconds
export const TOTAL_TIME = Cesium.JulianDate.secondsDifference(
  STOP_TIME,
  START_TIME
);

// sampled positions on the aircraft's flight path
export const FLIGHT_PATH = calculateFlightPath();

let aircraft = null;
let viewer = null;

export function getAircraft() {
  return aircraft;
}

export function getCesiumViewer() {
  return viewer;
}

function calculateFlightPath() {
  let path = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.FIXED, 0);

  let points = [
    Cesium.Cartesian3.fromDegrees(-77.117, 40.046, 1500),
    Cesium.Cartesian3.fromDegrees(-77.357, 40.166, 2100),
    Cesium.Cartesian3.fromDegrees(-77.402, 40.219, 2575),
    Cesium.Cartesian3.fromDegrees(-77.423, 40.249, 2600),
  ];

  let times = [
    START_TIME,
    Cesium.JulianDate.addSeconds(
      START_TIME,
      TOTAL_TIME * 0.63,
      new Cesium.JulianDate()
    ),
    Cesium.JulianDate.addSeconds(
      START_TIME,
      TOTAL_TIME * 0.85,
      new Cesium.JulianDate()
    ),
    STOP_TIME,
  ];
  path.addSamples(times, points);
  path.setInterpolationOptions({
    interpolationDegree: 8,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
  });
  return path;
}

/**
 *
 *
 * @export
 * @param {Array} [onTickCallbacks]
 */
export function initialize(...onTickCallbacks) {
  // need to hide this token for actual things
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2ODhkZTI3MS0xMDNlLTQ1ZTYtOTg0Ny04ZjkwZTUwYjI5MDQiLCJpZCI6MjY0NTEsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODc3NDg4NDN9.Sas8DoiDCGkhNiKQeZWKcloGkjBTu7S683PT2e-3AWo";
  viewer = new Cesium.Viewer("cesiumContainer", {
    vrButton: true,
    // home button restarts animation
    homeButton: true,
    infoBox: false,
    sceneModePicker: false,
    baseLayerPicker: true,
    selectionIndicator: false,
    imageryProvider: Cesium.createWorldImagery(),
    terrainProvider: Cesium.createWorldTerrain({
      requestWaterMask: true,
      requestVertexNormals: true,
    }),
    // imageryProvider: new Cesium.UrlTemplateImageryProvider({
    //   url:
    //     "https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=vZSMOKCGUz72zl4ZrVlf",
    //   minimumLevel: 0,
    //   maximumLevel: 20,
    //   credit: new Cesium.Credit(
    //     '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    //     true
    //   ),
    // }),
    // terrainProvider: new Cesium.CesiumTerrainProvider({
    //   url:
    //     "https://api.maptiler.com/tiles/terrain-quantized-mesh/?key=vZSMOKCGUz72zl4ZrVlf",
    //   credit: new Cesium.Credit(
    //     '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    //     true
    //   ),
    //   requestVertexNormals: true,
    // }),
    terrainShadows: Cesium.ShadowMode.ENABLED,
    sceneMode: Cesium.SceneMode.SCENE3D,
    scene3DOnly: true,
    shadows: true,

    // demo modifications:
    geocoder: false,
    timeline: true,
    shouldAnimate: true,
    navigationInstructionsInitiallyVisible: false,

    // rendering modificaitons
    targetFrameRate: 60,
  });

  let gl = viewer.canvas.getContext("webgl");
  let ext = gl.getExtension("EXT_shader_texture_lod");

  // Set rendering settings
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.eyeSeparation = 0.1;

  // disable the default event handlers
  // viewer.scene.screenSpaceCameraController.enableRotate = false;
  viewer.scene.screenSpaceCameraController.enableTranslate = false;
  // viewer.scene.screenSpaceCameraController.enableZoom = false;
  viewer.scene.screenSpaceCameraController.enableTilt = false;
  viewer.scene.screenSpaceCameraController.enableLook = false;

  // // ensure focus on canvas
  // viewer.canvas.setAttribute("tabindex", "0");
  // viewer.canvas.onclick = () => viewer.canvas.focus();

  viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
    e.cancel = true;
    viewer.clock.currentTime = START_TIME; // set aircraft to the right location
    viewer.clock.shouldAnimate = false;
    viewer
      .flyTo(aircraft, {
        duration: 1,
      })
      .then(() => {
        viewer.clock.shouldAnimate = true;
        viewer.clock.currentTime = START_TIME;
        viewer.trackedEntity = aircraft;
      });
  });

  // Set up clock and timeline.
  viewer.clock.shouldAnimate = true;
  viewer.clock.canAnimate = true;
  viewer.clock.startTime = START_TIME;
  viewer.clock.stopTime = STOP_TIME;
  viewer.clock.currentTime = START_TIME;
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER; // tick computation mode
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; // loop at the end
  viewer.timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime); // set visible range

  for (let cb of onTickCallbacks) {
    viewer.clock.onTick.addEventListener((clock) => cb(clock.currentTime));
  }

  // set up aircraft entity
  aircraft = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: START_TIME,
        stop: STOP_TIME,
      }),
    ]),
    position: FLIGHT_PATH,
    orientation: new Cesium.VelocityOrientationProperty(FLIGHT_PATH),
    model: {
      uri: "assets/gltf/Global_Hawk.glb",
    },
    path: {
      resolution: 0.1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.5,
        color: Cesium.Color.BLUEVIOLET,
      }),
      width: 3,
    },
  });
  aircraft.velocity = new Cesium.VelocityVectorProperty(
    aircraft.position,
    false
  );
  viewer.trackedEntity = aircraft;
}
