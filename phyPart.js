importScripts("ammo.js");

var pause = true;
var  phyBroadphase = new Ammo.btDbvtBroadphase();

// Set up the collision configuration and dispatcher
var phyCollisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
var phyDispatcher = new Ammo.btCollisionDispatcher(phyCollisionConfiguration);

// The actual physics solver
var phySolver = new Ammo.btSequentialImpulseConstraintSolver();

// The world.
var phyWorld = new Ammo.btDiscreteDynamicsWorld(phyDispatcher, phyBroadphase, phySolver, phyCollisionConfiguration);
phyWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));
// ground
function StaticPlane(n,d)
{
	var plane = new Ammo.btStaticPlaneShape(n,d);
	var groundRigidBodyCI = new Ammo.btRigidBodyConstructionInfo(0,
				  new Ammo.btDefaultMotionState(new Ammo.btTransform(new Ammo.btQuaternion(0, 0, 0, 1), new Ammo.btVector3(0, 0, 0))), 
					plane, new Ammo.btVector3(0, 0, 0));
	var phyShape= new Ammo.btRigidBody(groundRigidBodyCI);
	console.log("staticPlane:"+phyShape.ptr)
	return phyShape;
}

phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3(0,0, 1),-10),1,3);
phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3(0,0,-1),-10),1,3);
phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3( 1,0,0),-10),1,3);
phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3(-1,0,0),-10),1,3);
phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3(0, 1,0), -1),1,3);
phyWorld.addRigidBody(StaticPlane(new Ammo.btVector3(0,-1,0),-10),1,3);

function RB(pos, shape, mass)
{
		var motionState =
			new Ammo.btDefaultMotionState(new Ammo.btTransform(new Ammo.btQuaternion(0, 0, 0, 1), pos));
	var inertia = new Ammo.btVector3(0, 0, 0);
	shape.calculateLocalInertia(mass, inertia);
	var info= new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia);
	return new Ammo.btRigidBody(info);
}

function SphereRB(pos, radius, mass)
{
	var phyObj = RB(pos,new Ammo.btSphereShape(radius),mass);
	console.log("sphere:"+phyObj.ptr)
	return phyObj;
}

var sphRB = SphereRB(new Ammo.btVector3(3,4,5),1,1);
phyWorld.addRigidBody(sphRB,2,3);
//sphRB.applyCentralForce(new Ammo.btVector3(-120+20*Math.random(),60*Math.random(),-300+20*Math.random()))
sphRB.applyCentralForce(new Ammo.btVector3(-240+200*Math.random(),-50+100*Math.random(),-300+20*Math.random()))
function CubeRB(pos, size, mass)
{
	var phyObj = RB(pos,new Ammo.btBoxShape(size),mass);
	console.log("cube:"+phyObj.ptr)
	return phyObj;
}
var size = new Ammo.btVector3(1,1,1);
var cubes= [];
var x = [-3.75,-1.25,1.25,3.75, -2.5,0,2.5, -1.25,1.25, 0];
var y = [ 0, 0,0,0,  2,2,2,  4,4, 6];
for(var i=0;i<10;i++)
{
	var pos = new Ammo.btVector3(x[i]+Math.random()*0.2-0.1,y[i],Math.random()*0.2-0.1);
	var cbRB = CubeRB(pos,size,1);
	phyWorld.addRigidBody(cbRB,2,3);
	cubes.push(cbRB);
}

var trans = new Ammo.btTransform(); 
var last = Date.now();
//var maxColl = 0;
var myCollisions = {};
var nSkip = 2;
var particles = [[3,4,6,1,1,1]];

var mouseDown = false;
var exX,exY;
var selected = -1;
var join,collisionTime;

function getMatrix(transform)
{
	var v = trans.getOrigin();
	var quat = trans.getRotation();
	var ss= quat.w() * quat.w() ;
	var sx= quat.w() * quat.x(); sx+=sx;
	var sy= quat.w() * quat.y(); sy+=sy;
	var sz= quat.w() * quat.z(); sz+=sz;
	var xx= quat.x() * quat.x();
	var xy= quat.x() * quat.y(); xy+=xy;
	var xz= quat.x() * quat.z(); xz+=xz;
	var yy= quat.y() * quat.y();
	var yz= quat.y() * quat.z(); yz+=yz;
	var zz= quat.z() * quat.z();
	var mat=[]; mat.length=16;
	mat[0]=ss+xx-yy-zz; 
	mat[1]=   xy+sz   ; 
	mat[2]=   xz-sy   ; 
	mat[3]=0;
	mat[4]=   xy-sz   ; 
	mat[5]=ss-xx+yy-zz; 
	mat[6]=   yz+sx   ; 
	mat[7]=0;
	mat[8]=   xz+sy   ;
	mat[9]=   yz-sx   ;
	mat[10]=ss-xx-yy+zz;
	mat[11]=0;
	mat[12] = v.x();
	mat[13] = v.y();
	mat[14] = v.z(); 
	mat[15] = 1; 
	return mat;
}

