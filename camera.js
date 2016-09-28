
/** @constructor */
function Camera()
{
	this._ortho = true;
	this._pos = [0,0,0];
	this._look = [0,0,-1];
	this._up = [0,1,0];
	this._nearPlane = -1;
	this._farPlane = 1;
	this._heightOrFov = 2;
	this._aspectRatio = 1;
	this._needCalcProj = this._needCalcView = false;
	var id = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
	this._projection = new Float32Array(id);
	this._view = new Float32Array(id);
	this._viewProj = new Float32Array(id);
	this._invViewProj = new Float32Array(id);
	
}


/** Update the camera matrices if needed */
Camera.prototype.UpdateMatrices = function()
{
	function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
	function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
	function normalize(a) { var l = Math.sqrt(dot(a,a)); return [a[0]/l,a[1]/l,a[2]/l]; }
	if(this._needCalcView)
	{
		var at = normalize([this._pos[0]-this._look[0],this._pos[1]-this._look[1],this._pos[2]-this._look[2]]);
		this._at = at;
		var rg = normalize(cross(this._up,at));
		var up = normalize(cross(at,rg));
		this._upC = up;
		this._rg = rg;
		this._view[0] = rg[0];
		this._view[1] = up[0];
		this._view[2] = at[0];
		this._view[3] = 0.;
		this._view[4] = rg[1];
		this._view[5] = up[1];
		this._view[6] = at[1];
		this._view[7] = 0.;
		this._view[8] = rg[2];
		this._view[9] = up[2];
		this._view[10] = at[2];
		this._view[11] = 0.;
		this._view[12] = -dot(rg, this._pos);
		this._view[13] = -dot(up, this._pos);
		this._view[14] = -dot(at, this._pos);
		this._view[15] = 1.;
	}
	if(this._needCalcProj)
	{
		var t = 2. / this._heightOrFov;
		var r = t / this._aspectRatio;
		var d = (this._farPlane - this._nearPlane);
		var z, tz;
		if(this._ortho)
		{
			z = 2. / d;
			tz = (this._farPlane + this._nearPlane) / d;
			this._projection[11] = 0;
			this._projection[15] = 1;
		} else
		{
			//r *= m_nearPlane;
			//t *= m_nearPlane;
			z = (this._farPlane + this._nearPlane) / d;
			tz = (2 * this._farPlane * this._nearPlane) / d;
			this._projection[11] = -1;
			this._projection[15] = 0;
		}
		this._projection[0] = r;
		this._projection[5] = t;
		this._projection[10] = -z;
		this._projection[14] = -tz;
	}
	if(this._needCalcProj || this._needCalcView)
	{
		var i = 0;
		for(var j = 0; j < 4; j++)
			for(var k = 0; k < 4; k++)
			{
				this._viewProj[i] = 0;
				for(var l = 0; l < 4; l++)
				{
					this._viewProj[i] += this._view[l + j * 4] * this._projection[l * 4 + k];
				}
				i++;
			}
		var m = this._viewProj;			
		this._invViewProj[ 0] =  m[ 5]*m[10]*m[15] - m[ 5]*m[11]*m[14] - m[ 9]*m[ 6]*m[15] + m[ 9]*m[ 7]*m[14] + m[13]*m[ 6]*m[11] - m[13]*m[ 7]*m[10];
		this._invViewProj[ 1] = -m[ 1]*m[10]*m[15] + m[ 1]*m[11]*m[14] + m[ 9]*m[ 2]*m[15] - m[ 9]*m[ 3]*m[14] - m[13]*m[ 2]*m[11] + m[13]*m[ 3]*m[10];
		this._invViewProj[ 2] =  m[ 1]*m[ 6]*m[15] - m[ 1]*m[ 7]*m[14] - m[ 5]*m[ 2]*m[15] + m[ 5]*m[ 3]*m[14] + m[13]*m[ 2]*m[ 7] - m[13]*m[ 3]*m[ 6];
		this._invViewProj[ 3] = -m[ 1]*m[ 6]*m[11] + m[ 1]*m[ 7]*m[10] + m[ 5]*m[ 2]*m[11] - m[ 5]*m[ 3]*m[10] - m[ 9]*m[ 2]*m[ 7] + m[ 9]*m[ 3]*m[ 6];
		this._invViewProj[ 4] = -m[ 4]*m[10]*m[15] + m[ 4]*m[11]*m[14] + m[ 8]*m[ 6]*m[15] - m[ 8]*m[ 7]*m[14] - m[12]*m[ 6]*m[11] + m[12]*m[ 7]*m[10];
		this._invViewProj[ 5] =  m[ 0]*m[10]*m[15] - m[ 0]*m[11]*m[14] - m[ 8]*m[ 2]*m[15] + m[ 8]*m[ 3]*m[14] + m[12]*m[ 2]*m[11] - m[12]*m[ 3]*m[10];
		this._invViewProj[ 6] = -m[ 0]*m[ 6]*m[15] + m[ 0]*m[ 7]*m[14] + m[ 4]*m[ 2]*m[15] - m[ 4]*m[ 3]*m[14] - m[12]*m[ 2]*m[ 7] + m[12]*m[ 3]*m[ 6];
		this._invViewProj[ 7] =  m[ 0]*m[ 6]*m[11] - m[ 0]*m[ 7]*m[10] - m[ 4]*m[ 2]*m[11] + m[ 4]*m[ 3]*m[10] + m[ 8]*m[ 2]*m[ 7] - m[ 8]*m[ 3]*m[ 6];
		this._invViewProj[ 8] =  m[ 4]*m[ 9]*m[15] - m[ 4]*m[11]*m[13] - m[ 8]*m[ 5]*m[15] + m[ 8]*m[ 7]*m[13] + m[12]*m[ 5]*m[11] - m[12]*m[ 7]*m[ 9];
		this._invViewProj[ 9] = -m[ 0]*m[ 9]*m[15] + m[ 0]*m[11]*m[13] + m[ 8]*m[ 1]*m[15] - m[ 8]*m[ 3]*m[13] - m[12]*m[ 1]*m[11] + m[12]*m[ 3]*m[ 9];
		this._invViewProj[10] =  m[ 0]*m[ 5]*m[15] - m[ 0]*m[ 7]*m[13] - m[ 4]*m[ 1]*m[15] + m[ 4]*m[ 3]*m[13] + m[12]*m[ 1]*m[ 7] - m[12]*m[ 3]*m[ 5];
		this._invViewProj[11] = -m[ 0]*m[ 5]*m[11] + m[ 0]*m[ 7]*m[ 9] + m[ 4]*m[ 1]*m[11] - m[ 4]*m[ 3]*m[ 9] - m[ 8]*m[ 1]*m[ 7] + m[ 8]*m[ 3]*m[ 5];
		this._invViewProj[12] = -m[ 4]*m[ 9]*m[14] + m[ 4]*m[10]*m[13] + m[ 8]*m[ 5]*m[14] - m[ 8]*m[ 6]*m[13] - m[12]*m[ 5]*m[10] + m[12]*m[ 6]*m[ 9];
		this._invViewProj[13] =  m[ 0]*m[ 9]*m[14] - m[ 0]*m[10]*m[13] - m[ 8]*m[ 1]*m[14] + m[ 8]*m[ 2]*m[13] + m[12]*m[ 1]*m[10] - m[12]*m[ 2]*m[ 9];
		this._invViewProj[14] = -m[ 0]*m[ 5]*m[14] + m[ 0]*m[ 6]*m[13] + m[ 4]*m[ 1]*m[14] - m[ 4]*m[ 2]*m[13] - m[12]*m[ 1]*m[ 6] + m[12]*m[ 2]*m[ 5];
		this._invViewProj[15] =  m[ 0]*m[ 5]*m[10] - m[ 0]*m[ 6]*m[ 9] - m[ 4]*m[ 1]*m[10] + m[ 4]*m[ 2]*m[ 9] + m[ 8]*m[ 1]*m[ 6] - m[ 8]*m[ 2]*m[ 5];
		var det = m[0]*this._invViewProj[0]+m[1]*this._invViewProj[4]+m[2]*this._invViewProj[8]+m[3]*this._invViewProj[12];
		if(det!=0)
		{
			for(var i = 0; i<16; i++)
				this._invViewProj[i] /= det;
		}
	}
	this._needCalcProj = false;
	this._needCalcView = false;
}

