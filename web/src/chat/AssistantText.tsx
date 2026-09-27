import React from 'react';
import {useMessagePartText} from '@assistant-ui/react';

// Render the short, plain Markdown used by chat replies as React text, never as HTML.
function inline(text:string){
 const pieces=text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
 return pieces.map((piece,index)=>{
  if(piece.startsWith('**')&&piece.endsWith('**'))return <strong key={index}>{piece.slice(2,-2)}</strong>;
  if(piece.startsWith('`')&&piece.endsWith('`'))return <code key={index}>{piece.slice(1,-1)}</code>;
  const link=piece.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  if(link)return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
  return piece;
 });
}

export function AssistantText({text}:{text:string}){
 const blocks=text.replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/);
 return <div translate="no" className="assistant-copy">{blocks.map((block,index)=>{
  const lines=block.split('\n');
  if(lines.every(line=>/^\s*[-*]\s+/.test(line)))return <ul key={index}>{lines.map((line,n)=><li key={n}>{inline(line.replace(/^\s*[-*]\s+/,''))}</li>)}</ul>;
  if(lines.every(line=>/^\s*\d+[.)]\s+/.test(line)))return <ol key={index}>{lines.map((line,n)=><li key={n}>{inline(line.replace(/^\s*\d+[.)]\s+/,''))}</li>)}</ol>;
  return <p key={index}>{lines.map((line,n)=><React.Fragment key={n}>{n>0&&<br/>}{inline(line.replace(/^#{1,4}\s+/,''))}</React.Fragment>)}</p>;
 })}</div>;
}

export function AssistantTextPart(){const part=useMessagePartText();return <AssistantText text={part.text}/>}
