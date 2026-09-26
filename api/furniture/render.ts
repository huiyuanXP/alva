import {chromium} from '@playwright/test';
import type {FurnitureModelData} from '../../packages/contracts/alva/furniture-model.js';
export type FurnitureRenders={images:string[];views:string[];stats:{meshes:number;triangles:number};bounds:{min:number[];max:number[]}};
export type FurnitureRenderer=(model:FurnitureModelData,dimensions:{width:number;height:number;depth:number},signal?:AbortSignal)=>Promise<FurnitureRenders>;
export function furnitureRenderer(origin:()=>string):FurnitureRenderer{return async(model,dimensions,signal)=>{
 signal?.throwIfAborted();const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const abort=()=>{void browser.close().catch(()=>{})};signal?.addEventListener('abort',abort,{once:true});
 try{signal?.throwIfAborted();const page=await browser.newPage({viewport:{width:800,height:800}});await page.goto(origin()+'/furniture-render');await page.waitForFunction(()=>typeof (window as any).alvaFurnitureRender==='function',null,{timeout:30_000});const result=await page.evaluate(({model,dimensions})=>(window as any).alvaFurnitureRender(model,dimensions),{model,dimensions}) as FurnitureRenders;signal?.throwIfAborted();return result}finally{signal?.removeEventListener('abort',abort);await browser.close()}
}}