function Transform(mat,vect)
{
	var ris= [0,0,0,0];
	for(var i=0;i<4;i++)
		for(var j=0;j<4;j++)
		{
			ris[j] += mat[i*4+j] * vect[i];
		}	
	return ris;
}

Camera.prototype.get3D = function(px,py,pz)
{
	var ris= Transform(this._invViewProj,[px,py,pz==undefined? 0 : pz,1])
	for(var i=0;i<3;i++) ris[i] /= ris[3];

	var ris2 = [];
	for(var i=0;i<3;i++)
	{
		ris2[i] = px * this._rg[i]*this._aspectRatio/(this._heightOrFov)+
				  py * this._upC[i]/(this._heightOrFov)+ 
				  //this._look[i]-this._at[i]*10;
				  this._at[i]*(-20) + this._pos[i];
	}
	return ris;
}

Camera.prototype.projection = function() { this.UpdateMatrices(); return this._projection; }
Camera.prototype.view = function() { this.UpdateMatrices(); return this._view; }
Camera.prototype.viewProj = function() { this.UpdateMatrices(); return this._viewProj; }

Camera.prototype.ortho = function(v) { if(v!=undefined) { this._needCalcProj|=this._ortho!=v; this._ortho=v; } return this._ortho; }
Camera.prototype.persp = function(v) { if(v!=undefined) { this.ortho(!v); } return !this._ortho; }

