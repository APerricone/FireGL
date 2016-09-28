/** @constructor */
function Mesh(gl)
{
	if(gl==undefined) return; //inherit
	this.use16bit = true;
	this.nIndices = 0;
	this.nVertices = 0;
	this.nBytePerVertex = 0;
	this.normalDelta = 0;
	this.texCoordsDelta = 0;
	this.vBuffer = null;
	this.iBuffer = null;
	this.materialColor = [1,1,1,1];
	Mesh.LoadProgram(gl);
	if('gl' in gl) gl=gl['gl'];
	this.__defineGetter__('gl', function() { return gl; });
	this.modelMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

Mesh.prototype.__defineGetter__('pos',function() { return [this.modelMat[12],this.modelMat[13],this.modelMat[14]]; } );
Mesh.prototype.__defineSetter__('pos',function(v) 
{
	this.modelMat[12] = v[0];
	this.modelMat[13] = v[1];
	this.modelMat[14] = v[2]; 
});

Mesh.prototype.__defineSetter__('quat',function(v)
{
	var ss= v[3] * v[3] ;
	var sx= v[3] * v[0]; sx+=sx;
	var sy= v[3] * v[1]; sy+=sy;
	var sz= v[3] * v[2]; sz+=sz;
	var xx= v[0] * v[0];
	var xy= v[0] * v[1]; xy+=xy;
	var xz= v[0] * v[2]; xz+=xz;
	var yy= v[1] * v[1];
	var yz= v[1] * v[2]; yz+=yz;
	var zz= v[2] * v[2];
	this.modelMat[0]=ss+xx-yy-zz; 
	this.modelMat[1]=   xy+sz   ; 
	this.modelMat[2]=   xz-sy   ; 
	this.modelMat[4]=   xy-sz   ; 
	this.modelMat[5]=ss-xx+yy-zz; 
	this.modelMat[6]=   yz+sx   ; 
	this.modelMat[8]=   xz+sy   ;
	this.modelMat[9]=   yz-sx   ;
	this.modelMat[10]=ss-xx-yy+zz;
});

/** @const */ Mesh.PROGRAMID_MESH = 0;
/** @const */ Mesh.PROGRAMID_UNLIT = 1;
/** @const */ Mesh.PROGRAMID_CUBE = 2;
Mesh.programs = [];
Mesh.loadRequested = false;
Mesh.LoadProgram = function(gl)
{
	if( Mesh.loadRequested ) return;
	Mesh.loadRequested = true;
	LoadProgram(gl,"mesh.vs","mesh.fs",function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_MESH]=v; 
		var glCnt = gl;
		if( 'gl' in gl ) glCnt = gl.gl;
		glCnt.useProgram( v ); 
		glCnt.uniform1i(v.uniforms['shadowMap'], 0);
		glCnt.uniform1i(v.uniforms['depthBuffer'], 1);
		if( 'paint' in gl )
			gl.paint();
	});
	LoadProgram(gl,"mesh.vs","unlit.fs",function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_UNLIT]=v; 
		if( 'paint' in gl )
			gl.paint();
	});
	LoadProgram(gl,"cube.vs","zbuff.fs",function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_CUBE]=v; 
		if( 'paint' in gl )
			gl.paint();
	});
}

Mesh.SetCamera = function(gl,cam,w,h)
{
	if('gl' in gl) gl=gl['gl'];
	for(var i=0;i<2;i++)
	{
		if( Mesh.programs[i] == undefined ) continue;
		var uniforms = Mesh.programs[i].uniforms;

		gl.useProgram( Mesh.programs[i] ); 
		gl.uniformMatrix4fv(uniforms['uPVMatrix'],false,cam.viewProj());
		gl.uniform3fv(uniforms['uCamPosition'],cam.pos());
		gl.uniform4f(uniforms['uScreenSizeNearFar'],w,h,cam.nearPlane(),cam.farPlane());		
	}
	gl.useProgram( null );
}

Mesh.SetCubeUniforms = function(gl,light,p)
{
	if('gl' in gl) gl=gl['gl'];
	if( Mesh.programs[Mesh.PROGRAMID_CUBE] == undefined ) return;
	var uniforms = Mesh.programs[Mesh.PROGRAMID_CUBE].uniforms;

	gl.useProgram( Mesh.programs[Mesh.PROGRAMID_CUBE] ); 
	gl.uniformMatrix4fv(uniforms['uPVMatrix'],false, light.currentPVMatrix );
	var pos = light.pos;
	if(p!=undefined)
	{
		for(var i=0;i<3;i++) pos[i] += p.mean[i];
	}
	gl.uniform3fv(uniforms['uCenter'], pos);
	gl.useProgram( null );
}

