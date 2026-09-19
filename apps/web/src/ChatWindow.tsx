import React, {createContext,useContext,useEffect, useRef, useState} from 'react';
import {AssistantRuntimeProvider, useExternalStoreRuntime, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, ActionBarPrimitive, type ThreadMessageLike} from '@assistant-ui/react';
import type {ProjectData, ChatMessage} from '../../../packages/contracts/index.js';
import {intakeCatalogue, type IntakeQuestion} from '../../../packages/contracts/intake.js';
import type {Commit} from './RequirementsPanel.js';
import {api} from './api.js';
import {IntakeCard} from './IntakeCard.js';
import {ComposerMedia} from './ComposerMedia.js';
import {ChatIcon, ModelPicker} from './ChatControls.js';
import {typeEyebrow, typeSection} from './components/shared/type.js';
import './question-card.css';
import './intake-v2.css';
import './question-deck.css';
import {makeAssistantToolUI} from '@assistant-ui/react';

type QuestionContextValue={questions:IntakeQuestion[];project:ProjectData;roomId:string;commit:Commit;keyboard:(v:boolean)=>void;done:(id:string)=>void;dirty:(id:string,value:boolean)=>void};
const QuestionContext=createContext<QuestionContextValue|null>(null);
const AgentQuestionTool=makeAssistantToolUI<{questionId:string},unknown>({toolName:'ask_intake_question',render:({args})=>{
  const ctx=useContext(QuestionContext);const q=ctx?.questions.find(q=>q.id===args.questionId);if(!ctx||!q)return null;
  return <div className="agent-intake" aria-label="顾问邀请你确认"><p>我想先和你确认一下：{q.text}</p><p>{q.recommendation.basis==='evidence'?'根据你说的情况，我建议先考虑：':'我们可以先比较这个方向：'}{q.recommendation.label}。{q.recommendation.rationale} 你也可以选择其他方向，或直接补充自己的想法。</p><IntakeCard toolOptions question={q} project={ctx.project} roomId={ctx.roomId} answer={ctx.project.intake_answers?.find(a=>a.question_id===q.questionnaire_id&&a.room_id===q.room_id)} commit={ctx.commit} keyboard={ctx.keyboard} onDirty={ctx.dirty} onDone={()=>ctx.done(q.id)}/></div>;
}});

