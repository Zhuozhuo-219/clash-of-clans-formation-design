"""Regression test for the v0.1 infinite vertical growth bug.

Requires: pip install playwright; python -m playwright install chromium
Run: python tests/test_canvas_layout.py
"""
from pathlib import Path
import os
import shutil
from time import sleep
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parents[1] / 'index.html').read_text(encoding='utf-8')
with sync_playwright() as playwright:
    browser_executable = os.environ.get('BROWSER_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser = playwright.chromium.launch(executable_path=browser_executable, headless=True, args=['--no-sandbox'])
    for width, height in [(1440, 900), (1100, 700), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('dialog', lambda dialog: dialog.accept())
        page.set_content(HTML, wait_until='load')
        sleep(.15)
        def state():
            return page.evaluate('''() => ({
              scroll: document.documentElement.scrollHeight,
              viewport: document.querySelector('#viewport').getBoundingClientRect().height,
              canvas: document.querySelector('canvas').getBoundingClientRect().height,
              inlineHeight: document.querySelector('canvas').style.height,
              backingHeight: document.querySelector('canvas').height
            })''')
        before = state()
        sleep(.8)
        after = state()
        assert abs(after['scroll'] - before['scroll']) <= 1, (width, height, before, after)
        assert not after['inlineHeight'], (width, height, after)
        assert not errors, errors
        page.locator('[data-view="top"]').click()
        assert page.locator('[data-view="top"]').get_attribute('class') == 'view active'
        page.locator('[data-view="iso"]').click()
        page.locator('#clear').click()
        page.locator('#tools [data-tool="place"]').click()
        assert '对象 0 个' in page.locator('#stat').inner_text()
        page.close()
        print(f'PASS viewport {width}x{height}: stable at {after["scroll"]} px; view switching and controls work')
    browser.close()