
#ifdef GL_ES
precision highp float;
#endif
uniform vec3 uPColor;varying float life;void main(){float a=1.0-min(life,1.0);float b=min(a*2.0,1.0);vec2 c=(gl_PointCoord-vec2(0.5))*2.0;float d=1.0-length(c);gl_FragColor=vec4(uPColor,b*d);}