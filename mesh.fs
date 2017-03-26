#ifdef GL_ES
	precision highp float;
#endif

varying vec3 pos;
varying vec3 norm;
varying vec2 tex;
varying vec2 screenCoord;

uniform vec4 uLightColorFar;
uniform vec4 uLightPosRadius;
uniform vec4 uMaterialColor;
uniform vec4 uScreenSizeNearFar;

uniform samplerCube shadowMap;
uniform sampler2D depthBuffer;
uniform mat4 uPVMatrix;

vec3 up;
vec3 rg;

float GetCube(vec3 l)
{
	vec3 txt = textureCube( shadowMap, l).xyz;
	//float shMap =  txt.x+txt.y/256.0+txt.z/(256.0*256.0);
	float shMap =  dot(txt,vec3(1.0,1.0/256.0,1.0/(256.0*256.0)));
	return shMap * 2.0 - 0.99;
}

float SimpleShadow(vec3 l)
{
	l.x=-l.x;
	float lMax = max(max(abs(l.x),abs(l.y)),abs(l.z));

	float n = uLightPosRadius.w*0.9;
	float f = uLightColorFar.w;
	float d = f-n;
	float zSc = (f+n)/d;
	float zTr = (2.0*f*n)/d;
	float shCalc  = min((lMax * zSc - zTr)/lMax,1.0);
	float shMap =  GetCube(l);
	if( shCalc>=shMap) return 0.0;
	return 1.0;
}

#define M_PI 3.14159265
#define N_CIRCLE_PCSS 7
#define N_RADIUS_PCSS 4
#define N_CIRCLE_SSAO 4
#define N_RADIUS_SSAO 3


float rand(vec2 co)
{
    return fract(sin(dot(co,vec2(78.611,61.178))) * 20163.001);
}

float rand2(vec2 co)
{
    return fract(sin(dot(co,vec2(61.178,78.611))) * 20160.102);
}


float lin(float zValue)
{
	float near = uLightPosRadius.w*0.9; //this *0.9 is in sphlight.cpp
	float far = uLightColorFar.w;
	return (2.0 * near) / ((far + near) - ((zValue+1.0)/2.0) * (far - near));
}

float PCCSShadow(vec3 l,vec3 nor)
{
	l.x=-l.x;
	float lMax = max(max(abs(l.x),abs(l.y)),abs(l.z));
	
	float near = uLightPosRadius.w*0.9;
	float far = uLightColorFar.w;
	float d = far-near;
	float zSc = (far+near)/d;
	float zTr = (2.0*far*near)/d;
	float shCalc  = min((lMax * zSc - zTr)/lMax,1.0);	
	float shMap =  GetCube(l);

	float nBlocker = 0.0;
	float meanDist = 0.0;
	float f = 0.0;
	if(shMap!=1.0 && shMap<shCalc)
	{
		f++;
		nBlocker++;
		meanDist += shMap;
	}
	float a = (rand(gl_FragCoord.xy)*2.)-1.;
   float rl = uLightPosRadius.w * (float(N_RADIUS_PCSS)-1.0+rand2(gl_FragCoord.xy))/float(N_RADIUS_PCSS);
	for(int j=0;j<N_CIRCLE_PCSS;j++)
	{
		float alpha = (float(j)+a) * M_PI * (2. / float(N_CIRCLE_PCSS));
		vec2 direx = vec2(sin(alpha),cos(alpha));
		for(int i=N_RADIUS_PCSS;i>0;i--)
		{
			float r = rl * float(i) / float(N_RADIUS_PCSS);
			vec3 p = l + rg * (direx[0]*r) + up*(direx[1]*r);
			lMax = max(max(abs(p.x),abs(p.y)),abs(p.z));
			float pCalc  = (lMax * zSc - zTr)/lMax;

			shMap = GetCube(p);
			if(shMap!=1.0 && shMap<pCalc)
			{
				nBlocker++;
				meanDist += shMap;
			}
		}
	}
	if( nBlocker == 0.0  ) return 1.0;
	//return 0.0;
	meanDist /= nBlocker;
	rl *= uLightPosRadius.w * (lin(shCalc) - lin(meanDist)) / lin(meanDist);
	
	for(int j=0;j<N_CIRCLE_PCSS;j++)
	{
		float alpha = (float(j)+a) * M_PI * (2. / float(N_CIRCLE_PCSS));
		vec2 direx = vec2(sin(alpha),cos(alpha));
		for(int i=N_RADIUS_PCSS;i>0;i--)
		{
			float r = rl  * float(i) / float(N_RADIUS_PCSS);
			vec3 p = l + rg * (direx[0]*r) + up*(direx[1]*r);
			lMax = max(max(abs(p.x),abs(p.y)),abs(p.z));
			float pCalc  = (lMax * zSc - zTr)/lMax;

			shMap = GetCube(p);
			if(shMap!=1.0 && shMap<pCalc)
			{
				f++;
			}
		}
	}
	return 1.0-(f/(float(N_CIRCLE_PCSS)*float(N_RADIUS_PCSS)+1.0));
}

