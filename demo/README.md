# Demo recording

`docs/images/todo-app.gif`, the animation at the top of the project README, is
recorded by `record-demo.sh` from `browser-demo.mjs`.  Nothing in it is faked or
edited: the application is really deployed as a stack, to local Docker, and every
todo in the recording is really created, completed and deleted in PostgreSQL by
the running application.

```bash
./demo/record-demo.sh
```

Each run deploys a fresh stack, records, converts, and tears the deployment down
again -- so a take always opens on an empty todo list, and taking another is just
running it again.  Recording takes a couple of minutes, most of it the deploy.

## Requirements

The same as the end-to-end test -- `docker`, `curl`, `jq` and a `stack` on the
PATH -- plus `ffmpeg` on the host (`sudo apt-get install -y ffmpeg`).  The
browser itself runs in the Playwright container image, so it does not have to be
installed.

ffmpeg is needed on the host because the ffmpeg inside the Playwright image is a
stripped build with no GIF muxer and no `palettegen` filter: it exists to write
the WebM, and that is all it can do.

## Why the browser script is separate from the test's

`tests/e2e/browser-test.mjs` and `demo/browser-demo.mjs` drive the same app
through the same library and look similar, but they are tuned against each
other.  The test fills fields in one shot, never waits longer than it has to,
and asserts after every step.  The recording types character by character,
pauses so that each change registers before the next one starts, and asserts
almost nothing -- a failed assertion mid-take just wastes the take.  Merging
them would make the test slower and the animation worse.

## The pointer is drawn by the page

Playwright's recorder does not capture a mouse pointer, so `browser-demo.mjs`
injects one: a small arrow that follows real `mousemove` events, plus a ripple
on `mousedown`.  What it draws is genuinely where Playwright is pointing.

That is also why the script moves the pointer with `page.mouse.move(...,
{steps})` before clicking, rather than letting `click()` jump straight to the
target: the travel between controls is most of what makes the recording look
like someone using the app rather than a series of jump cuts.

## What the recording cannot show

The video is the page, not the browser -- Playwright records the viewport, so
there is no tab strip, address bar or favicon in the GIF, the same limitation
the end-to-end test's screenshots have.  Capturing those would mean running a
headed browser under Xvfb and grabbing the X display with ffmpeg instead.

## Tuning

`DEMO_GIF_WIDTH` and `DEMO_GIF_FPS` (default 800px, 12fps) trade size against
smoothness; `DEMO_OUTPUT` writes the GIF somewhere else, and `DEMO_KEEP_VIDEO`
keeps the source WebM next to it, which is worth a look when the pacing needs
adjusting.  The pacing itself -- typing speed, and the pauses after each action
-- is the block of constants at the top of `browser-demo.mjs`.
