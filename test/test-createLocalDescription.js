require('./include/common');
const { EventEmitter } = require('events');
const debug = require('debug');
const RTCSession = require('../lib-es5/RTCSession');

const TIMED_OUT = {};

const SDP =
  'v=0\r\n' +
  'o=- 1815 2 IN IP4 127.0.0.1\r\n' +
  's=-\r\n' +
  't=0 0\r\n' +
  'm=audio 54321 UDP/TLS/RTP/SAVPF 111\r\n' +
  'c=IN IP4 192.168.1.2\r\n' +
  'a=candidate:1 1 udp 2122260223 192.168.1.2 54321 typ host generation 0\r\n' +
  'a=candidate:2 1 udp 2122194687 10.0.0.2 54322 typ host generation 0\r\n';

const SRFLX_CANDIDATE = {
  candidate      : 'candidate:842163049 1 udp 1677729535 203.0.113.7 61665 typ srflx raddr 192.168.1.2 rport 54321 generation 0',
  type           : 'srflx',
  relatedAddress : '192.168.1.2',
  relatedPort    : 54321
};

const HOST_CANDIDATE = {
  candidate      : 'candidate:1 1 udp 2122260223 192.168.1.2 54321 typ host generation 0',
  type           : 'host',
  relatedAddress : null,
  relatedPort    : null
};

const SELECTED_LOCAL_CANDIDATE =
  'candidate:842163049 1 udp 1677729535 203.0.113.7 61665 typ srflx ' +
  'raddr 192.168.1.2 rport 54321 generation 0';

class MockEventTarget
{
  constructor()
  {
    this._listeners = new Map();
  }

  addEventListener(type, listener)
  {
    if (!this._listeners.has(type))
    {
      this._listeners.set(type, []);
    }
    this._listeners.get(type).push(listener);
  }

  removeEventListener(type, listener)
  {
    const listeners = this._listeners.get(type) || [];
    const idx = listeners.indexOf(listener);

    if (idx !== -1)
    {
      listeners.splice(idx, 1);
    }
  }

  dispatchEvent(type, event)
  {
    for (const listener of (this._listeners.get(type) || []).slice())
    {
      listener(event);
    }
  }
}

class MockIceTransport extends MockEventTarget
{
  constructor()
  {
    super();
    this._selectedCandidatePair = null;
  }

  getSelectedCandidatePair()
  {
    return this._selectedCandidatePair;
  }

  selectCandidatePair(pair)
  {
    this._selectedCandidatePair = pair;
    this.dispatchEvent('selectedcandidatepairchange', {});
  }
}

class MockRTCPeerConnection extends MockEventTarget
{
  constructor(options = {})
  {
    super();
    this.iceGatheringState = 'new';
    this.localDescription = null;
    this.iceTransport = new MockIceTransport();
    this._gatheringStateAfterSetLocal = options.gatheringStateAfterSetLocal || 'gathering';
    this._iceServers = options.iceServers || [ { urls: [ 'stun:stun.example.com' ] } ];
  }

  getConfiguration()
  {
    return { iceServers: this._iceServers };
  }

  getSenders()
  {
    return [ { transport: { iceTransport: this.iceTransport } } ];
  }

  createOffer()
  {
    return Promise.resolve({ type: 'offer', sdp: SDP });
  }

  createAnswer()
  {
    return Promise.resolve({ type: 'answer', sdp: SDP });
  }

  setLocalDescription(description)
  {
    this.localDescription = description;
    this.iceGatheringState = this._gatheringStateAfterSetLocal;

    return Promise.resolve();
  }

  emitIceCandidate(candidate)
  {
    this.dispatchEvent('icecandidate', { candidate });
  }

  emitIceGatheringComplete()
  {
    this.iceGatheringState = 'complete';
    this.dispatchEvent('icegatheringstatechange', {});
  }
}

function createSession(connection)
{
  const session = Object.create(RTCSession.prototype);

  EventEmitter.call(session);
  session._connection = connection;
  session._rtcReady = true;
  session._iceReady = false;

  return session;
}

