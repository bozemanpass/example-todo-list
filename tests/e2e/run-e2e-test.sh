#!/usr/bin/env bash
#
# End-to-end test: deploy this application as a stack, with the stack tool, to a
# local docker compose deployment, then drive it through a real (headless)
# browser -- create todos, complete one, reload, delete them -- taking
# screenshots along the way.
#
# Patterned after the stack tool's own deploy test (stack/tests/deploy/
# run-deploy-test.sh), which covers the same deployment lifecycle but talks to
# the app's API with curl instead of using a browser.
#
# Unlike that test, this one runs against an *installed* stack (whatever "stack"
# on the PATH is, or $STACK) rather than one built from a checkout.
#
#     ./tests/e2e/run-e2e-test.sh
#
# Environment:
#   STACK              stack executable to test (default: "stack")
#   E2E_RESULTS_DIR    where screenshots and the app's icons are written
#                      (default: tests/e2e/results)
#   PLAYWRIGHT_VERSION Playwright version; picks both the container image tag
#                      and the npm package, which have to agree
#   STACK_SCRIPT_DEBUG set to anything for xtrace and an environment dump

source "$( dirname -- "${BASH_SOURCE[0]}" )/../lib/common.sh"

require_commands docker curl jq

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPO_DIR=$( cd -- "$SCRIPT_DIR/../.." &> /dev/null && pwd )

STACK_PATH=$REPO_DIR/stacks/todo
RESULTS_DIR=${E2E_RESULTS_DIR:-$SCRIPT_DIR/results}

# The image ships the browsers; the browser build it looks for is tied to the
# Playwright version, so the image tag and the npm package must match.
PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION:-1.56.0}
PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

# --map-ports-to-host localhost-same publishes each service on the host on the
# same port the composefile gives it.
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

echo "Running end-to-end browser test"
echo "Testing with this stack: $STACK"
echo "Version reported is: $( $STACK version )"

setup_test_dir e2e-test-dir

# Screenshots from the previous run would otherwise be uploaded as this run's
# results.
rm -rf "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR"

# The stack is the one in this working copy, referred to by path -- the test
# has to exercise the checkout it was invoked from (a PR branch, in CI), not
# whatever is published under the stack's name.
$STACK prepare --stack "$STACK_PATH"

# Deployment artifacts live outside the repo base dir, so the deployment's copy
# of the stack files is not seen when resolving stacks by name.
test_deployment_dir=$STACK_TEST_DIR/test-deployment-dir
test_deployment_spec=$STACK_TEST_DIR/test-deployment-spec.yml
$STACK init --stack "$STACK_PATH" --output "$test_deployment_spec" --map-ports-to-host localhost-same
if [ ! -f "$test_deployment_spec" ]; then
    fail "deploy init: FAILED - spec file not present"
fi

stop_deployment_on_exit "$test_deployment_dir"
$STACK deploy --spec-file "$test_deployment_spec" --deployment-dir "$test_deployment_dir"
if [ ! -d "$test_deployment_dir" ]; then
    fail "deploy create: FAILED - deployment directory not present"
fi
echo "deploy create: passed"

$STACK manage --dir "$test_deployment_dir" start
wait_for_running 3

# Both tiers have to be serving before the browser is pointed at them: the app
# is a single page that fetches from the backend as soon as it mounts, and a
# backend that is not up yet shows as an error banner rather than an empty list.
#
# The built frontend references its JS bundle as /assets/index-<hash>.js, so
# match the stable prefix rather than the per-build hash.
wait_for_content $FRONTEND_URL '/assets/index-'
wait_for_content $BACKEND_URL '\['
echo "deploy http: passed"

# --- the browser part --------------------------------------------------------

# Run the browser in the official Playwright image rather than on the host, so
# that this test needs nothing installed beyond docker -- and so that a CI
# runner and a developer's machine run the identical browser build.
#
# --network host because the frontend's API URL is baked into its bundle as
# http://localhost:5000: inside a bridged container that would be the container
# itself.  It also lets the browser reach the published ports directly.
echo "Running browser test in $PLAYWRIGHT_IMAGE"
docker run --rm \
    --network host \
    --user "$( id -u ):$( id -g )" \
    -e HOME=/tmp \
    -e APP_URL="$FRONTEND_URL" \
    -e RESULTS_DIR=/results \
    -e NODE_PATH=/tmp/pw/node_modules \
    -e PLAYWRIGHT_VERSION="$PLAYWRIGHT_VERSION" \
    -v "$SCRIPT_DIR/browser-test.mjs":/browser-test.mjs:ro \
    -v "$RESULTS_DIR":/results \
    "$PLAYWRIGHT_IMAGE" \
    sh -c 'npm install --no-save --no-fund --no-audit --prefix /tmp/pw \
             playwright-core@"$PLAYWRIGHT_VERSION" \
           && node /browser-test.mjs'

echo "browser test: passed"
echo "Screenshots and icons written to: $RESULTS_DIR"
ls -l "$RESULTS_DIR"

# --- what the browser did, seen from the API ---------------------------------

# The UI said the todos were gone; confirm the backend agrees, so that a
# frontend that only ever pretended to delete them cannot pass.
remaining=$( curl -s $BACKEND_URL | jq 'length' )
if [ "$remaining" != "0" ]; then
    echo "backend still holds:"
    curl -s $BACKEND_URL
    fail "storage: FAILED - $remaining todo(s) left after the browser deleted them"
fi
echo "storage: passed"

echo "Test passed"
