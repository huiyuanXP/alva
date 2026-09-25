import test from 'node:test';
import assert from 'node:assert/strict';
import {computeBuildingBounds,overviewPose,roomPose} from '../web/src/scene/building-camera.js';
import type {SceneData} from '../api/model.js';
import type {BuildingSceneData} from '../api/building/types.js';

const building:BuildingSceneData={units:'meters',topologyVersion:1,topologyFingerprint:'a'.repeat(64),components:[
 {id:'floor-1',kind:'floor',topologyId:'room-1',position:{x:2,y:0,z:2},size:{x:4,y:.1,z:4},rotation:0,material:'floor',color:'#c8b99d'},
 {id:'wall-1',kind:'wall',topologyId:'wall-1',position:{x:2,y:1.5,z:0},size:{x:4,y:3,z:.2},rotation:0,material:'plaster',color:'#d7d5ca'},
 {id:'wall-2',kind:'wall',topologyId:'wall-2',position:{x:4,y:1.5,z:2},size:{x:4,y:3,z:.2},rotation:Math.PI/2,material:'plaster',color:'#d7d5ca'}
],camera:{position:{x:8,y:7,z:8},target:{x:2,y:1,z:2}}};

const scene:SceneData={walls:[
 {id:'wall-1',a:{x:0,y:0},b:{x:4,y:0},thickness:.2,height:3,structural:'unknown',evidence:[]},
 {id:'wall-2',a:{x:4,y:0},b:{x:4,y:4},thickness:.2,height:3,structural:'unknown',evidence:[]},
 {id:'wall-3',a:{x:4,y:4},b:{x:0,y:4},thickness:.2,height:3,structural:'unknown',evidence:[]},
 {id:'wall-4',a:{x:0,y:4},b:{x:0,y:0},thickness:.2,height:3,structural:'unknown',evidence:[]}
],rooms:[{id:'room-1',name:'客厅',purpose:'',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'test'}};

test('ALVA-013 uses all rendered components for automatic overview bounds',()=>{
 const bounds=computeBuildingBounds(building);assert.deepEqual(bounds.min,{x:0,y:-.05,z:-.1});assert.equal(bounds.max.x,4.1);assert.equal(bounds.max.z,4);
 const pose=overviewPose(building,1.6);assert.ok(pose.position.x>pose.target.x);assert.ok(pose.position.y>pose.target.y);assert.ok(pose.position.z>pose.target.z);
});

test('ALVA-013 room view chooses an interior point away from wall centerlines',()=>{
 const pose=roomPose(scene,'room-1');assert.ok(pose);assert.ok(Number.isFinite(pose!.position.x));assert.ok(pose!.position.y>1);
 assert.ok(pose!.position.x>.2&&pose!.position.x<3.8);assert.ok(pose!.position.z>.2&&pose!.position.z<3.8);
});

test('ALVA-013 room selection is data-driven and missing rooms do not invent a camera',()=>{
 assert.equal(roomPose(scene,'missing'),undefined);const shifted={...scene,rooms:[{...scene.rooms[0],id:'room-shifted',polygon:scene.rooms[0].polygon.map(point=>({x:point.x+10,y:point.y+4}))}]};
 const pose=roomPose(shifted,'room-shifted');assert.ok(pose);assert.ok(pose!.position.x>9&&pose!.position.z>3);
});