Mesh.SetLight = function(gl,light,p)
{
	if( Mesh.programs[0] == undefined ) return;
	if('gl' in gl) gl=gl['gl'];
	var uniforms = Mesh.programs[0].uniforms;

	gl.useProgram( Mesh.programs[0] ); 
	
	gl.uniform4fv(uniforms['uLightColorFar'],light.colorFar);
	var pr = light.posRadius;
	if(p!=undefined)
	{
		for(var i=0;i<3;i++) pr[i] += p.mean[i];
	}
	gl.uniform4fv(uniforms['uLightPosRadius'],pr);
  
	gl.useProgram( null );
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,light.cubeTexture);
}

Mesh.prototype.PreDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var attributes = Mesh.programs[idProg].attributes;
	
	gl.useProgram(Mesh.programs[idProg]);
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.iBuffer);

	gl.enableVertexAttribArray(attributes['aVertexPosition']);
	gl.vertexAttribPointer(attributes['aVertexPosition'], 3, gl.FLOAT, false, this.nBytePerVertex, 0)
	if('aNormal' in attributes)
	{
		if(this.normalDelta != 0)
		{
			gl.enableVertexAttribArray(attributes['aNormal']);
			gl.vertexAttribPointer(attributes['aNormal'], 3, gl.FLOAT, false, this.nBytePerVertex, this.normalDelta)
		} else
		{
			gl.disableVertexAttribArray(attributes['aNormal']);
			gl.vertexAttrib3f(attributes['aNormal'],0,0,0)
		}		
	}
	
	if('aTexCoord' in attributes)
	{
		if(this.texCoordsDelta != 0)
		{
			gl.enableVertexAttribArray(attributes['aTexCoord']);
			gl.vertexAttribPointer(attributes['aTexCoord'], 2, gl.FLOAT, false, this.nBytePerVertex, this.texCoordsDelta)
		} else
		{
			gl.disableVertexAttribArray(attributes['aTexCoord']);
			gl.vertexAttrib2f(attributes['aTexCoord'],0,0)
		}
	}	
}

Mesh.prototype.ReDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var uniforms = Mesh.programs[idProg].uniforms;
	
	gl.useProgram(Mesh.programs[idProg]);
	gl.uniformMatrix4fv(uniforms['uModelMatrix'], false, this.modelMat);
	gl.uniform4fv(uniforms['uMaterialColor'],this.materialColor);
	gl.drawElements(gl.TRIANGLES, this.nIndices, this.use16bit ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, 0);
}

Mesh.prototype.EndDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var attributes = Mesh.programs[idProg].attributes;
	gl.disableVertexAttribArray(attributes['aVertexPosition']);
	gl.disableVertexAttribArray(attributes['aNormal']);
	gl.disableVertexAttribArray(attributes['aTexCoord']);
	gl.bindBuffer(gl.ARRAY_BUFFER, null)
}

Mesh.prototype.Draw = function(idProg)
{
	idProg = idProg || 0;
	if( Mesh.programs[idProg] == undefined ) return;
	this.PreDraw(idProg);
	this.ReDraw(idProg);
	this.EndDraw(idProg);
}
/** @constructor */
function MeshCreator()
{
	this.Begin();
	this.creating = false;
}

/** @param {boolean=} normals
  * @param {boolean=} texCoords
  */
MeshCreator.prototype.Begin = function(normals,texCoords)
{
	this.creating = true;
	this.normals = normals || false;
	this.texCoords = texCoords || false;
	this.currentNormal = [0,0,0];
	this.currentTexture = [0,0];
	this.currentPoint = [0,0,0]
	this.points = [];
	this.mappedPoints = [];
	this.triangles = [];	  
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
MeshCreator.prototype.Normal = function(x,y,z)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(this.normals)
	{
		if(x!=undefined) 
		{ 
			var v = x;
			if(y!=undefined) v = [x,y,z];
			if(checks && v.length!=3) throw "Invalid parameter";
			this.currentNormal = v;
		} 
	}
	return this.currentNormal;
}

/** @param {number|Array=} x
  * @param {number=} y
  */
