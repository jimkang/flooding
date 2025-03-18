export default `#version 300 es

precision highp float;

#define PI 3.141592653589793

uniform float u_density;
uniform float u_doneness;
uniform float u_time;

out vec4 outColor;

float rand(vec2 st) {
  return fract(
    sin(
      dot(st.xy, vec2(12.456, -47.34))
      * u_time
    )
    * u_density * 10000.
  );
}

void main() {
  //outColor = vec4(0.18, 0.54, 0.34, 1.0);
  vec2 st = gl_FragCoord.xy/800.;
  outColor = vec4(u_doneness, rand(st), rand(st), 1.0);
}
`;
