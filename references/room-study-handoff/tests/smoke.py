#!/usr/bin/env python3
import os, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
os.environ['DISPLAY']=''
report=[]
def check(name,ok,detail=''):
    report.append((name,bool(ok),detail))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content((ROOT/'room-study-standalone.html').read_text(),wait_until='load',timeout=30000)
    page.wait_for_function('!!window.roomStudy',timeout=30000)
    page.wait_for_timeout(500)
    check('WebGL2 context',page.evaluate('!!document.getElementById("scene").getContext("webgl2")'))
    check('Application initialized',page.evaluate('!!window.roomStudy'))
    check('Scene objects exist',page.evaluate('roomStudy.model.objects.length>25'),str(page.evaluate('roomStudy.model.objects.length')))
    check('Six room viewpoints',page.evaluate('roomStudy.model.rooms.length===6'))
    before=page.evaluate('roomStudy.sunCalc().dir')
    page.locator('#time').fill('7.5');page.locator('#time').dispatch_event('input')
    after=page.evaluate('roomStudy.sunCalc().dir')
    changed=sum((a-b)**2 for a,b in zip(before,after))>.05
    check('Time changes sun direction',changed)
    check('Bed collision active',page.evaluate('!roomStudy.canStand(1.9,2.25)'))
    page.evaluate('roomStudy.gotoRoom("living")')
    check('Walk mode',page.evaluate('roomStudy.state.mode==="walk"'))
    page.screenshot(path=str(ROOT/'tests'/'smoke.png'))
    check('No JavaScript page errors',not errors,'; '.join(errors))
    browser.close()
text='\n'.join(f"{'PASS' if ok else 'FAIL'}  {name}{'  '+detail if detail else ''}" for name,ok,detail in report)
(ROOT/'tests'/'validation-report.txt').write_text(text+'\n')
print(text)
if not all(ok for _,ok,_ in report): raise SystemExit(1)
