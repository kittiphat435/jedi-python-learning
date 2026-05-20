const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto(`file://${path.resolve('test_cal.html')}`);
    
    console.log('Clicking button...');
    await page.click('#widget_6');
    
    const labelCText = await page.evaluate(() => {
        return document.querySelector('#widget_3').textContent;
    });
    
    console.log('Label C text after click:', labelCText);
    
    await browser.close();
})();