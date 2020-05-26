#ifdef GL_ES
    precision mediump float;
#endif

#extension GL_OES_standard_derivatives: enable
#extension GL_EXT_shader_texture_lod: enable

#define PI_TWO 1.570796326794897
#define PI     3.141592653589793
#define TWO_PI 6.283185307179586
#define AVG_BLUR_SAMPLES 3


uniform sampler2D colorTexture;
uniform sampler2D iceMaterial;
uniform float elapsedTime;

uniform float icing;
uniform float iceNormal;

uniform float raining;
uniform float rainTintLimit;
uniform float rainBlurLimit;
uniform float rainBrightness;

uniform vec4 iceColor;
uniform vec4 rainTintColor;

// varying vec2 v_textureCoordinates;

float inRaindrop = 0.0;

/// UTILITY FUNCTIONS ///

vec4 blurSample(sampler2D image, vec2 uv, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += texture2D(image, uv) * 0.1964825501511404;
  color += texture2D(image, uv + (off1 / czm_viewport.zw)) * 0.2969069646728344;
  color += texture2D(image, uv - (off1 / czm_viewport.zw)) * 0.2969069646728344;
  color += texture2D(image, uv + (off2 / czm_viewport.zw)) * 0.09447039785044732;
  color += texture2D(image, uv - (off2 / czm_viewport.zw)) * 0.09447039785044732;
  color += texture2D(image, uv + (off3 / czm_viewport.zw)) * 0.010381362401148057;
  color += texture2D(image, uv - (off3 / czm_viewport.zw)) * 0.010381362401148057;
  return color;
}

vec4 avgBlurSample(sampler2D image, vec2 uv, vec2 direction) {
  vec4 color = vec4(0.0);

  return color;
}

/// RANDOM AND NOISE FUNCTIONS ///

const mat3 octiveMatrix = mat3( 0.00,  0.80,  0.60,
                               -0.80,  0.36, -0.48,
                               -0.60, -0.48,  0.64 );

vec2 rand(vec2 c) {
  mat2 m = mat2(12.9898,.16180,78.233,.31415);
	return fract(sin(m * c) * vec2(43758.5453, 14142.1));
}

vec2 noise2(vec2 p) {
	vec2 co = floor(p);
	vec2 mu = fract(p);
	mu = 3.*mu*mu-2.*mu*mu*mu;
	vec2 a = rand((co+vec2(0.,0.)));
	vec2 b = rand((co+vec2(1.,0.)));
	vec2 c = rand((co+vec2(0.,1.)));
	vec2 d = rand((co+vec2(1.,1.)));
	return mix(mix(a, b, mu.x), mix(c, d, mu.x), mu.y);
}

float hash(vec3 p) {
  p  = fract( p*0.3183099+.1 );
	p *= 17.0;
  return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
}

float snoise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),
                    hash(i+vec3(1,0,0)),f.x),
                mix(hash(i+vec3(0,1,0)),
                    hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),
                    hash(i+vec3(1,0,1)),f.x),
                mix(hash(i+vec3(0,1,1)),
                    hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}

float octiveNoise3(vec3 x) {
  float value = 0.0;
  value += 0.50618*snoise3( x );
  value += 0.33333*snoise3( x = octiveMatrix*x*2.01 );
  value += 0.11111*snoise3( x = octiveMatrix*x*2.02 );
  value += 0.03704*snoise3( x = octiveMatrix*x*2.03 );
  value += 0.01234*snoise3( x = octiveMatrix*x*2.04 );
  return value;
}

float vignette(vec2 uv, float amount) {
  uv *= (1.0 - uv) * 4.0;
  return pow(uv.x * uv.y, amount);
}

/// SHADER COMPONENTS ///

void blur(vec2 uv, inout vec4 fragColor) {
  vec2 distort = noise2(uv * 100.0) * 0.001;
  vec4 blur = blurSample(colorTexture, uv, vec2(1.0, 0));
  blur += blurSample(colorTexture, uv, vec2(0, 1.0));
  blur /= 2.0;
  blur = mix(fragColor, blur, rainBlurLimit);
  fragColor = mix(fragColor, blur, min(1.0, raining));
}

