import {createHash} from 'node:crypto';
import type {Project} from '../model.js';
import type {TopologyDiagnosticsResponse,TopologyWarningCode} from '../../packages/contracts/alva/topology-diagnostics.js';
import {analyzeTopology} from './diagnostics.js';
import {firstTopologyRepairIssue} from './repair.js';

/** Same current source and analysis for the UI and both stages' read-only tools. */
export function topologyDiagnosticsFor(p:Project):TopologyDiagnosticsResponse{
 const scene=p.candidate||p.scene;
 return {projectId:p.id,revision:p.revision,source:p.candidate?'candidate':p.scene?'scene':'none',sceneFingerprint:scene?createHash('sha256').update(JSON.stringify(scene)).digest('hex'):null,analysis:analyzeTopology(scene)};
}
const guidance:Record<TopologyWarningCode,string>={
 internal_void:'对照原图确认该区域是房间、走廊还是管井，再调整房间轮廓；不要凭告警自动填满。',
 unreasonable_skew:'对照原图核对墙端点和方向；真实斜墙可以保留，不能仅凭倾斜告警拉直。',
 isolated_component:'核对所列墙段与主体之间的断口，以及门窗关联墙；先确认应连接的位置。',
 invalid_opening:'核对门窗关联墙、沿墙位置、宽度和高度，确保开口位于墙段及墙高范围内。',
 open_boundary:'核对所列墙端点坐标，确认这里是缺墙、应连接的断口还是有意保留的开口。',
 invalid_geometry:'核对所列墙或房间坐标，修正零长度墙、自交或退化轮廓。',
};
export function inspectProjectTopology(p:Project){
 const report=topologyDiagnosticsFor(p),scene=p.candidate||p.scene,issue=scene?firstTopologyRepairIssue(scene):null;
 return {...report,issue,repair:{editable:!!p.candidate&&!p.confirmedTopology,requiresReopenConfirmation:!!p.confirmedTopology,
  nextStep:p.confirmedTopology?'先查看和讨论；修改前调用 request_topology_reopen，由用户确认清除依赖旧拓扑的后续设计。':p.candidate?'可对照原图修复并校准，也可调用 request_living_entry，由用户确认保留问题继续生活设计。':'请先上传并识别户型。',
  issueOptions:issue?.options||[],guidance:report.analysis.issues.map(item=>({issueId:item.id,code:item.code,message:guidance[item.code]})),
  toolPolicy:'生活设计阶段只能读取诊断；需要修改时先切回户型导入。repair_topology 只接受 issue.id 与其启用 option.id，不接受 analysis.issues 的告警 ID。没有自动修复选项时，先让用户确认修复意图，再用 edit_topology 或 draw_wall；不得编造尺寸。'},
  interpretation:report.analysis.status==='complete'?'未发现告警也不代表结构安全或原图一致性已通过。':'检查未完整完成，不能声称没有问题；请按 analysis.checks 与 notes 解释检查限制。'};
}