MeshCreator.prototype.Texture = function(x,y)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(this.texCoords)
	{
	  if(x!=undefined) 
	  { 
		 var v = x;
		 if(y!=undefined) v = [x,y];
		 if(checks && v.length!=2) throw "Invalid parameter";
		 this.currentTexture = v;
	  } 
	}
	return this.currentTexture;
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
MeshCreator.prototype.Point = function(x,y,z)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined) v = [x,y,z];
		if(checks && v.length!=3) throw "Invalid parameter";
		this.currentPoint = v;
		
		this.AddPoint();
	} 
	return this.currentPoint;
}

function cmpDecimalArray(a,b)
{
	for(var i=0;i<a.length;i++) 
	  if(Math.abs(a[i]-b[i])>1e-3) 
		 return false; 
	return true; 
}

MeshCreator.prototype.AddPoint = function()
{
	var key = Math.round( (
				this.currentPoint[0]*this.currentPoint[0] + 
				this.currentPoint[1]*this.currentPoint[1] + 
				this.currentPoint[2]*this.currentPoint[2] ) * 1000 );
	for(var i=key-1;i<= key+1;i++)
	{
		var vals = this.mappedPoints[i] || [];
		for(var j=0;j<vals.length;j++)
		{
			var p = this.points[vals[j]];
			if( cmpDecimalArray(p.pos,this.currentPoint) && 
				cmpDecimalArray(p.nor,this.currentNormal) && 
				cmpDecimalArray(p.tex,this.currentTexture) )
			{
				this.triangles.push(vals[j]);
				return;
			}
		}
	}
	if( this.mappedPoints[key] == undefined )
	{
		this.mappedPoints[key] = [];
	}
	var idx = this.points.length;
	this.mappedPoints[key].push(idx);
	this.points.push({pos:this.currentPoint, nor:this.currentNormal, tex:this.currentTexture});
	this.triangles.push(idx);
}

/** @param {Array=} min
  * @param {Array=} max
  * @param {boolean=} reverse
  */
MeshCreator.prototype.AddBox = function(min,max,reverse)
{
	min = min || [-1,-1,-1];
	max = max || [1,1,1];
	reverse = reverse || false;
	if(checks && min.length!=3) throw "Invalid parameter";
	if(checks && max.length!=3) throw "Invalid parameter";
	var tc = this;
	function AddQuad(a,b,c,d)
	{
		tc.Texture(0,0); tc.Point(a);
		if(!reverse)
		{
			tc.Texture(1,0); tc.Point(b);
			tc.Texture(0,1); tc.Point(c);

			tc.Texture(0,1); tc.Point(c);
			tc.Texture(1,0); tc.Point(b);
		} else
		{	
			tc.Texture(0,1); tc.Point(c);
			tc.Texture(1,0); tc.Point(b);

			tc.Texture(1,0); tc.Point(b);
			tc.Texture(0,1); tc.Point(c);
		}
		tc.Texture(1,1); tc.Point(d);
	}
	var n = reverse? -1 : 1;
	this.Normal([0,n,0]);
	AddQuad([ max[0], max[1], min[2]],
			[ min[0], max[1], min[2]],
			[ max[0], max[1], max[2]],
			[ min[0], max[1], max[2]]);
	this.Normal([0,-n,0]);
	AddQuad([ min[0], min[1], min[2]],
			[ max[0], min[1], min[2]],
			[ min[0], min[1], max[2]],
			[ max[0], min[1], max[2]]);
	this.Normal([n,0,0]);
	AddQuad([ max[0], min[1], min[2]],
			[ max[0], max[1], min[2]],
			[ max[0], min[1], max[2]],
			[ max[0], max[1], max[2]]);
	this.Normal([-n,0,0]);
	AddQuad([ min[0], max[1], min[2]],
			[ min[0], min[1], min[2]],
			[ min[0], max[1], max[2]],
			[ min[0], min[1], max[2]]);
	this.Normal([0,0,n]);
	AddQuad([ min[0], max[1], max[2]],
			[ min[0], min[1], max[2]],
			[ max[0], max[1], max[2]],
			[ max[0], min[1], max[2]]);
	this.Normal([0,0,-n]);
	AddQuad([ min[0], min[1], min[2]],
			[ min[0], max[1], min[2]],
			[ max[0], min[1], min[2]],
			[ max[0], max[1], min[2]]);
}

/** @param {Array=} center
  * @param {number=} radius
  * @param {number=} nSegment
  * @param {number=} nDivision
  */