float getDiffuse(in vec3 pos,in vec3 nor)
{
	vec3 L = uLightPosRadius.xyz - pos.xyz;
	float lDist = length(L);
	vec2 a = vec2(lDist,uLightPosRadius.w);
	//L /= lDist; don't modify L so it can be used for shadow
	a = normalize(a);

	float fact = dot( nor.xyz, L.xyz)/lDist;
	// apply radius
	fact += (1.0 - a.x);
	fact = max(fact, 0.0);

	//return fact;
	//return fact * SimpleShadow(L);
	return fact * PCCSShadow(L,nor);
}

float linScr(float zValue)
{
	float near = uScreenSizeNearFar.z; 
	float far = uScreenSizeNearFar.w;
	return (2.0 * near) / ((far + near) - ((zValue+1.0)/2.0) * (far - near));
}

float realScr(float zValue)
{
	float near = uScreenSizeNearFar.z; 
	float far = uScreenSizeNearFar.w;
	return near + linScr(zValue) * (far - near) ;
}

#define OCCL_RADIUS 0.01
float ssao(vec2 texCoord)
{
	float rnd = (rand2(gl_FragCoord.xy)*2.)-1.;
	float thisZ = linScr(texture2D(depthBuffer, texCoord).x);
	float occ = 0.0;
	for(int j=0;j<N_CIRCLE_SSAO;j++)
	{
		float alpha = (float(j)+rnd) * M_PI * (2. / float(N_CIRCLE_SSAO));
		vec2 direx = vec2(sin(alpha),cos(alpha));
		for(int i=N_RADIUS_SSAO;i>0;i--)
		{
			float r = OCCL_RADIUS * float(i) / float(N_RADIUS_SSAO); 
			vec2 thispos = texCoord + direx*r; 
			float cmpZ = linScr(texture2D(depthBuffer, thispos).x);
			float zDiff = thisZ - cmpZ;
			if( (zDiff>0.0) && (zDiff<r) )
			{
				occ += zDiff/r;
			}
      }
	}
   return 1.0-occ/(float(N_CIRCLE_SSAO*N_RADIUS_SSAO));
}


void main() 
{
	up = abs(norm.y)>0.9? vec3(0,0,1) : vec3(0,1,0);
	rg = normalize(cross(up,norm));
	up = normalize(cross(rg,norm));
	
	vec3 diffusePart = uLightColorFar.xyz * getDiffuse(pos,norm);
	vec2 texCoord = gl_FragCoord.xy / uScreenSizeNearFar.xy;
	vec3 ambientPart = vec3(0.5) * ssao(texCoord); // 0.1^(1/2.2) = 0.351 
	gl_FragColor.xyz = uMaterialColor.xyz * (diffusePart +ambientPart); 
	//gl_FragColor.xyz =  ambientPart; 
	gl_FragColor.w = uMaterialColor.w;
} 
