import {createContext,useContext} from 'react';
import {useAuiState} from '@assistant-ui/react';
import './chat-progress.css';

export const ChatProgressContext=createContext<string|null>(null);

/** One replaceable status above the running assistant's existing loading dot. */
export function ChatProgress(){
 const progress=useContext(ChatProgressContext);
 const running=useAuiState(s=>s.message.status?.type==='running');
 if(!running||!progress)return null;
 return <div className="chat-progress" role="status" aria-live="polite" aria-atomic="true">{progress}</div>;
}
