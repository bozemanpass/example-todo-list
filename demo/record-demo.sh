#!/usr/bin/env bash
#
# Record docs/images/todo-app.gif -- the animation at the top of README.md --
# by deploying this application as a stack and driving the deployed app through
# a browser.  Nothing in it is faked: every todo in the recording is really
# created, completed and deleted in PostgreSQL by the running application.
#
#     ./demo/record-demo.sh
#
# The deployment is created and torn down around the recording, exactly as
# tests/e2e/run-e2e-test.sh does it -- this shares that test's helpers.  The
# browser part is demo/browser-demo.mjs, kept separate from the test's browser
# script because a recording and an assertion want opposite things.
#
# Requires the same tools as the test (docker, curl, jq, an installed stack),
# plus ffmpeg on the host for the GIF conversion: the ffmpeg inside the
# Playwright image is a stripped build with no GIF muxer.
#
# Environment:
#   STACK              stack executable to use (default: "stack")
#   DEMO_OUTPUT        the GIF to write (default: docs/images/todo-app.gif)
#   DEMO_GIF_WIDTH     width of the GIF in pixels (default: 800)
#   DEMO_GIF_FPS       frames per second in the GIF (default: 12)
#   DEMO_KEEP_VIDEO    set to keep the intermediate WebM
#   PLAYWRIGHT_VERSION Playwright version; picks both the container image tag
#                      and the npm package, which have to agree

source "$( dirname -- "${BASH_SOURCE[0]}" )/../tests/lib/common.sh"

require_commands docker curl jq ffmpeg

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPO_DIR=$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )

STACK_PATH=$REPO_DIR/stacks/todo
OUTPUT=${DEMO_OUTPUT:-$REPO_DIR/docs/images/todo-app.gif}

# 800px wide at 12fps keeps a README animation of this length comfortably inside
# a couple of megabytes while staying legible.  The app's own UI is mostly flat
# colour, which is what GIF compresses well.
GIF_WIDTH=${DEMO_GIF_WIDTH:-800}
GIF_FPS=${DEMO_GIF_FPS:-12}

PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION:-1.56.0}
PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

echo "Recording the README demo"
echo "Using this stack: $STACK"
echo "Version reported is: $( $STACK version )"

setup_test_dir demo-recording-dir
recording_dir=$STACK_TEST_DIR/recording
mkdir -p "$recording_dir"

# --- deploy ------------------------------------------------------------------

# A fresh deployment every take, so the recording always opens on an empty todo
# list rather than on whatever the last take left behind.
$STACK prepare --stack "$STACK_PATH"

demo_deployment_dir=$STACK_TEST_DIR/demo-deployment-dir
demo_deployment_spec=$STACK_TEST_DIR/demo-deployment-spec.yml
$STACK init --stack "$STACK_PATH" --output "$demo_deployment_spec" --map-ports-to-host localhost-same

stop_deployment_on_exit "$demo_deployment_dir"
$STACK deploy --spec-file "$demo_deployment_spec" --deployment-dir "$demo_deployment_dir"
$STACK manage --dir "$demo_deployment_dir" start
wait_for_running 3

# Both tiers have to be serving before the browser opens the page: a recording
# that catches the app's "is the backend running?" banner is a wasted take.
wait_for_content $FRONTEND_URL '/assets/index-'
wait_for_content $BACKEND_URL '\['

# --- record ------------------------------------------------------------------

# Same container arrangement as the e2e test -- see the comments there for why
# it is --network host.
echo "Recording the browser session"
docker run --rm \
    --network host \
    --user "$( id -u ):$( id -g )" \
    -e HOME=/tmp \
    -e APP_URL="$FRONTEND_URL" \
    -e OUTPUT_DIR=/recording \
    -e NODE_PATH=/tmp/pw/node_modules \
    -e PLAYWRIGHT_VERSION="$PLAYWRIGHT_VERSION" \
    -v "$SCRIPT_DIR/browser-demo.mjs":/browser-demo.mjs:ro \
    -v "$recording_dir":/recording \
    "$PLAYWRIGHT_IMAGE" \
    sh -c 'npm install --no-save --no-fund --no-audit --prefix /tmp/pw \
             playwright-core@"$PLAYWRIGHT_VERSION" \
           && node /browser-demo.mjs'

video=$recording_dir/demo.webm
if [ ! -s "$video" ]; then
    fail "recording: FAILED - no video at $video"
fi

# --- convert -----------------------------------------------------------------

# Two passes: build a palette from the whole clip, then map the frames onto it.
# A single-pass GIF encode picks a palette from the first frame alone, and this
# app opens on a near-empty white page -- everything that appears afterwards
# would be dithered against almost no colours.
echo "Converting to $OUTPUT"
mkdir -p "$( dirname "$OUTPUT" )"
palette=$recording_dir/palette.png
filters="fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos"

ffmpeg -loglevel error -y -i "$video" \
    -vf "${filters},palettegen=stats_mode=diff" "$palette"
ffmpeg -loglevel error -y -i "$video" -i "$palette" \
    -lavfi "${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
    -loop 0 "$OUTPUT"

if [ -n "$DEMO_KEEP_VIDEO" ]; then
    cp "$video" "$( dirname "$OUTPUT" )/"
    echo "Kept the source video: $( dirname "$OUTPUT" )/demo.webm"
fi

echo
echo "Wrote $OUTPUT"
ls -lh "$OUTPUT"
