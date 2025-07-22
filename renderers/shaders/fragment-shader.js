export default `#version 300 es

precision highp float;

#define PI 3.141592653589793

uniform float u_density;
uniform float u_doneness;
uniform float u_time;
uniform float u_wiggle;

out vec4 outColor;

const float res = 800.;
const float baseWaveSpace = .2; 
const float baseFrequency = 4.;
const float bigWaveAmpFactor = .0625;

float rand(vec2 st) {
  return fract(
    sin(
      dot(st.xy, vec2(12.456, -47.34))
      * u_time
    )
    * u_density * 10000.
  );
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
  y += maxYDelta/10. * fract(sin(progressTowardPeak) * 4000.);
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
  float amplitude = 0.5;
  float frequency = 1.;
  float y = 0.;

  for (int i = 0; i < repeats; i++) {
    y += amplitude * fract(sin(frequency * x) * 4000.);
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return y;
}

float wave(float x, float y, float t, float density, float wiggle, float yAdjust) {
  float bigWavePeriod = pow(1. - density, 3.);
  float bigWaveAmp = bigWaveAmpFactor * cos(t * pow(10000., pow(density, 3.)));
  // bigWaveAmp = bigWaveAmpFactor * cos(1. * pow(10000., pow(density, 3.)));
  float horizontalShift = mod(wiggle/100., 2. * PI);
  // horizontalShift = wiggle/500.;
  // horizontalShift = mod(10. * density, 2. * PI);
  // horizontalShift = 0.;
  float bigWaveY = sin(x/bigWavePeriod + horizontalShift) * bigWaveAmp;
  float outY = bigWaveY + yAdjust;
  return outY;
}

float waveLine(float x, float y, float t, float density, float wiggle,
  float yAdjust, float lineBlur, float lineThickness) {

  float outY = wave(x, y, t, density, wiggle, yAdjust);
  outY += repeatedNoise(4, 2., .5, y);
  float bottomEdge = outY - lineThickness;
  float topEdge = outY + lineThickness;
  // return hill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
  return noiseHill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
  + lineBlur, y);
}

float waveDist(float x, float y, float t, float density, float wiggle, float yAdjust) {
  float outY = wave(x, y, t, density, wiggle, yAdjust);
  // vec2 distVec = vec2(x,  y - outY);
  // float distSquared = dot(distVec, distVec);
  // return distSquared;
  return abs(outY - y);
}

void main() {
  vec2 st = gl_FragCoord.xy/res;
  vec2 rotatedSt = rotate2D(st, PI/2.);

  // float distProp = 0.;
  // float dist = distance(st, vec2(.5));

  float on = 0.;

  // Discrete wave lines
  for (float i = 0.; i < 1./baseWaveSpace; ++i) {
    float yAdjust = baseWaveSpace/2. + i * baseWaveSpace;
    on = max(on,
      max(
        waveLine(st.x, st.y, u_time, u_density, u_wiggle, yAdjust,
          baseWaveSpace * .3, .0001),
        waveLine(rotatedSt.x, rotatedSt.y, u_time, u_density, u_wiggle, yAdjust,
          baseWaveSpace * .1, .0001)
      )
    );
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