function resolveWithin(promise, timeoutMs)
{
  return Promise.race([
    promise,
    new Promise((resolve) =>
    {
      setTimeout(() => resolve(TIMED_OUT), timeoutMs);
    })
  ]);
}

module.exports = {

  'offer forceUseStunResponse: srflx-driven ready() resolves before timeout' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    let sdpEvents = 0;

    session.on('sdp', () => { sdpEvents++; });
    session.on('icecandidate', (e) =>
    {
      if (e.candidate.type === 'srflx')
      {
        e.ready();
      }
    });

    const promise = session._createLocalDescription('offer', {
      forceUseStunResponse : true,
      iceGatheringTimeout  : 500
    });

    setTimeout(() => connection.emitIceCandidate(SRFLX_CANDIDATE), 20);

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed < 400, `resolved after ${elapsed}ms, expected < 400ms`);
        test.ok(sdp.indexOf('203.0.113.7') !== -1, 'SDP rewritten to srflx candidate');
        test.ok(sdp.indexOf('typ host') === -1, 'host candidates removed from SDP');

        // Wait beyond the configured timeout: the watchdog must have been cancelled.
        setTimeout(() =>
        {
          test.strictEqual(sdpEvents, 1, 'sdp emitted exactly once');
          test.done();
        }, 600);
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'offer: wedged ICE gathering resolves at watchdog timeout and logs a warning' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();
    const previousNamespaces = debug.disable();

    debug.enable('JsSIP:WARN:RTCSession');

    let captured = '';
    const originalStderrWrite = process.stderr.write;

    process.stderr.write = function(chunk)
    {
      captured += chunk;

      return true;
    };

    const restore = function()
    {
      process.stderr.write = originalStderrWrite;
      debug.disable();
      if (previousNamespaces)
      {
        debug.enable(previousNamespaces);
      }
    };

    const promise = session._createLocalDescription('offer', {
      iceGatheringTimeout : 150
    });

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        restore();

        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 145, `resolved after ${elapsed}ms, expected >= 150ms`);
        test.ok(elapsed < 1500, `resolved after ${elapsed}ms, expected < 1500ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified');
        test.ok(captured.indexOf('watchdog') !== -1, 'watchdog warning was logged');
        test.done();
      })
      .catch((error) =>
      {
        restore();
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'offer forceUseStunResponse: wedged ICE (no srflx) resolves unmodified at watchdog' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    const promise = session._createLocalDescription('offer', {
      forceUseStunResponse : true,
      iceGatheringTimeout  : 150
    });

    // Only a host candidate arrives and the application never calls ready().
    setTimeout(() => connection.emitIceCandidate(HOST_CANDIDATE), 20);

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 145, `resolved after ${elapsed}ms, expected >= 150ms`);
        test.ok(elapsed < 1500, `resolved after ${elapsed}ms, expected < 1500ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified (no srflx, no selected pair)');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'answer forceUseStunResponse: selectedcandidatepairchange rewrites SDP' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    let pairChangeEvents = 0;

    session.on('selectedcandidatepairchange', () => { pairChangeEvents++; });

    const promise = session._createLocalDescription('answer', {
      forceUseStunResponse : true,
      iceGatheringTimeout  : 500
    });

    setTimeout(() =>
    {
      connection.iceTransport.selectCandidatePair({
        local : { candidate: SELECTED_LOCAL_CANDIDATE }
      });
    }, 20);

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed < 400, `resolved after ${elapsed}ms, expected < 400ms`);
        test.ok(sdp.indexOf('203.0.113.7') !== -1, 'SDP rewritten to selected candidate');
        test.ok(sdp.indexOf('typ host') === -1, 'host candidates removed from SDP');
        test.strictEqual(pairChangeEvents, 1, 'selectedcandidatepairchange emitted');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'answer forceUseStunResponse: watchdog with no selected pair keeps SDP unmodified' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    const promise = session._createLocalDescription('answer', {
      forceUseStunResponse : true,
      iceGatheringTimeout  : 150
    });

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 145, `resolved after ${elapsed}ms, expected >= 150ms`);
        test.ok(elapsed < 1500, `resolved after ${elapsed}ms, expected < 1500ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified when no pair is selected');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected (TypeError?): ${error}`);
        test.done();
      });
  },

  'answer forceUseStunResponse: gathering already complete, no selected pair' :
  function(test)
  {
    const connection = new MockRTCPeerConnection({
      gatheringStateAfterSetLocal : 'complete'
    });
    const session = createSession(connection);

    const promise = session._createLocalDescription('answer', {
      forceUseStunResponse : true
    });

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        test.strictEqual(sdp, SDP, 'SDP is unmodified when no pair is selected');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected (TypeError?): ${error}`);
        test.done();
      });
  },

  'watchdog ready() is idempotent: late ready() and gathering-complete are no-ops' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    let sdpEvents = 0;
    let savedReady = null;

    session.on('sdp', () => { sdpEvents++; });
    session.on('icecandidate', (e) => { savedReady = e.ready; });

    const promise = session._createLocalDescription('offer', {
      forceUseStunResponse : true,
      iceGatheringTimeout  : 100
    });

    setTimeout(() => connection.emitIceCandidate(HOST_CANDIDATE), 20);

    // Well after the watchdog fired: a late application ready() call and a late
    // gathering-complete event must both be no-ops.
    setTimeout(() =>
    {
      if (savedReady)
      {
        savedReady();
      }
      connection.emitIceGatheringComplete();
    }, 300);

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 95, `resolved after ${elapsed}ms, expected >= 100ms`);
        test.ok(elapsed < 250, `resolved after ${elapsed}ms, expected < 250ms`);

        setTimeout(() =>
        {
          test.strictEqual(sdpEvents, 1, 'sdp emitted exactly once');
          test.done();
        }, 400);
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'answer without forceUseStunResponse: wedged ICE resolves at watchdog timeout' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    const promise = session._createLocalDescription('answer', {
      iceGatheringTimeout : 150
    });

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 145, `resolved after ${elapsed}ms, expected >= 150ms`);
        test.ok(elapsed < 1500, `resolved after ${elapsed}ms, expected < 1500ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'offer: default watchdog timeout is 2000ms' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    let resolvedAfter = null;

    const promise = session._createLocalDescription('offer', undefined);

    promise.then(() => { resolvedAfter = Date.now() - started; });

    setTimeout(() =>
    {
      test.strictEqual(resolvedAfter, null, 'not resolved before the default timeout');
    }, 1200);

    resolveWithin(promise, 3500)
      .then((sdp) =>
      {
        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          test.done();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed >= 1900, `resolved after ${elapsed}ms, expected >= 2000ms`);
        test.ok(elapsed < 3200, `resolved after ${elapsed}ms, expected < 3200ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified');
        test.done();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        test.done();
      });
  },

  'offer: null candidate (end-of-candidates) triggers ready without TypeError' :
  function(test)
  {
    const connection = new MockRTCPeerConnection();
    const session = createSession(connection);
    const started = Date.now();

    let finished = false;

    const finish = function()
    {
      if (!finished)
      {
        finished = true;
        test.done();
      }
    };

    const promise = session._createLocalDescription('offer', {
      iceGatheringTimeout : 1000
    });

    setTimeout(() =>
    {
      try
      {
        connection.emitIceCandidate(null);
      }
      catch (error)
      {
        test.ok(false, `icecandidate listener threw: ${error}`);
        finish();
      }
    }, 20);

    resolveWithin(promise, 2000)
      .then((sdp) =>
      {
        if (finished)
        {
          return;
        }

        if (sdp === TIMED_OUT)
        {
          test.ok(false, '_createLocalDescription() did not resolve');
          finish();

          return;
        }

        const elapsed = Date.now() - started;

        test.ok(elapsed < 400, `resolved after ${elapsed}ms, expected < 400ms`);
        test.strictEqual(sdp, SDP, 'SDP is unmodified');
        finish();
      })
      .catch((error) =>
      {
        test.ok(false, `_createLocalDescription() rejected: ${error}`);
        finish();
      });
  }
};
