
#ifdef GL_ES
precision highp float;
#endif
void main(){float a=(gl_FragCoord.z);vec3 b=vec3(fract(a*vec3(1.0,256.0,256.0*256.0)));b-=b.yzz*vec3(1.0/256.0,1.0/(256.0*256.0),0.0);gl_FragColor.xyz=b;gl_FragColor.w=1.0;}