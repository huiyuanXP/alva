import {createTopologyVersion} from '../../../api/topology/calibration.js';
import type {Project} from '../../../api/model.js';
import {snapshotScene} from './snapshot.js';

/** Synthetic prerequisite for living-tool regression; never a model acceptance result. */
export function seedLivingStage(p:Project){
 p.scene??=snapshotScene();
 const scene=p.scene,wall=scene.walls[0];
 scene.calibration??={wallId:wall.id,length:Math.hypot(wall.b.x-wall.a.x,wall.b.y-wall.a.y),source:'合成生活阶段测试尺寸',confirmed:true};
 const topology=createTopologyVersion(p,scene);p.confirmedTopology=topology;p.topologyVersions=[topology];
 p.confirmedBuilding={units:'meters',topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,camera:{position:{x:9,y:10,z:9},target:{x:2,y:0,z:2}},components:[
  ...scene.rooms.map(room=>{const xs=room.polygon.map(p=>p.x),ys=room.polygon.map(p=>p.y);return {id:`floor-${room.id}`,kind:'floor' as const,topologyId:room.id,position:{x:(Math.min(...xs)+Math.max(...xs))/2,y:0,z:(Math.min(...ys)+Math.max(...ys))/2},size:{x:Math.max(...xs)-Math.min(...xs),y:.08,z:Math.max(...ys)-Math.min(...ys)},rotation:0,material:'floor' as const,color:'#e5dfcf'}}),
  ...scene.walls.map(w=>({id:`wall-${w.id}`,kind:'wall' as const,topologyId:w.id,position:{x:(w.a.x+w.b.x)/2,y:w.height/2,z:(w.a.y+w.b.y)/2},size:{x:Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y),y:w.height,z:w.thickness},rotation:Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x),material:'plaster' as const,color:'#ccccbb'}))
 ]};
 p.buildingState={status:'confirmed',attempts:1,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,updatedAt:new Date().toISOString()};
}
