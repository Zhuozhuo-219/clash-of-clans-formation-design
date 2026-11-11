"""Chromium UI regression test using an inline test bundle.
This environment may block file/http navigations in headless browsers; tests load
an equivalent temporary script bundle via page.set_content. Production remains ES Modules.
"""
from pathlib import Path
import re,os,shutil,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def bundled_test_html():
    h=(ROOT/'index.html').read_text()
    css=(ROOT/'src/styles.css').read_text()
    h=h.replace('<link rel="stylesheet" href="./src/styles.css">','<style>'+css+'</style>')
    scripts=[ROOT/'src/topology.mjs',ROOT/'src/catalog.generated.mjs',ROOT/'src/fill-engine.mjs',ROOT/'src/layout-contract.mjs',ROOT/'src/samples.mjs',ROOT/'src/main.js']
    codes=[]
    for f in scripts:
        s=f.read_text()
        s=re.sub(r'^import .*?;\s*$', '',s,flags=re.M)
        s=re.sub(r'^export (const|function|class) ',r'\1 ',s,flags=re.M)
        s=re.sub(r'^export \{[^;]+;\s*$', '',s,flags=re.M)
        codes.append(s)
    h=h.replace('<script type="module" src="./src/main.js"></script>','<script>\n'+'\n'.join(codes[:1])+ '\nconst T={GRID,key,boundsCheck,placementCheck,deploymentMask,boundaryEdges,deploymentStatus,allowedRegions,stats,validateLayout};\n'+'\n'.join(codes[1:])+'\n</script>')
    assert 'type="module"' not in h
    return h

with sync_playwright() as playwright:
    browser_executable=os.environ.get('BROWSER_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser=playwright.chromium.launch(executable_path=browser_executable,headless=True,args=['--no-sandbox'])
    html=bundled_test_html()
    for width,height in [(1440,900),(1100,700),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('dialog',lambda dialog:dialog.accept())
        page.set_content(html,wait_until='load')
        page.wait_for_function("document.querySelector('#stat').textContent.includes('对象 ')")
        def size():return page.evaluate('''() => ({ scroll:document.documentElement.scrollHeight,canvas:document.querySelector('canvas').getBoundingClientRect().height, inline:document.querySelector('canvas').style.height })''')
        before=size();time.sleep(.6);after=size()
        assert abs(before['scroll']-after['scroll'])<=1,(width,height,before,after)
        assert after['inline']=='',after
        assert not errors,errors
        page.locator('#draftExample').click()
        assert '草案通过校验' in page.locator('#draftReport').inner_text()
        page.locator('#applyDraft').click()
        assert '对象 15 个' in page.locator('#stat').inner_text(),page.locator('#stat').inner_text()
        page.locator('#draftInput').fill('{"format":"coc-th18-draft-v1","placements":[{"id":"army_camp","x":0,"y":0},{"id":"town_hall","x":2,"y":2}]}')
        page.locator('#checkDraft').click()
        assert '校验未通过' in page.locator('#draftReport').inner_text()
        page.locator('#applyDraft').click()
        assert '对象 15 个' in page.locator('#stat').inner_text()
        page.locator('#groups [data-group="all"]').click()
        page.locator('#search').fill('兵营')
        assert any('4×4' in text for text in page.locator('#picker option').all_text_contents())
        page.locator('[data-view="top"]').click()
        assert page.locator('[data-view="top"]').get_attribute('class')=='view active'
        page.locator('[data-view="iso"]').click()
        if width==1440:page.screenshot(path='/mnt/data/TH18_v0.2_browser.png',full_page=True)
        page.close()
        print(f'PASS {width}x{height}, stable {after["scroll"]}px, draft+validation+view controls')
    browser.close()
