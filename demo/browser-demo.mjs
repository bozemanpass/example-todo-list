// Record a demo of the todo app being used: todos typed in, checked off, and
// deleted, with a visible mouse pointer.  Produces a WebM; demo/record-demo.sh
// deploys the stack around it and turns the result into the README's GIF.
//
// This is the demo counterpart of tests/e2e/browser-test.mjs, deliberately kept
// separate from it.  The test wants to be fast, assert hard and never wait a
// moment longer than it must; this wants the opposite -- typing you can read,
// pauses that let a change register, and a pointer that travels to what it is
// about to click.  Folding the two together would make the test slower and the
// animation worse.
//
// Configured by environment:
//   APP_URL     the deployed frontend (default http://localhost:3000)
//   OUTPUT_DIR  where demo.webm is written (default ./recording)

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// See tests/e2e/browser-test.mjs for why this is a require rather than an import.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'recording';

// Smaller than the test's viewport, and sized to the app rather than to a
// typical window: the app centres its content in a column of about 670px and
// the list only ever grows to three items here, so anything larger spends the
// GIF's pixels -- and its bytes -- on empty margin.  Tall enough to keep the
// footer in shot below the card, which is where it lands with three todos.
const VIEWPORT = { width: 900, height: 560 };

// The pacing of the whole recording.  A viewer reads the screen far more slowly
// than the app responds, so most of these are about legibility, not the app.
const TYPING_DELAY = 45;      // per character
const BEAT = 700;             // after an action, before the next one starts
const PAUSE = 1400;           // longer hold, at the start and end
const POINTER_STEPS = 28;     // intermediate positions per pointer move

const TODOS = [
    'Buy milk',
    'Walk the dog',
    'Ship the release',
];

// A pointer, drawn in the page, because Playwright's recorder does not capture
// one: without this the clicks land and things change with nothing visibly
// moving in between, which reads as a series of jump cuts rather than as
// someone using the app.
//
// It follows real mousemove events, so what it draws is genuinely where
// Playwright is pointing, and page.mouse.move(..., {steps}) is what makes the
// travel smooth.  Installed with addInitScript so it survives a reload.
function installPointer() {
    const draw = () => {
        const arrow =
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
            '<path d="M5 2.5l13.5 8.2-6 1.1 3.2 6.6-2.6 1.3-3.2-6.6-4.9 3.7z"' +
            ' fill="#202124" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>';

        const cursor = document.createElement('div');
        cursor.style.cssText = [
            'position:fixed', 'left:0', 'top:0', 'width:24px', 'height:24px',
            'z-index:2147483647', 'pointer-events:none',
            'background-repeat:no-repeat', 'background-size:contain',
            `background-image:url("data:image/svg+xml,${encodeURIComponent(arrow)}")`,
            'filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))',
        ].join(';');
        document.body.appendChild(cursor);

        document.addEventListener('mousemove', (event) => {
            cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
        }, true);

        // A ripple on click: the pointer does not change shape when it presses,
        // so without a mark here a click on an already-still pointer is
        // invisible until the app reacts to it.
        document.addEventListener('mousedown', (event) => {
            const ripple = document.createElement('div');
            ripple.style.cssText = [
                'position:fixed', 'width:34px', 'height:34px', 'border-radius:50%',
                'z-index:2147483646', 'pointer-events:none',
                'border:2px solid #1a73e8', 'background:rgba(26,115,232,.18)',
                `left:${event.clientX - 17}px`, `top:${event.clientY - 17}px`,
            ].join(';');
            document.body.appendChild(ripple);
            ripple
                .animate(
                    [
                        { transform: 'scale(.3)', opacity: 0.9 },
                        { transform: 'scale(1.5)', opacity: 0 },
                    ],
                    { duration: 450, easing: 'ease-out' },
                )
                .finished.then(() => ripple.remove(), () => ripple.remove());
        }, true);
    };

    if (document.body) {
        draw();
    } else {
        document.addEventListener('DOMContentLoaded', draw);
    }
}

// The list item for a todo, located by its title text.
function todoItem(page, title) {
    return page.locator('.todo-item').filter({ hasText: title });
}

// Travel to an element rather than teleporting to it -- the movement is the
// part that makes the recording look like use rather than automation.
async function pointAt(page, locator) {
    const box = await locator.boundingBox();
    if (!box) {
        throw new Error('cannot point at an element that is not visible');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: POINTER_STEPS });
}

async function clickOn(page, locator) {
    await pointAt(page, locator);
    await locator.click();
}

async function main() {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: VIEWPORT,
        // Recording at the viewport size keeps the frames pixel-for-pixel what
        // the page drew; any scaling is left to the GIF conversion.
        recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
    });
    await context.addInitScript(installPointer);

    const page = await context.newPage();
    const video = page.video();

    try {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.getByRole('heading', { name: 'Your todos' }).waitFor({ timeout: 30_000 });
        await page.locator('.card-subtitle', { hasNotText: 'Loading' }).waitFor({ timeout: 30_000 });

        // Open on the empty state for a moment, so the todos appearing reads as
        // a change rather than as the starting position.
        await page.waitForTimeout(PAUSE);

        const field = page.getByLabel('New todo title');
        const addButton = page.getByRole('button', { name: 'Add' });

        for (const title of TODOS) {
            await clickOn(page, field);
            await field.pressSequentially(title, { delay: TYPING_DELAY });
            await page.waitForTimeout(BEAT / 2);
            await clickOn(page, addButton);
            await todoItem(page, title).waitFor({ timeout: 30_000 });
            await page.waitForTimeout(BEAT);
        }

        await page.waitForTimeout(BEAT);

        // Check two of them off.  The chip changing from Open to Done is the
        // clearest bit of movement in the app, so it is worth the pauses.
        for (const title of TODOS.slice(0, 2)) {
            await clickOn(page, todoItem(page, title).locator('.todo-checkbox'));
            await todoItem(page, title).locator('.chip-done').waitFor({ timeout: 30_000 });
            await page.waitForTimeout(BEAT);
        }

        await page.waitForTimeout(BEAT);

        // And delete one, so the recording shows the whole life of a todo.
        const doomed = TODOS[0];
        await clickOn(page, todoItem(page, doomed).getByRole('button', { name: `Delete "${doomed}"` }));
        await todoItem(page, doomed).waitFor({ state: 'detached', timeout: 30_000 });

        // Move the pointer out of the way of the final frames, which are the
        // ones a reader looking at a stopped GIF is left with.
        await page.mouse.move(VIEWPORT.width - 60, VIEWPORT.height - 60, { steps: POINTER_STEPS });
        await page.waitForTimeout(PAUSE);
    } finally {
        // Order matters: the video is only finalised when the context closes,
        // and saveAs copies it over the browser connection, so it has to happen
        // before the browser goes away.  In the finally block rather than after
        // it, so that a take which fails part way through still leaves the
        // footage of what it managed to do.
        await context.close();
        try {
            await video.saveAs(path.join(OUTPUT_DIR, 'demo.webm'));
            console.log(`recorded: ${path.join(OUTPUT_DIR, 'demo.webm')}`);
        } catch (err) {
            console.error(`could not save the recording: ${err.message}`);
        }
        await browser.close();
    }
}

main().catch((err) => {
    console.error(`demo recording: FAILED - ${err.message}`);
    process.exit(1);
});