function UserMessage() {
  return <MessagePrimitive.Root className="chat-message user"><span className="message-role">你</span><MessagePrimitive.Parts/></MessagePrimitive.Root>;
}
function AssistantMessage() {
  return <MessagePrimitive.Root className="chat-message assistant"><span className="message-role">空间顾问</span><MessagePrimitive.Parts/><ActionBarPrimitive.Root className="message-actions"><ActionBarPrimitive.Copy aria-label="复制回复" title="复制回复"><ChatIcon name="copy"/><span>复制</span></ActionBarPrimitive.Copy></ActionBarPrimitive.Root></MessagePrimitive.Root>;
}
type Props = {
  project:ProjectData; roomId:string; visible:boolean; docked?:boolean; paperPopup?:boolean; onClose:()=>void;
  onSend:(text:string,room:string,attachments?:string[],modelId?:string)=>Promise<void>;
  onCancel:(runId:string)=>Promise<void>; keyboard:(v:boolean)=>void; toolStatus:string;
  onError:(text:string)=>void; commit:Commit; onQuestionnaire:()=>void; onDelivery:()=>void;
};
export function ChatWindow({project,roomId,visible,docked=false,paperPopup=false,onClose,onSend,onCancel,keyboard,toolStatus,onError,commit,onQuestionnaire,onDelivery}:Props) {
  const messages=project.messages.filter(m=>m.room_id===roomId), running=messages.find(m=>m.status==='running'), room=project.rooms.find(r=>r.id===roomId)!;
  const [questions,setQuestions]=useState<IntakeQuestion[]>([]), [selected,setSelected]=useState<string[]>([]), [mediaWorking,setMediaWorking]=useState(false), [questionError,setQuestionError]=useState(''), [expanded,setExpanded]=useState(false), [modelId,setModelId]=useState(''), [hasText,setHasText]=useState(false);
  const dirty=useRef(new Set<string>()), sendBusy=useRef(false), composing=useRef(false), input=useRef<HTMLTextAreaElement>(null), selection=useRef(selected), latestModel=useRef(modelId);
  selection.current=selected; latestModel.current=modelId;
  const chooseFiles=(ids:string[])=>{selection.current=ids;setSelected(ids);};
  const runtime=useExternalStoreRuntime<ChatMessage>({
    messages, isRunning:!!running,
    convertMessage:(m):ThreadMessageLike=>({id:m.id,role:m.role,createdAt:new Date(m.created_at),content:[
      {type:'text',text:(m.content||(m.status==='running'?'正在读取已有需求…':''))+(m.attachment_ids?.length?'\n\n本轮参考：'+m.attachment_ids.map(id=>project.attachments?.find(a=>a.id===id)?.name??'语音或参考资料').join('、'):'')},
      ...(paperPopup&&m.role==='assistant'?questions.flatMap(q=>{
        const proposal=project.intake_questions?.find(p=>p.question.id===q.id&&p.run_id===m.run_id&&p.brief_version===project.brief_version);
        return proposal?[{type:'tool-call' as const,toolName:'ask_intake_question',toolCallId:proposal.id,args:{questionId:q.id},argsText:JSON.stringify({questionId:q.id})}]:[];
      }):[])
    ],...(m.role==='assistant'?{status:m.status==='running'?{type:'running' as const}:{type:'complete' as const,reason:'stop' as const}}:{})}),
    onNew:async message=>{
      const text=message.content.filter(c=>c.type==='text').map(c=>c.type==='text'?c.text:'').join('\n'), attachmentIds=[...selection.current];
      if(sendBusy.current||mediaWorking||running){runtime.thread.composer.setText(text);setHasText(!!text.trim());throw Error('请先完成本轮回复或附件处理；你的输入已保留。');}
      sendBusy.current=true;
      try {await onSend(text,roomId,attachmentIds,latestModel.current||undefined);chooseFiles(selection.current.filter(id=>!attachmentIds.includes(id)));setHasText(!!runtime.thread.composer.getState().text.trim());}
      catch(e){const newer=runtime.thread.composer.getState().text;const restored=newer.trim()&&newer!==text?`${text}\n\n${newer}`:text;runtime.thread.composer.setText(restored);setHasText(!!restored.trim());onError((e as Error).message);}
      finally{sendBusy.current=false;}
    },
    onCancel:async()=>{if(running)await onCancel(running.run_id);},
  });
  const refreshQuestions=()=>{
    let active=true;
    void api<{next:IntakeQuestion[]}>(`/api/projects/${project.id}/intake?room_id=${roomId}`).then(r=>{if(active){setQuestions(previous=>[...previous.filter(q=>dirty.current.has(q.id)),...r.next.filter(q=>!dirty.current.has(q.id))].slice(0,2));setQuestionError('');}}).catch(e=>{if(active)setQuestionError((e as Error).message);});
    return()=>{active=false;};
  };
  useEffect(refreshQuestions,[project.id,project.version,roomId]);
  const send=()=>{
    if(running||mediaWorking||sendBusy.current||composing.current)return;
    const text=runtime.thread.composer.getState().text.trim();
    if(!text&&selection.current.length)runtime.thread.composer.setText('请结合本轮引用的参考资料，帮我整理与当前房间有关的需求；不确定的内容请作为候选供我确认。');
    if(text||selection.current.length)runtime.thread.composer.send();else input.current?.focus();
  };
  const confirmed=(project.intake_answers??[]).filter(a=>(a.room_id===null||a.room_id===roomId)&&a.confirmation_state!=='pending').slice(-3);
  return <section className={`chat-window chat-v2 chat-design${expanded?' chat-expanded':''}${docked?' chat-docked':''}${paperPopup?' paper-chat-popup':''}`} hidden={!visible} aria-label={`${room.name}咨询聊天`}>
    <QuestionContext.Provider value={{questions,project,roomId,commit,keyboard,dirty:(id,value)=>{if(value)dirty.current.add(id);else dirty.current.delete(id);},done:id=>{dirty.current.delete(id);setQuestions(previous=>previous.filter(q=>q.id!==id));}}}>
    <AssistantRuntimeProvider runtime={runtime}>
      {paperPopup&&<AgentQuestionTool/>}
      <div className="chat-header"><div><span className={typeEyebrow}>consultation / {room.name}</span><strong>把家的想法聊清楚。</strong></div>{!docked&&<button type="button" className="chat-expand" aria-label={expanded?'缩小聊天':'展开聊天'} onClick={()=>setExpanded(v=>!v)}><ChatIcon name="expand"/></button>}<button type="button" className="icon-button chat-dismiss" aria-label="收起聊天" onClick={()=>{keyboard(false);onClose();}}><ChatIcon name="close"/></button></div>
      <div className="chat-shortcuts"><button type="button" onClick={onQuestionnaire}>完整问卷 · 60题</button><button type="button" onClick={onDelivery}>交付清单</button><span>一次确认一个选择</span></div>
      <ThreadPrimitive.Root className="chat-thread">
        <ThreadPrimitive.Viewport className="chat-viewport" autoScroll={messages.length>0&&dirty.current.size===0} scrollToBottomOnInitialize={messages.length>0}>
          <ThreadPrimitive.Empty><div className="chat-welcome"><span className={typeEyebrow}>先从生活开始</span><h3 className={typeSection}>你希望在这里，<br/>过怎样的一天？</h3><p>说说日常、期待，或者一件不想妥协的小事。也可以用下方的 + 添加照片和户型资料。</p><small>我会提供有依据的建议和替代选择。是否采用，始终由你决定。</small></div></ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{UserMessage,AssistantMessage}}/>
          {confirmed.length>0&&<details className="answer-receipts" aria-label="已确认的问卷回答"><summary className={typeEyebrow}>已记录的选择（{confirmed.length}）</summary>{confirmed.map(a=><div key={`${a.question_id}-${a.room_id}`}><strong>{intakeCatalogue.find(q=>q.id===a.question_id)?.question??a.question_id}</strong><p>{a.answer_text||({unknown:'暂不确定',skipped:'已跳过',not_applicable:'不适用'} as Record<string,string>)[a.answer_state]}</p></div>)}<button type="button" onClick={onQuestionnaire}>查看或修改已记录回答</button></details>}
          {!paperPopup&&<><div className="question-cards question-deck inline-questions" aria-label="当前关键选择">{questions.map((q,index)=><details key={q.id} className="question-fold" open={!docked&&q.generation==='agent'&&index===0}><summary><span className={typeEyebrow}>{q.questionnaire_id} / 待你确认</span><strong>{q.text}</strong><span>{q.recommendation.basis==='evidence'?'推荐方向':'比较起点'}：{q.recommendation.label}</span><small>展开选择或自由填写</small></summary><IntakeCard question={q} project={project} roomId={roomId} answer={project.intake_answers?.find(a=>a.question_id===q.questionnaire_id&&a.room_id===q.room_id)} commit={commit} keyboard={keyboard} onDirty={(id,value)=>{if(value)dirty.current.add(id);else dirty.current.delete(id);}} onDone={()=>{dirty.current.delete(q.id);setQuestions(previous=>previous.filter(x=>x.id!==q.id));}}/></details>)}{questionError&&<p role="status">追问暂未加载，聊天和完整问卷仍可使用。<button type="button" onClick={()=>refreshQuestions()}>重试追问</button></p>}</div></>}
        </ThreadPrimitive.Viewport>
        {messages.length>0&&<ThreadPrimitive.ScrollToBottom className="thread-scroll-bottom" aria-label="回到最新消息">↓ 最新消息</ThreadPrimitive.ScrollToBottom>}
        {running&&<div className="chat-tool-status" role="status"><span className="live-dot"/><span>{toolStatus||'正在结合资料整理建议…'}</span></div>}
        <ComposerPrimitive.Root className="chat-composer" onKeyDownCapture={e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target===input.current&&!matchMedia('(pointer: coarse) and (not (any-pointer: fine))').matches){if(composing.current||e.nativeEvent.isComposing||e.keyCode===229)return;e.preventDefault();e.stopPropagation();send();}}}>
          <ComposerMedia project={project} roomId={roomId} visible={visible} commit={commit} selected={selected} onSelection={chooseFiles} keyboard={keyboard} onWorking={setMediaWorking} modelId={modelId} modelPicker={<ModelPicker value={modelId} onChange={setModelId} disabled={!!running||sendBusy.current}/>} onDictation={(text,id)=>{chooseFiles([...new Set([...selection.current,id])]);const old=runtime.thread.composer.getState().text;runtime.thread.composer.setText(old?`${old}\n${text}`:text);setHasText(true);input.current?.focus();}} sendButton={running?<button type="button" className="composer-send" aria-label="停止本轮" title="停止生成，保留已有内容" onClick={()=>void onCancel(running.run_id).catch(e=>onError(e.message))}><ChatIcon name="stop"/></button>:<button type="button" className="composer-send" aria-label="发送咨询消息" title="发送咨询消息" disabled={mediaWorking||(!hasText&&!selected.length)} onClick={send}><ChatIcon name="up"/></button>}>
            <ComposerPrimitive.Input ref={input} aria-label="咨询消息" placeholder={`聊聊${room.name}，或添加参考资料…`} rows={2} submitMode="none" cancelOnEscape={false} addAttachmentOnPaste={false} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onChange={e=>setHasText(!!e.target.value.trim())} onFocus={()=>keyboard(true)} onBlur={()=>keyboard(false)}/>
          </ComposerMedia>
        </ComposerPrimitive.Root>
        <p className="composer-footnote">语音先转成文字。建议不会自动写入正式方案。</p>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
    </QuestionContext.Provider>
  </section>;
}
