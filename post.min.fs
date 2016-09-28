
#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D colorBuffer;varying vec2 texCoord;void main(){vec3 a=texture2D(colorBuffer,texCoord).xyz;gl_FragColor.xyz=pow(a,vec3(2.2));gl_FragColor.w=1.0;}