function floatDiff(a,b) { var v = b-a; return (v>=1e-3) || (v<=-1e-3);}

Camera.prototype.height = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._heightOrFov,v); 
		this._heightOrFov=v; 
	} 
	return this._heightOrFov; 
}

Camera.prototype.fovRad = function(v) { if(v!=undefined) { this.height(Math.tan(v/2)); } }
Camera.prototype.fovDeg = function(v) { if(v!=undefined) { this.height(Math.tan(Math.PI*v/360)); } }

Camera.prototype.aspectRatio = function(w,h) 
{ 
	if(w!=undefined) 
	{
		var v = w;
		if(h!=undefined) v=w/h;
		this._needCalcProj|=floatDiff(this._aspectRatio,v); 
		this._aspectRatio = v;
	}
	return this._aspectRatio;
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
Camera.prototype.pos = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._pos[0],v[0]) || 
			floatDiff(this._pos[1],v[1]) || 
			floatDiff(this._pos[2],v[2]); 
		this._pos = v;
	} 
	return this._pos; 
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
Camera.prototype.look = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._look[0],v[0]) || 
			floatDiff(this._look[1],v[1]) || 
			floatDiff(this._look[2],v[2]); 
		this._look = v;
	} 
	return this._look; 
}

/** @param {?number|Array=} x
  * @param {?number=} y
  * @param {?number=} z
  */
Camera.prototype.up = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._up[0],v[0]) || 
			floatDiff(this._up[1],v[1]) || 
			floatDiff(this._up[2],v[2]); 
		this._up = v;
	} 
	return this._up; 
}

Camera.prototype.nearPlane = function(v)
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._nearPlane,v); 
		this._nearPlane=v; 
	} 
	return this._nearPlane; 
}

Camera.prototype.farPlane = function(v)
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._nearPlane,v); 
		this._farPlane=v; 
	} 
	return this._farPlane; 
}

