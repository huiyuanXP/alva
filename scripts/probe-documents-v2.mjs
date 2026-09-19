import {Worker} from 'node:worker_threads';
const text='Keep the existing dining table',stream=`BT /F1 12 Tf 40 750 Td (${text}) Tj ET`;
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let out='%PDF-1.4\n';const offsets=[0];objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${s}\nendobj\n`;});const at=Buffer.byteLength(out);out+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`;
const worker=new Worker(new URL('../apps/api/document-worker.mjs',import.meta.url),{workerData:{mime:'application/pdf',bytes:new Uint8Array(Buffer.from(out))},resourceLimits:{maxOldGenerationSizeMb:256}});
const timer=setTimeout(()=>{void worker.terminate();process.exitCode=1;},15000);
worker.on('message',value=>{console.log(JSON.stringify(value,null,2));clearTimeout(timer);void worker.terminate();if(!value.text?.includes(text))process.exitCode=1;});worker.on('error',error=>{console.error(error.message);clearTimeout(timer);process.exitCode=1;});
