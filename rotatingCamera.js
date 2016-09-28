/** @constructor 
  * @extends {Camera}
*/
function RotatingCamera()
{
	Camera.call(this);
	this._btnDown = [false,false,false,false,false,false];
	this._alpha = 0;
	this._beta = 0;
	this._dist = 1;
	this._needCalcRotate = false;
}

RotatingCamera.prototype = new Camera();

RotatingCamera.prototype.UpdateMatrices = function()
{
	if(this._needCalcRotate)
	{
		var sa = Math.sin(this._alpha), ca = Math.cos(this._alpha); 
		var sb = Math.sin(this._beta), cb = Math.cos(this._beta); 
		var v = [0,0,0], l = this.look();
		v[0] = l[0] + ca * sb * this._dist;
		v[1] = l[1] + sa * this._dist;
		v[2] = l[2] + ca * cb * this._dist;
		this.pos(v);
		this.nearPlane(this._dist * 0.1);
		this.farPlane(this._dist * 10);
	}
	Camera.prototype.UpdateMatrices.call(this);
	this._needCalcRotate = false;
}

//function floatDiff(a,b) { var v = b-a; return (v>=1e-3) || (v<=-1e-3);}

RotatingCamera.prototype.alpha = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._alpha,v); 
		this._alpha=v; 
	} 
	return this._alpha; 
}

RotatingCamera.prototype.beta = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._beta,v); 
		this._beta=v; 
	} 
	return this._beta; 
}

RotatingCamera.prototype.dist = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._dist,v); 
		this._dist=v; 
	} 
	return this._dist; 
}

RotatingCamera.prototype.alphaDeg = function(v) { if(v!=undefined) { this.alpha(Math.PI*v/180); } }
RotatingCamera.prototype.betaDeg = function(v) { if(v!=undefined) { this.beta(Math.PI*v/180); } }

RotatingCamera.prototype.ApplyDeltas = function(dx,dy,dz)
{
	this._alpha += dy / 100;
	this._beta -= dx / 100;
	if( dz < 0) this._dist *= 1.1;
	if( dz > 0) this._dist /= 1.1;
	this._needCalcRotate=true;
	this.UpdateMatrices();	
}

RotatingCamera.prototype.AddListeners = function(dest, paintFn)
{
	dest = dest || document.body;
	paintFn = paintFn || function() {};
	var mouseDown = false;
	var tc=this;
	var exX,exY;
	dest.addEventListener("mousedown",function(e) { 
		mouseDown = true; 
		exX = e.screenX;
		exY = e.screenY;
	});
	document.body.addEventListener("mouseup",function() { mouseDown = false; } );
	document.body.addEventListener("mousemove",function(e) 
	{ 
		if( mouseDown )
		{
			var deltax = e.screenX-exX;
			var deltay = e.screenY-exY;
			exX =e.screenX;
			exY =e.screenY;

			tc.ApplyDeltas(deltax,deltay,0);
			paintFn();
		}
	});
	dest.addEventListener("wheel",function(e) 
	{ 
		e.deltaY = e.deltaY ? e.deltaY : -e.wheelDelta ;
		tc.ApplyDeltas(0,0,e.deltaY);
	
		tc._needCalcRotate=true;
		tc.UpdateMatrices();
		paintFn();			
	});
}