function invert(mat)
{
	var r = []; r.length=16;
	r[ 0] =  mat[ 5]*mat[10]*mat[15] - mat[ 5]*mat[11]*mat[14] - mat[ 9]*mat[ 6]*mat[15] + mat[ 9]*mat[ 7]*mat[14] + mat[13]*mat[ 6]*mat[11] - mat[13]*mat[ 7]*mat[10];
	r[ 1] = -mat[ 1]*mat[10]*mat[15] + mat[ 1]*mat[11]*mat[14] + mat[ 9]*mat[ 2]*mat[15] - mat[ 9]*mat[ 3]*mat[14] - mat[13]*mat[ 2]*mat[11] + mat[13]*mat[ 3]*mat[10];
	r[ 2] =  mat[ 1]*mat[ 6]*mat[15] - mat[ 1]*mat[ 7]*mat[14] - mat[ 5]*mat[ 2]*mat[15] + mat[ 5]*mat[ 3]*mat[14] + mat[13]*mat[ 2]*mat[ 7] - mat[13]*mat[ 3]*mat[ 6];
	r[ 3] = -mat[ 1]*mat[ 6]*mat[11] + mat[ 1]*mat[ 7]*mat[10] + mat[ 5]*mat[ 2]*mat[11] - mat[ 5]*mat[ 3]*mat[10] - mat[ 9]*mat[ 2]*mat[ 7] + mat[ 9]*mat[ 3]*mat[ 6];
	r[ 4] = -mat[ 4]*mat[10]*mat[15] + mat[ 4]*mat[11]*mat[14] + mat[ 8]*mat[ 6]*mat[15] - mat[ 8]*mat[ 7]*mat[14] - mat[12]*mat[ 6]*mat[11] + mat[12]*mat[ 7]*mat[10];
	r[ 5] =  mat[ 0]*mat[10]*mat[15] - mat[ 0]*mat[11]*mat[14] - mat[ 8]*mat[ 2]*mat[15] + mat[ 8]*mat[ 3]*mat[14] + mat[12]*mat[ 2]*mat[11] - mat[12]*mat[ 3]*mat[10];
	r[ 6] = -mat[ 0]*mat[ 6]*mat[15] + mat[ 0]*mat[ 7]*mat[14] + mat[ 4]*mat[ 2]*mat[15] - mat[ 4]*mat[ 3]*mat[14] - mat[12]*mat[ 2]*mat[ 7] + mat[12]*mat[ 3]*mat[ 6];
	r[ 7] =  mat[ 0]*mat[ 6]*mat[11] - mat[ 0]*mat[ 7]*mat[10] - mat[ 4]*mat[ 2]*mat[11] + mat[ 4]*mat[ 3]*mat[10] + mat[ 8]*mat[ 2]*mat[ 7] - mat[ 8]*mat[ 3]*mat[ 6];
	r[ 8] =  mat[ 4]*mat[ 9]*mat[15] - mat[ 4]*mat[11]*mat[13] - mat[ 8]*mat[ 5]*mat[15] + mat[ 8]*mat[ 7]*mat[13] + mat[12]*mat[ 5]*mat[11] - mat[12]*mat[ 7]*mat[ 9];
	r[ 9] = -mat[ 0]*mat[ 9]*mat[15] + mat[ 0]*mat[11]*mat[13] + mat[ 8]*mat[ 1]*mat[15] - mat[ 8]*mat[ 3]*mat[13] - mat[12]*mat[ 1]*mat[11] + mat[12]*mat[ 3]*mat[ 9];
	r[10] =  mat[ 0]*mat[ 5]*mat[15] - mat[ 0]*mat[ 7]*mat[13] - mat[ 4]*mat[ 1]*mat[15] + mat[ 4]*mat[ 3]*mat[13] + mat[12]*mat[ 1]*mat[ 7] - mat[12]*mat[ 3]*mat[ 5];
	r[11] = -mat[ 0]*mat[ 5]*mat[11] + mat[ 0]*mat[ 7]*mat[ 9] + mat[ 4]*mat[ 1]*mat[11] - mat[ 4]*mat[ 3]*mat[ 9] - mat[ 8]*mat[ 1]*mat[ 7] + mat[ 8]*mat[ 3]*mat[ 5];
	r[12] = -mat[ 4]*mat[ 9]*mat[14] + mat[ 4]*mat[10]*mat[13] + mat[ 8]*mat[ 5]*mat[14] - mat[ 8]*mat[ 6]*mat[13] - mat[12]*mat[ 5]*mat[10] + mat[12]*mat[ 6]*mat[ 9];
	r[13] =  mat[ 0]*mat[ 9]*mat[14] - mat[ 0]*mat[10]*mat[13] - mat[ 8]*mat[ 1]*mat[14] + mat[ 8]*mat[ 2]*mat[13] + mat[12]*mat[ 1]*mat[10] - mat[12]*mat[ 2]*mat[ 9];
	r[14] = -mat[ 0]*mat[ 5]*mat[14] + mat[ 0]*mat[ 6]*mat[13] + mat[ 4]*mat[ 1]*mat[14] - mat[ 4]*mat[ 2]*mat[13] - mat[12]*mat[ 1]*mat[ 6] + mat[12]*mat[ 2]*mat[ 5];
	r[15] =  mat[ 0]*mat[ 5]*mat[10] - mat[ 0]*mat[ 6]*mat[ 9] - mat[ 4]*mat[ 1]*mat[10] + mat[ 4]*mat[ 2]*mat[ 9] + mat[ 8]*mat[ 1]*mat[ 6] - mat[ 8]*mat[ 2]*mat[ 5];
	var det = mat[0]*r[0]+mat[1]*r[4]+mat[2]*r[8]+mat[3]*r[12];
	if(det!=0)
	{
		for(var i = 0; i<16; i++)
			r[i] /= det;
	}
	return r;
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

function ArrFromVector3(v)
{
	return [v.x(),v.y(),v.z()];
}

function Vector3FromArr(a)
{
	return new Ammo.btVector3(a[0],a[1],a[2])
}

function getLocal(obj,point)
{
	
}

function SetSelected(e,createJoin)
{
	selected = -1;
	var rayFrom = Vector3FromArr(e.data[4]);
	var rayTo = Vector3FromArr(e.data[5]);
	var rayCallback = new Ammo.ClosestRayResultCallback(rayFrom,rayTo);
	rayCallback.set_m_collisionFilterMask(2);
	phyWorld.rayTest(rayFrom, rayTo, rayCallback);
	if (rayCallback.hasHit())
	{
		var obj = rayCallback.get_m_collisionObject();
		var realObj = undefined;
		for(var i=0;i<10;i++)
		{
			if( obj.ptr == cubes[i].ptr)
			{
				selected = i;
				realObj = cubes[i];
				break;
			}
		}
		if( obj.ptr == sphRB.ptr )
		{
			realObj = sphRB;
			selected = 10;
		}
		if(createJoin && realObj)
		{
			if(join)
			{
				phyWorld.removeConstraint(join);
			}
			var pWorld = ArrFromVector3(rayCallback.get_m_hitPointWorld());
			pWorld.push(1);
			realObj.getMotionState().getWorldTransform(trans);
			var mat = getMatrix(trans);
			var inv = invert(mat);
			var t = Transform(inv,pWorld);
			join = new Ammo.btPoint2PointConstraint(obj,Vector3FromArr(t));
			phyWorld.addConstraint(join);
			var delta = [Math.abs(e.data[5][0]-e.data[4][0]),
							Math.abs(e.data[5][1]-e.data[4][1]),
							Math.abs(e.data[5][2]-e.data[4][2])];
			if( delta[0]>delta[1] )
				if( delta[0]>delta[2])
					collisionTime = (pWorld[0]-e.data[4][0])/(e.data[5][0]-e.data[4][0]);
				else
					collisionTime = (pWorld[2]-e.data[4][2])/(e.data[5][2]-e.data[4][2]);
			else
				if( delta[1]>delta[2])
					collisionTime = (pWorld[1]-e.data[4][1])/(e.data[5][1]-e.data[4][1]);
				else
					collisionTime = (pWorld[2]-e.data[4][2])/(e.data[5][2]-e.data[4][2]);
				
			
		}
	}
}

function UpdateJoin(e)
{
	if(!join) return;
	var pWorld = []; pWorld.length=3;
	for(var i=0;i<3;i++)
	{
		pWorld[i] = e.data[4][i] + (e.data[5][i]-e.data[4][i]) * collisionTime;
	}
	//pWorld.push(1);
	//var inv = invert(getMatrix(cubes[selected].getWorldTransform()));
	//var t = Transform(inv,pWorld);
	join.setPivotB(Vector3FromArr(pWorld));
	if( selected<10)
		cubes[selected].activate();
	else
		sphRB.activate();	
}

onmessage =function(e)
{
	switch(e.data[0])
	{
		case "mousedown":
			mouseDown = true; 
			exX = e.data[1];
			exY = e.data[2];
			SetSelected(e,true)
			break;
		case "mouseup":
			mouseDown = false; 
			selected = -1;
			if(join)
			{
				phyWorld.removeConstraint(join);
				join = undefined;
			}
			break;
		case "mousemove":
			var deltax = e.data[1]-exX;
			var deltay = e.data[2]-exY;
			exX =e.data[1];
			exY =e.data[2];
			if( mouseDown )
			{
				if(selected==-1) 
					postMessage(["camUpdate",deltax,deltay,0]);
				else
				{
					UpdateJoin(e)	
				}
			}
			else
			{
				SetSelected(e);
			}
			break;
		case "wheel":
			if( mouseDown )
			{
				if(e.data[3]>0) collisionTime+=0.01;
				if(e.data[3]<0) collisionTime-=0.01;
				UpdateJoin(e)	
			}
			else
				postMessage(["camUpdate",0,0,e.data[3]]);
			break;
	}
}

function step()
{
	var now = Date.now();
	var dt = now - last;
	if( dt==0 ) dt = 1/60.;
	phyWorld.stepSimulation(dt, 2);
	last = now;
	
	var data = ["phyUpdate"];
	sphRB.getMotionState().getWorldTransform(trans);
	var p = trans.getOrigin();
	var v = sphRB.getLinearVelocity();
	data.push([p.x(),p.y(),p.z(),v.x(),v.y(),v.z(),selected==10]);
	for(var i=0;i<10;i++)
	{
		cubes[i].getMotionState().getWorldTransform(trans);
		v = trans.getOrigin();
		data.push([v.x(),v.y(),v.z(), selected == i]);
		o = trans.getRotation();
		data.push([o.x(),o.y(),o.z(),o.w()]);		
	}
	
	var collisions = [];
	var numManifolds = phyDispatcher.getNumManifolds();
	var newCollisions = {}
	for (var i=0; i<numManifolds; i++)
	{
		var contactManifold = phyDispatcher.getManifoldByIndexInternal(i);
		var obA = contactManifold.getBody0();
		var obB = contactManifold.getBody1();
	
		/* Check all contacts points */
		var numContacts = contactManifold.getNumContacts();
		var key = obA.ptr + '' + obB.ptr;
		var st = 0;
		if( myCollisions[key] != undefined )
			st = myCollisions[key];
		for (var j=st;j<numContacts;j++)
		{
			var pt = contactManifold.getContactPoint(j);
			var pulse = pt.getAppliedImpulse();
			//if(pulse>maxColl)
			//{
			//	console.log(pulse);
			//	maxColl = pulse;
			//}
			if (pt.getDistance()<0.0 && pulse>0.1)
			{
				var ptA = pt.getPositionWorldOnA();
				var ptB = pt.getPositionWorldOnB();
				var rt = [];
				rt[0] = (ptA.x()+ptB.x())/2;
				rt[1] = (ptA.y()+ptB.y())/2;
				rt[2] = (ptA.z()+ptB.z())/2;
				rt[3] = pulse;
				collisions.push(rt);
			}
		}
		newCollisions[key] = numContacts;
	}
	if(nSkip>0)
	{
		data.push([]);
		nSkip--;
	}
	else
		data.push(collisions);
	myCollisions = newCollisions;
	justStart = false;

	for(var i=0;i<particles.length;i++)
	{
		var p = particles[i];
		var np = [p[0]+p[3]*dt,p[1]+p[4]*dt,p[2]+p[5]*dt];
		//phyWorld.rayTest();
	}
	data.push(particles);
	postMessage(data);
}
setInterval(step, 1000/30);
