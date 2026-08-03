# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A fork of [versatica/JsSIP](https://github.com/versatica/JsSIP) (the JavaScript SIP library, SIP over WebSocket + WebRTC), published as the scoped package `@per_moeller/jssip-telecomx`. The fork's custom changes are concentrated in `lib/RTCSession.js`: a `forceUseStunResponse` option (passed via constraints/`mediaConstraints`) that rewrites the SDP so only the server-reflexive (STUN response) ICE candidate is advertised — used because calls always go through a media server, never peer-to-peer, and browsers don't reliably surface the srflx candidate via `icecandidate` events. Key helpers: `_correctSdpIfForcingStun()` and `_substituteIceCandidatesWithLocalCandidate()`; incoming calls use the `selectedcandidatepairchange` event on the ICE transport, outgoing calls capture the srflx candidate from `icecandidate` events. Preserve this behavior when merging upstream changes.

## Commands

Gulp drives everything (use `node_modules/.bin/gulp` if gulp-cli is not installed globally):

- `npm install` — install deps (`.npmrc` disables package-lock). The `overrides` block in package.json exists solely to force patched versions of vulnerable transitive dev-dependencies (mostly under the abandoned `nodeunit`/`tap` test chain and browserify's crypto shims, none of which reach the published bundle) — keep it until nodeunit is replaced.
- `npm run lint` — ESLint over `gulpfile.js`, `lib/**/*.js`, `test/**/*.js` (prints problems but does not fail the task)
- `npm test` — runs the nodeunit test files listed explicitly in `gulpfile.js`'s `test` task (new test files must be added to that list)
- `node_modules/.bin/nodeunit test/test-parser.js` — run a single test file
- `gulp` or `gulp dist` — full pipeline: lint → babel → test → browserify → uglify, producing `dist/`
- `gulp babel` — transpile `lib/` → `lib-es5/` (this alone is what `npm run prepublish` does)
- `gulp grammar` (or `gulp devel`) — recompile `lib/Grammar.pegjs` → `lib/Grammar.js`
- `npm run release` — builds, commits with the package.json version as message, tags, pushes to origin master, and publishes to npm; bump `version` in package.json first

## Build pipeline / generated code

- Source lives in `lib/` (modern JS, CommonJS modules). Babel transpiles it to `lib-es5/`, which is the published `main` entry. Browserify bundles `lib-es5` into `dist/` for browser use. **Consumers never see `lib/` directly** — an edit in `lib/` is invisible until `gulp babel` is re-run, and `lib-es5/`/`dist/` are committed artifacts.
- `lib/Grammar.js` (~12k lines) is **generated** from `lib/Grammar.pegjs` by `gulp grammar`, which also applies regex post-processing (converts thrown SyntaxErrors into `-1` returns). Never hand-edit `Grammar.js`; edit the `.pegjs` file and regenerate.
- TypeScript definitions (`lib/*.d.ts`) are hand-maintained alongside the sources; update them when changing public API.

## Architecture

Everything is event-driven: classes extend Node's `EventEmitter`, and logging uses the `debug` module with `JsSIP:`-prefixed namespaces.

- `lib/JsSIP.js` — entry point; exposes `UA`, `WebSocketInterface`, `URI`, `NameAddrHeader`, `Grammar`, `C` (constants), `Utils`, `Exceptions`.
- `lib/UA.js` — the SIP User Agent, the central class. Owns the `Transport`, dispatches incoming requests to sessions/messages, manages registration via `Registrator.js`. Configuration is validated/loaded by `Config.js`.
- `lib/RTCSession.js` — a call: SDP offer/answer, ICE handling, hold/mute, renegotiation. Sub-features in `lib/RTCSession/` (DTMF, Info, ReferNotifier/ReferSubscriber for transfers).
- SIP protocol stack: `Parser.js` + generated `Grammar.js` parse raw messages into `SIPMessage.js` classes (IncomingRequest/Response, OutgoingRequest); `sanityCheck.js` filters incoming messages; `Transactions.js` implements the RFC 3261 client/server transaction state machines; `Dialog.js` + `Dialog/RequestSender.js` handle in-dialog requests; `RequestSender.js` adds digest-auth retry (`DigestAuthentication.js`); `Timers.js` holds RFC 3261 timer values.
- Transport layer: `Transport.js` wraps pluggable sockets with reconnection logic; `WebSocketInterface.js` is the standard implementation (SIP over WebSocket, RFC 7118); `Socket.js` documents/checks the socket interface.

## Code style

Enforced by the repo's `.eslintrc.js` (ESLint 8 via `gulp-eslint-new`): Allman braces, 2-space indent, and the distinctive upstream JsSIP formatting (aligned object colons, `_underscore` private members). Match the surrounding code exactly — this fork tracks upstream, so gratuitous reformatting makes merges harder.
