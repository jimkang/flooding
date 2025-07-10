export default `#version 300 es

precision highp float;

#define PI 3.141592653589793

uniform float u_density;
uniform float u_doneness;
uniform float u_time;

out vec4 outColor;

const float lineThickness = .02;
const float lineBlur = .0025;
const float baseFrequency = 4.;
const float bigWaveAmpFactor = .0625;
const float maxDensity = .934;

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

void main() {
  vec2 st = gl_FragCoord.xy/800.;

  float x = st.x;
  float t = u_time;
  float horizontalShift = mod(t * 10. * u_density/maxDensity, 2. * PI);

  float distProp = 0.;
  float dist = distance(st, vec2(.5));

  float bigWavePeriod = pow(1. - u_density/maxDensity, 3.);
  float bigWaveAmp = bigWaveAmpFactor * cos(u_time * pow(10000., pow(u_density/maxDensity, 3.)));
  float bigWaveY = sin(x/bigWavePeriod + horizontalShift) * bigWaveAmp;

  float y = bigWaveY + 0.5;

  float bottomEdge = y - lineThickness;
  float topEdge = y + lineThickness;
  float on = hill(bottomEdge - lineBlur, bottomEdge, topEdge, topEdge 
  + lineBlur, st.y);

  outColor = vec4(vec3(on), 1.0);
}
`;
