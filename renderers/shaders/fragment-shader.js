export default `#version 300 es

precision highp float;

#define PI 3.141592653589793

uniform float u_density;
uniform float u_doneness;
uniform float u_time;
uniform float u_wiggle;

out vec4 outColor;

const float baseWaveSpace = .2; 
const float lineThickness = .02;
const float lineBlur = .0025;
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
float hill(float foot1, float peak1, float peak2, float foot2, float x) {
  return smoothstep(foot1, peak1, x) *
    // This smoothstep returns "on" for stuff higher than foot2. But
    // we want the opposite, "off" for stuff higher than foot2. So, we apply
    // the 1. - result modification.
    (1. - smoothstep(peak2, foot2, x));
}

vec2 rotate2D(vec2 stIn, float _angle) {
  vec2 _st = vec2(stIn);
  _st -= 0.5;
  _st =  mat2(cos(_angle),-sin(_angle),
              sin(_angle),cos(_angle)) * _st;
  _st += 0.5;
  return _st;
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

  float bottomEdge = outY - lineThickness;
  float topEdge = outY + lineThickness;
  return hill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
  + lineBlur, y);
}

void main() {
  vec2 st = gl_FragCoord.xy/800.;
  vec2 rotatedSt = rotate2D(st, PI/2.);

  // float distProp = 0.;
  // float dist = distance(st, vec2(.5));

  float on = 0.;
  

  for (float i = 0.; i < 1./baseWaveSpace; ++i) {
    float yAdjust = baseWaveSpace/2. + i * baseWaveSpace;
    on = max(on,
      max(
        wave(st.x, st.y, u_time, u_density, u_wiggle, yAdjust),
        wave(rotatedSt.x, rotatedSt.y, u_time, u_density, u_wiggle, yAdjust)
      )
    );
  }

  outColor = vec4(vec3(on), 1.0);
}
`;
