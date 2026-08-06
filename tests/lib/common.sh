#!/usr/bin/env bash
#
# Shared helpers for this repo's integration tests.
#
# Source this as the first thing a test script does:
#
#     source "$( dirname -- "${BASH_SOURCE[0]}" )/../lib/common.sh"
#
# Sourcing it turns on `set -e`, applies STACK_SCRIPT_DEBUG (xtrace plus an
# environment dump), and defines the helpers below.
#
# These are a trimmed copy of the helpers in the stack tool's own test suite
# (stack/tests/lib/common.sh) -- the parts a stack-deploying test outside that
# repo needs.  Keep them in sync by hand when the originals change; the point of
# the copy is that this repo's tests run against an *installed* stack and must
# not need a stack checkout to be present.

set -e

if [ -n "$STACK_SCRIPT_DEBUG" ]; then
  set -x
  echo "Environment variables:"
  env
fi

# The stack executable under test.  Overridable so a developer can point the
# test at a working copy ("STACK='uv run stack' ./tests/e2e/run-e2e-test.sh").
STACK=${STACK:-stack}

# The deployment the helpers below act on; set by stop_deployment_on_exit.
TEST_DEPLOYMENT_DIR=""

# --- reporting ---------------------------------------------------------------

# Report a failure and exit non-zero.  Teardown registered with
# stop_deployment_on_exit still runs, so a test never needs to call its own
# cleanup function by hand before failing.
fail () {
    echo "$@"
    exit 1
}

# --- preconditions -----------------------------------------------------------

# Check that the utilities a test needs are on the PATH.
require_commands () {
    local cmd
    for cmd in "$@"; do
        if ! command -v "$cmd" &> /dev/null; then
            fail "Error: '$cmd' is not installed or not available on the PATH"
        fi
    done
}

# --- test directories --------------------------------------------------------

# Remove a directory even when it holds root-owned files.  Containers write into
# bind-mounted volume dirs as root, so a previous run's data cannot always be
# removed by the (non-root) host user; fall back to a throwaway container.
force_rm () {
    if [ -e "$1" ]; then
        rm -rf "$1" 2> /dev/null || true
    fi
    if [ -e "$1" ]; then
        docker run --rm -v "$( dirname "$1" )":/w alpine rm -rf "/w/$( basename "$1" )"
    fi
}

# Create a clean working directory for the test under ~/stack-test and put the
# stack tool's repo base dir inside it.  Sets STACK_TEST_DIR and exports
# STACK_REPO_BASE_DIR.  Each test passes its own directory name, so tests do not
# share state with each other.
setup_test_dir () {
    STACK_TEST_DIR=~/stack-test/"$1"
    export STACK_REPO_BASE_DIR=${STACK_TEST_DIR}/repo-base-dir
    echo "Using test directory: $STACK_TEST_DIR"
    force_rm "$STACK_TEST_DIR"
    mkdir -p "$STACK_REPO_BASE_DIR"
}

# --- deployment lifecycle ----------------------------------------------------

# Register teardown for a deployment, and tell the wait helpers below which
# deployment they are acting on.  From here on any exit -- success, `fail`, or an
# error under `set -e` -- stops the deployment and deletes its volumes.
#
# On a failing exit the containers' logs are dumped first: the deployment is
# about to be destroyed, and in CI those logs are usually the only evidence of
# what went wrong.
stop_deployment_on_exit () {
    TEST_DEPLOYMENT_DIR="$1"
    trap _test_exit_handler EXIT
}

_test_exit_handler () {
    local rc=$?
    trap - EXIT
    set +e
    if [ -n "$TEST_DEPLOYMENT_DIR" ] && [ -d "$TEST_DEPLOYMENT_DIR" ]; then
        if [ $rc -ne 0 ]; then
            dump_diagnostics
        fi
        $STACK manage --dir "$TEST_DEPLOYMENT_DIR" stop --delete-volumes
    fi
    exit $rc
}

# Report what a failing deployment was doing, before it is torn down.
dump_diagnostics () {
    echo "===================== FAILURE DIAGNOSTICS ====================="
    echo "----- ps -----"
    $STACK manage --dir "$TEST_DEPLOYMENT_DIR" ps || true
    echo "----- container logs (last 200 lines per service) -----"
    $STACK manage --dir "$TEST_DEPLOYMENT_DIR" logs -n 200 || true
    echo "=============================================================="
}

# --- waiting -----------------------------------------------------------------

# Wait until `manage status` reports at least $1 services running.  $2 overrides
# the number of 5-second checks (default 10).
#
# "status" reports a container as running only once it is actually ready, so
# this is a readiness wait, not just a started wait.
wait_for_running () {
    local how_many=$1
    local check_limit=${2:-10}
    local running=0
    local check=0
    while [ $running -lt $how_many ] && [ $check -lt $check_limit ]; do
        check=$((check + 1))
        # grep -c exits non-zero when the count is zero, which is a normal
        # outcome early on, so do not let it trip `set -e`.
        running=$( $STACK manage --dir "$TEST_DEPLOYMENT_DIR" status | grep -ic "running" ) || true
        if [ $running -lt $how_many ]; then
            echo "waiting for services to start ($running/$how_many)..."
            sleep 5
        fi
    done
    if [ $running -lt $how_many ]; then
        fail "waiting for services to start: FAILED - $running of $how_many running"
    fi
}

# Fetch $1 until its body contains $2.  $3 overrides the number of 5-second
# attempts (default 20).
#
# A container being ready is not the same as its server being ready to serve, so
# a single-shot fetch here is a race.  The last response body is printed on
# failure, without which a CI log says only that the text was not found.
wait_for_content () {
    local url=$1
    local expected=$2
    local tries=${3:-20}
    local try=0
    local body=""
    while [ $try -lt $tries ]; do
        try=$((try + 1))
        body=$( curl -s "$url" ) || true
        if echo "$body" | grep -q "$expected"; then
            return
        fi
        echo "Waiting for $expected at $url..."
        sleep 5
    done
    echo "last response body was:"
    echo "$body"
    fail "http: FAILED - $expected not found at $url"
}
