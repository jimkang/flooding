export default `#version 300 es

precision highp float;

#define PI 3.141592653589793

uniform float u_density;
uniform float u_doneness;
uniform float u_time;
uniform float u_wiggle;
uniform vec2 u_res;

out vec4 outColor;

const float baseWaveSpace = .2; 
const float baseFrequency = 4.;
const float bigWaveAmpFactor = .0625;
const float lineSetCount = 3.;

float rand(vec2 st) {
  return fract(
    sin(
      dot(st.xy, vec2(12.456, -47.34))
      * u_time
    )
    * u_density * 10000.
  );
}

// https://www.shadertoy.com/view/4dS3Wd
// By Morgan McGuire @morgan3d, http://graphicscodex.com
// Reuse permitted under the BSD license.
float hash(float p) { p = fract(p * 0.011); p *= p + 7.5; p *= p + p; return fract(p); }
float hash2(float p) { p = fract(p * 0.041); p *= p + 3.7; p *= p + p; return fract(p); }

float noise(bool useHash2, float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  if (useHash2) {
    return mix(hash2(i), hash2(i + 1.0), u);
  }
  return mix(hash(i), hash(i + 1.0), u);
}

// End code from https://www.shadertoy.com/view/4dS3Wd

// Fractal Brownian noise
float multiGenNoise(int gens, float lacunarity, float gain,
  float amp, float freq, bool useHash2, float x) {

  float y = 0.;
  for (int i = 0; i < gens; ++i) {
    y += amp * noise(useHash2, freq * x);
    freq *= lacunarity;
    amp *= gain;
  }

  return y;
}

//
//            peak1----peak2
//           /              \
//          /                \
// ----foot1                  foot2----
//
//
float hill(float foot1, float peak1, float peak2, float foot2, float x) {
  return smoothstep(foot1, peak1, x) *
    // This smoothstep returns "on" for stuff higher than foot2. But
    // we want the opposite, "off" for stuff higher than foot2. So, we apply
    // the 1. - result modification.
    (1. - smoothstep(peak2, foot2, x));
}

float noiseHill(float foot1, float peak1, float peak2, float foot2, float x) {
  if (x < foot1) {
    return 0.;
  }
  if (x > foot2) {
    return 0.;
  }
  if (x > peak1 && x < peak2) {
    return 1.;
  }


  float xDelta = 0.;
  float maxXDelta = 0.;
  float maxYDelta = 1.;
  if (x < peak1) {
    xDelta = x - foot1;
    maxXDelta = peak1 - foot1;
  } else {
    xDelta = foot2 - x;
    maxXDelta = foot2 - peak2;
  }

  float progressTowardPeak = xDelta/maxXDelta;
  // float y = maxYDelta * progressTowardPeak;
  // float y = maxYDelta * pow(sin(progressTowardPeak * PI/2.), 4.);
  float y = maxYDelta * pow(progressTowardPeak, 2.);
  // Add noise.
  // y += maxYDelta/10. * fract(sin(progressTowardPeak) * 4000.);
  y = multiGenNoise(4, .8, .5, .33, 16., false, progressTowardPeak);
  return y;
}

vec2 rotate2D(vec2 stIn, float _angle) {
  vec2 _st = vec2(stIn);
  _st -= 0.5;
  _st =  mat2(cos(_angle),-sin(_angle),
              sin(_angle),cos(_angle)) * _st;
  _st += 0.5;
  return _st;
}

float repeatedNoise(int repeats, float lacunarity, float gain, float x) {
  float amplitude = 0.05;
  float frequency = 1.;
  float y = 0.;

  for (int i = 0; i < repeats; i++) {
    y += amplitude * fract(sin(frequency * x) * 4000.);
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return y;
}

float wave(float x, float t, float density, float wiggle, float yAdjust) {
  float bigWavePeriod = 1. - density;
  float bigWaveAmp = bigWaveAmpFactor * cos(t * pow(10000., pow(density, 3.)));
  float horizontalShift = mod(wiggle/100., 2. * PI);
  float bigWaveY = sin(x/bigWavePeriod + horizontalShift) * bigWaveAmp;
  bigWaveY += bigWaveAmp/31. * sin(x * 41. * PI * bigWavePeriod);
  // bigWaveY += bigWaveAmp/31. * sin(x * 19. * PI * bigWavePeriod);
  // bigWaveY += bigWaveAmp/31. * sin(x * 99. * PI * bigWavePeriod);
  bigWaveY += bigWaveAmp/7. * sin(3.7 * x * PI);
  // This one will make the waves "tilt".
  bigWaveY += 2. * density * bigWaveAmp * sin(x * .57 * bigWavePeriod - horizontalShift/2.3);

  float outY = bigWaveY + yAdjust;
  return outY;
}

float waveLine(float x, float y, float t, float density, float wiggle,
  float yAdjust, float lineBlur, float lineThickness) {

  float outY = wave(x, t, density, wiggle, yAdjust);
  float bottomEdge = outY - lineThickness;
  float topEdge = outY + lineThickness;
  return hill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
    + lineBlur, y);
}

// float layerWaves(int layerCount, float amp, float phase, float x) {
//   float y = 0;
//   for (int i = 0; i < layerCount; ++i) {
//     y += amp * (x * phase);
//   }
//   return y;
// }

float noiseWaveLine(
  float x,
  float y,
  float t,
  float density,
  float wiggle,
  float yAdjust,
  float lineBlur,
  float lineThicknessTop,
  float lineThicknessBottom,
  float noisePhaseFactor,
  float noiseAmpFactor,
  float noiseEdgeFactor) {

  float waveYForX = wave(x, t, density, wiggle, yAdjust);

  // Additional wave, makes it more water-like.
  waveYForX += noiseAmpFactor * sin(noisePhaseFactor * x + 2. * t);

  float bottomEdge = waveYForX - lineThicknessBottom;// * sin(t/8.) * noiseEdgeFactor;
  float topEdge = waveYForX + lineThicknessTop;// * noiseEdgeFactor * cos(t/8.);
  // return hill(bottomEdge, bottomEdge, topEdge, topEdge, y);
  return noiseHill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
    + lineBlur, y);
}

float waveDist(float x, float y, float t, float density, float wiggle, float yAdjust) {
  float outY = wave(x, t, density, wiggle, yAdjust);
  // vec2 distVec = vec2(x,  y - outY);
  // float distSquared = dot(distVec, distVec);
  // return distSquared;
  return abs(outY - y);
}

void main() {
  vec2 st = gl_FragCoord.xy/u_res;
  // Translate everything to the left.
  st.x += .25;
  vec2 rotatedSt = rotate2D(st, PI/2.);

  // float distProp = 0.;
  // float dist = distance(st, vec2(.5));

  float on = 0.;

  // Wave lines
  float offset = 0.;

  // Next: The lines in the set need to differ from each other, both in phase and in color. Subtask: Extra phase shift param in wave().
  for (float lineSetIndex = 0.; lineSetIndex < lineSetCount; ++lineSetIndex) {
    offset += baseWaveSpace/lineSetCount;

    for (float i = -2.; i < 1./baseWaveSpace; ++i) {
      float yAdjust = baseWaveSpace/2. + i * baseWaveSpace;
      on = max(on,
        max(
          noiseWaveLine(
            st.x,
            st.y,
            u_time + offset,
            u_density,
            u_wiggle * .5 * (lineSetIndex + 1.),
            yAdjust,
            baseWaveSpace * multiGenNoise(4, .9, .25, .125, (7. + offset) * PI, true, st.x), // lineBlur
            .005, // lineThicknessTop 
            .005, // lineThicknessBottom
            9. + offset,
            .02,
            (st.x + offset)/PI
          ),
          noiseWaveLine(
            rotatedSt.x,
            rotatedSt.y,
            u_time + offset,
            u_density,
            u_wiggle,
            yAdjust,
            baseWaveSpace * multiGenNoise(4, .9, .25, .125, (5. + offset) * PI, false, rotatedSt.x + offset), // lineBlur
            .005, // lineThicknessTop 
            .005, // lineThicknessBottom
            37. + offset,
            .007,
            (rotatedSt.x + offset)/PI)
        )
      );
    }
  }

  // Wave distance fields
  // float waveIndex = 0.;//floor(st.y/baseWaveSpace);
  // float waveLowBound = waveIndex * baseWaveSpace;
  // // float waveHighBound = waveLowBound + baseWaveSpace;
  // float yAdjust = baseWaveSpace/2. + waveLowBound;
  // float singleWaveOn = fract(waveDist(st.x, st.y, u_time, u_density, u_wiggle, yAdjust) * 10.);
  // // singleWaveOn += fract(waveDist(rotatedSt.x, rotatedSt.y, u_time, u_density, u_wiggle, yAdjust) * 10.);
  // on += singleWaveOn;
  // on = min(on, 1.);

  // Distance from something that is on.

  outColor = vec4(vec3(on), 1.0);
}
`;