void tint(vec2 uv, inout vec4 fragColor) {
  fragColor = mix(fragColor, rainTintColor, clamp(raining, 0.0, 1.0) * rainTintLimit);
}

void darken(vec2 uv, inout vec4 fragColor) {
  fragColor *= clamp(mix(1.0, rainBrightness, raining), rainBrightness, 2.0);
}

void rain(vec2 uv, inout vec4 fragColor) {
  float time = czm_frameNumber * 0.02;

  vec2 wind = vec2(octiveNoise3(vec3(time * 0.08, 0.0, 0.0)) * 0.08, time * 0.008);
  vec2 wind_uv = uv + wind;

  vec2 small_uv = (gl_FragCoord.xy * 0.1) / czm_viewport.zw;
  small_uv += wind * 0.1;

  vec2 variation = noise2(small_uv * 400.0);

  // Loop through the different inverse sizes of drops
  for (int r = 6; r > 0; r--) {
    vec2 x = czm_viewport.zw * float(r) * 0.025;  // Number of potential drops (in a grid)
    vec2 p = 6.28 * wind_uv * x + (variation - 0.5) * 2.0;
    vec2 s = sin(p);


    // Current drop properties. Coordinates are rounded to ensure a
    // consistent value among the fragment of a given drop.
    vec2 v = floor(wind_uv * x + 0.25) / x;
    vec4 d = vec4(noise2(v*200.0), noise2(vec2(v.x + 500.0, v.y + 750.0) * 200.0));

    // Drop shape and fading
    float t = (s.x + s.y) * max(0.0, 1.0 - fract(time * (d.x + 0.1) + d.y) * 3.0);
    // float t = (s.x + s.y) * max(0.0, 1.0 - fract((elapsedTime) * (d.b + 0.1) + d.g) * 2.0);

    // d.r -> only x% of drops are kept on, with x depending on the size of drops
    if (d.r < float(5 - r) * 0.08 * raining && t > 0.5) {
      // Drop normal
      vec3 normal = normalize(-vec3(cos(p), mix(0.2, 2.0, t - 0.5)));
      // fragColor = vec4(normal * 0.5 + 0.5, 1.0); return;  // show normals
      // Poor man's refraction (no visual need to do more)
      fragColor = texture2D(colorTexture, uv - normal.xy * 0.2);

      inRaindrop = t;
    }
  }

  // do tints and darken on incoming fragColor
  // and newly textured raindrops
  tint(uv, fragColor);
  darken(uv, fragColor);

}

void ice(vec2 uv, inout vec4 fragColor) {
  vec4 iceMat = texture2D(iceMaterial, uv);
  vec2 normDir = (iceMat.xy * 2.0 - 1.0) * iceNormal;
  float intensity = iceMat.w;
  float density = iceMat.z;
  float gradient = 1.0 - vignette(uv, mix(0.0, 0.45, icing));
  intensity *= gradient;

  if(intensity < 0.01) return;

  density *= gradient;
  normDir *= intensity;

  vec3 normal = normalize(vec3(normDir, (1.0 - intensity) * 3.));

  vec4 fake_refraction = texture2D(colorTexture, uv - normal.xy);
  // do tints and darken on newly textured refraction if raining
  if (raining > 0.001) {
    tint(uv, fake_refraction);
    darken(uv, fake_refraction);
  }
  fragColor = mix(fake_refraction, fragColor, inRaindrop * (1.0 - density));
  fragColor = mix(fragColor, iceColor, density);

  // this is probably not working right but it looks okay
  vec3 fake_light = normalize(vec3((uv * 2.0 - 1.0) * 0.2, 1.0));
  float NdotL = clamp(dot(-normal, fake_light), 0.0, 1.0);
  vec4 light = fragColor * (iceColor * (1.0 - NdotL));

  fragColor = mix(fragColor, light, density);
}

void main() {
	vec2 screen_uv = gl_FragCoord.xy / czm_viewport.zw;
	// vec2 tex_uv = v_textureCoordinates;
  vec4 fragColor = texture2D(colorTexture, screen_uv);
  if (raining > 0.001) {
    blur(screen_uv, fragColor);
    rain(screen_uv, fragColor);
  }
  if (icing > 0.001) {
    ice(screen_uv, fragColor);
  }
  gl_FragColor = fragColor;
}
