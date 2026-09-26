import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {reject,type SourceImage} from '../model.js';
export async function imageData(mime:string,base64:string,filename='户型图'):Promise<SourceImage>{
 if(base64.length>16_000_000||!base64.length)reject('文件最大12MB');
 const data=Buffer.from(base64,'base64');
 if(mime==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime,data:base64,originalMime:mime,filename};
 if(mime==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255)return {mime,data:base64,originalMime:mime,filename};
 if(mime==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-'){
  // Single-floor import uses page one and shows that choice to the owner.
  Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(data),useSystemFonts:true});const doc=await task.promise;
  try{const page=await doc.getPage(1),initial=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2,1800/Math.max(initial.width,initial.height))});const canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d') as never,viewport:view,canvas:canvas as never}).promise;return {mime:'image/png',data:canvas.toBuffer('image/png').toString('base64'),originalMime:mime,originalData:base64,filename,page:1,pages:doc.numPages}}finally{await task.destroy()}
 }
 return reject('仅支持内容有效的PNG、JPEG或PDF');
}
