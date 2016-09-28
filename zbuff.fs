#ifdef GL_ES
	precision highp float;
#endif

void main() 
{
	//float zVal = (gl_FragCoord.z + 1.0) / 2.0;
	float zVal = (gl_FragCoord.z);
	vec3 rgbVal = vec3(fract(zVal*vec3(1.0,256.0,256.0*256.0)));
	rgbVal -= rgbVal.yzz * vec3(1.0/256.0,1.0/(256.0*256.0),0.0);
	gl_FragColor.xyz = rgbVal;
	gl_FragColor.w = 1.0;
} 