MeshCreator.prototype.AddSphere = function(center,radius,nSegment,nDivision)
{
	center = center || [0,0,0];
	radius = radius || 1;
	nSegment = nSegment || 8;
	nDivision = nDivision || 16;
	var stepA = Math.PI/nSegment;
	var stepB = Math.PI*2/nDivision;
	var a = 0;
	var cosA = [1,1];
	var sinA = [0,0];
	var cosB = [1,1];
	var sinB = [0,0];
	for(var j=0;j<nSegment;j++)
	{
		cosA[0] = cosA[1];
		sinA[0] = sinA[1];
		a+= stepA;
		cosA[1] = Math.cos( a );
		sinA[1] = Math.sin( a );
		var b = 0;
		cosB[1] = 1;
		sinB[1] = 0;
		for(var i=0;i<nDivision;i++)
		{
			cosB[0] = cosB[1];
			sinB[0] = sinB[1];
			b+= stepB;
			cosB[1] = Math.cos( b );
			sinB[1] = Math.sin( b );
			var normals = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
			var points = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
			for(var r=0;r<4;r++)
			{
				var ia = Math.floor(r/2);
				var ib = r%2;
				normals[r][0] = sinA[ia] * cosB[ib];
				normals[r][1] = cosA[ia];
				normals[r][2] = sinA[ia] * sinB[ib];
				points[r][0] = center[0] + normals[r][0] * radius;
				points[r][1] = center[1] + normals[r][1] * radius;
				points[r][2] = center[2] + normals[r][2] * radius;
			}
			if(j!=0)
			{
				this.Normal( normals[0] );
				this.Point( points[0] );
				this.Normal( normals[1] );
				this.Point( points[1] );
				this.Normal( normals[2] );
				this.Point( points[2] );
			}
			if(j!=nSegment-1)
			{
				this.Normal( normals[2] );
				this.Point( points[2] );
				this.Normal( normals[1] );
				this.Point( points[1] );
				this.Normal( normals[3] );
				this.Point( points[3] );
			}
		}
	}   
}

MeshCreator.prototype.End = function(gl,retValue) 
{
	if('gl' in gl) gl=gl['gl'];
	
	if(checks && !this.creating) throw "Invalid call: End without begin";
	this.creating = false;
	var nIgnored = (this.triangles.length%3)
	if( nIgnored != 0)
	{
		console.log("warning Mesh.End: " + nIgnored + " vertices ignored");
		this.triangles.length -= nIgnored;
	}
	retValue = retValue || new Mesh(gl);
	retValue.use16bit = this.points.length < 0xFFF0;
	retValue.nIndices = this.triangles.length ;
	retValue.nVertices = this.points.length;
	retValue.nBytePerVertex = 3;
	var delta = 3;
	if(this.normals)
	{
		retValue.nBytePerVertex += 3;
		retValue.normalDelta = delta;
		delta+=3;
	} else retValue.normalDelta = 0;
	if(this.texCoords)
	{
		retValue.nBytePerVertex += 2;
		retValue.texCoordsDelta = delta;
		delta+=2;
	} else retValue.texCoordsDelta = 0;
	
	var verticesArray = new Float32Array( retValue.nVertices * retValue.nBytePerVertex );
	for(var i=0;i<this.points.length;i++)
	{
		var v = this.points[i];
		var idxDest = i * retValue.nBytePerVertex;
		for(var j=0;j<3;j++)
			verticesArray[idxDest+j] = v.pos[j];
		if(this.normals)
		{
			for(var j=0;j<3;j++)
				verticesArray[idxDest + j + retValue.normalDelta] = v.nor[j];
		}
		if(this.texCoords)
		{
			for(var j=0;j<2;j++)
				verticesArray[idxDest + j + retValue.texCoordsDelta] = v.tex[j];
		}
	}
 	retValue.nBytePerVertex *= 4;
	retValue.normalDelta *= 4;
	retValue.texCoordsDelta *= 4;

	console.log("Created mesh with "+retValue.nVertices+" vertices and "+(retValue.nIndices/3)+" triangles");
	
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,verticesArray, gl.STATIC_DRAW);

	var iBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,iBuffer);
	if( retValue.use16bit )
	{
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Int16Array(this.triangles), gl.STATIC_DRAW);
	} else
	{
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Int32Array(this.triangles), gl.STATIC_DRAW);
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	retValue.vBuffer = vBuffer;
	retValue.iBuffer = iBuffer;
	this.points = [];
	this.mappedPoints = [];
	this.triangles = [];
	return retValue;	
}

