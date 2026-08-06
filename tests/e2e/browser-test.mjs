// Drive the deployed todo app through a headless Chromium: add todos, complete
// one, check they survive a reload, then delete them.  Everything here goes
// through the UI -- the point of this test, as opposed to the API-level checks
// in run-e2e-test.sh, is that the frontend really talks to the backend of the
// deployed stack.
//
// Run by tests/e2e/run-e2e-test.sh inside the official Playwright container, so
// neither a developer nor a CI runner needs Playwright or a browser installed.
//
// Configured by environment:
//   APP_URL         the deployed frontend (default http://localhost:3000)
//   SCREENSHOT_DIR  where the screenshots are written (default ./screenshots)

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// The container image ships the browsers but not the npm package, so the runner
// installs playwright-core into a scratch directory and points NODE_PATH at it.
// The ESM resolver -- unlike require -- ignores NODE_PATH, so load it the
// CommonJS way.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'screenshots';

// Distinct titles, so that an assertion matching one cannot be satisfied by the
// other -- or by a leftover todo from an earlier run against the same volume.
const TODO_A = 'e2e buy milk 1f0a6bde';
const TODO_B = 'e2e walk the dog 4c72e155';

// Long enough that a slow container start (image pull, first-request compile)
// does not fail a test that would otherwise pass.
const TIMEOUT = 30_000;

let shotNumber = 0;

// Screenshots are numbered in the order they are taken: the directory is a CI
// artifact someone scrolls through to see how the app looked, and file order is
// the only sequence information they have.
async function screenshot(page, name) {
    shotNumber += 1;
    const file = path.join(
        SCREENSHOT_DIR,
        `${String(shotNumber).padStart(2, '0')}-${name}.png`,
    );
    await page.screenshot({ path: file, fullPage: true });
    console.log(`screenshot: ${file}`);
}

function fail(message) {
    throw new Error(message);
}

// The list item for a todo, located by its title text.
function todoItem(page, title) {
    return page.locator('.todo-item').filter({ hasText: title });
}

async function addTodo(page, title) {
    await page.getByLabel('New todo title').fill(title);
    await page.getByRole('button', { name: 'Add' }).click();
    await todoItem(page, title).waitFor({ timeout: TIMEOUT });
    console.log(`added todo: ${title}`);
}

async function main() {
    await mkdir(SCREENSHOT_DIR, { recursive: true });

    const browser = await chromium.launch();
    // A fixed viewport keeps the screenshots comparable between runs, and wide
    // enough that the layout is the desktop one.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Anything the app logs or fails to fetch is evidence when a later
    // assertion fails, and the CI log is the only place to see it.
    page.on('console', (msg) => console.log(`browser console [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`browser page error: ${err.message}`));
    page.on('requestfailed', (req) =>
        console.log(`browser request failed: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`),
    );

    try {
        console.log(`opening ${APP_URL}`);
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

        // The React app has to mount and its first fetch has to come back before
        // any of the assertions below mean anything.
        await page.getByRole('heading', { name: 'Your todos' }).waitFor({ timeout: TIMEOUT });
        await page.locator('.card-subtitle', { hasNotText: 'Loading' }).waitFor({ timeout: TIMEOUT });

        // A failed initial fetch is reported in-page rather than by a broken
        // page, so check for it explicitly: without this the "0 todos" state
        // below looks the same as "the backend is unreachable".
        if (await page.locator('.banner-error').count()) {
            fail(`app reported an error on load: ${await page.locator('.banner-error').innerText()}`);
        }

        await screenshot(page, 'initial');

        // --- create ---------------------------------------------------------
        await addTodo(page, TODO_A);
        await addTodo(page, TODO_B);

        if ((await page.locator('.todo-item').count()) !== 2) {
            fail(`expected 2 todos after adding, found ${await page.locator('.todo-item').count()}`);
        }

        // --- complete -------------------------------------------------------
        // click(), not check(): the checkbox is controlled by React state that
        // is only updated once the backend has answered, so check()'s immediate
        // "did the box become checked" assertion loses the race and fails.  The
        // chip below is the real confirmation.
        await todoItem(page, TODO_A).locator('.todo-checkbox').click();
        await todoItem(page, TODO_A).locator('.chip-done').waitFor({ timeout: TIMEOUT });
        console.log(`marked done: ${TODO_A}`);

        await screenshot(page, 'todos-added');

        // --- persistence ----------------------------------------------------
        // Reloading throws away all client state, so what comes back has to have
        // come from the backend and its database.
        await page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await page.getByRole('heading', { name: 'Your todos' }).waitFor({ timeout: TIMEOUT });
        await todoItem(page, TODO_A).waitFor({ timeout: TIMEOUT });
        await todoItem(page, TODO_B).waitFor({ timeout: TIMEOUT });
        await todoItem(page, TODO_A).locator('.chip-done').waitFor({ timeout: TIMEOUT });
        await todoItem(page, TODO_B).locator('.chip-open').waitFor({ timeout: TIMEOUT });
        console.log('todos and their state survived a page reload');

        await screenshot(page, 'after-reload');

        // --- delete ---------------------------------------------------------
        for (const title of [TODO_A, TODO_B]) {
            await todoItem(page, title).getByRole('button', { name: `Delete "${title}"` }).click();
            await todoItem(page, title).waitFor({ state: 'detached', timeout: TIMEOUT });
            console.log(`deleted todo: ${title}`);
        }

        await page.locator('.empty-state').waitFor({ timeout: TIMEOUT });

        // And the deletions stuck, rather than only leaving the list component.
        await page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await page.locator('.empty-state').waitFor({ timeout: TIMEOUT });
        console.log('todos stayed deleted after a page reload');

        await screenshot(page, 'after-delete');
    } catch (err) {
        // The state the browser was in when it gave up is the most useful thing
        // in the artifact directory, so capture it before unwinding.
        await screenshot(page, 'failure').catch(() => {});
        throw err;
    } finally {
        await context.close();
        await browser.close();
    }

    console.log('browser test: passed');
}

main().catch((err) => {
    console.error(`browser test: FAILED - ${err.message}`);
    process.exit(1);
});
