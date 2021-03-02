jest.setTimeout(60000);
const Buffer = require('safe-buffer').Buffer;
const Keygrip = require('keygrip');
const keys = require('../config/keys');

const puppeteer = require('puppeteer');

let browser, page;
beforeEach(async () => {
    browser = await puppeteer.launch({
        headless: false // we want to see a graphical UI
    });
    page = await browser.newPage();
    await page.goto('http://localhost:3000/');
});

afterEach(async () => {
    await browser.close();
});

test('the header has the correct text', async () => {
    const text = await page.$eval('a.brand-logo', el => el.innerHTML);
    expect(text).toEqual('Blogster');
});

test('clicking login starts the oAuth flow', async () => {
    await page.click('.right a');
    const url = await page.url();
    expect(url).toMatch(/accounts\.google\.com/);
});

test('when signed in, shows the logout button', async () => {
    const id = '603bc642c6be16328c3985af';

    const sessionObject = {
       passport: {
        user: id 
       },
    };
    const sessionString = Buffer.from(JSON.stringify(sessionObject)).toString(
        'base64'
        );
    const keygrip = new Keygrip([keys.cookieKey]);
    const sig = keygrip.sign('session=' + sessionString);

    await page.setCookie({ name: 'session', value: sessionString });
    await page.setCookie({ name: 'session.sig', value: sig });
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('a[href="/auth/logout"]');

    const text = await page.$eval('a[href="/auth/logout"]', el => el.innerHTML);
    expect(text).toEqual('Logout');   
});