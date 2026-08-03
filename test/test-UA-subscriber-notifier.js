require('./include/common');
const JsSIP = require('../');
const LoopSocket = require('./include/loopSocket');

module.exports = {
  'subscriber/notifier communication' : function(test)
  {
    let eventSequence = 0;

    const TARGET = 'ikq';
    const REQUEST_URI = 'sip:ikq@example.com';
    const CONTACT_URI = 'sip:ikq@abcdefabcdef.invalid;transport=ws';
    const SUBSCRIBE_ACCEPT = 'application/text, text/plain';
    const EVENT_NAME = 'weather';
    const CONTENT_TYPE = 'text/plain';
    const WEATHER_REQUEST = 'Please report the weather condition';
    const WEATHER_REPORT = '+20..+24°C, no precipitation, light wind';

    /**
     * @param {JsSIP.UA} ua
     */
    function createSubscriber(ua)
    {
      const options = {
        expires     : 3600,
        contentType : CONTENT_TYPE,
        params      : null
      };

      const subscriber = ua.subscribe(TARGET, EVENT_NAME, SUBSCRIBE_ACCEPT, options);

      subscriber.on('active', () =>
      {
        // Receive notify with subscription-state: active.
        test.strictEqual(++eventSequence, 6);
      });

      subscriber.on('notify', (isFinal, notify, body, contType) =>
      {
        eventSequence++;
        // Receive notify.
        test.ok(eventSequence === 7 || eventSequence === 11);

        test.strictEqual(notify.method, 'NOTIFY');
        test.strictEqual(notify.getHeader('contact'), `<${CONTACT_URI}>`);
        test.strictEqual(body, WEATHER_REPORT);
        test.strictEqual(contType, CONTENT_TYPE);

        const subsState = notify.parseHeader('subscription-state').state;

        test.ok(subsState === 'pending' || subsState === 'active' || subsState === 'terminated');

        // After receiving the first notify, send un-subscribe.
        if (eventSequence === 7)
        {
          ++eventSequence; // Send un-subscribe.

          subscriber.terminate(WEATHER_REQUEST);
        }
      });

      subscriber.on('terminated', (terminationCode, reason, retryAfter) =>
      {
        test.strictEqual(++eventSequence, 12); // Subscriber terminated.
        test.strictEqual(terminationCode, subscriber.C.FINAL_NOTIFY_RECEIVED);
        test.strictEqual(reason, undefined);
        test.strictEqual(retryAfter, undefined);

        ua.stop();
      });

      subscriber.on('accepted', () =>
      {
        test.strictEqual(++eventSequence, 5); // Initial subscribe accepted.
      });

      test.strictEqual(++eventSequence, 2); // Send subscribe.

      subscriber.subscribe(WEATHER_REQUEST);
    }

    /**
     * @param {JsSIP.UA} ua
     */
    function createNotifier(ua, subscribe)
    {
      const notifier = ua.notify(subscribe, CONTENT_TYPE, { pending: false });

      // Receive subscribe (includes initial).
      notifier.on('subscribe', (isUnsubscribe, subs, body, contType) =>
      {
        test.strictEqual(subscribe.method, 'SUBSCRIBE');
        test.strictEqual(subscribe.getHeader('contact'), `<${CONTACT_URI}>`);
        test.strictEqual(subscribe.getHeader('accept'), SUBSCRIBE_ACCEPT);
        test.strictEqual(body, WEATHER_REQUEST);
        test.strictEqual(contType, CONTENT_TYPE);

        test.strictEqual(++eventSequence, isUnsubscribe ? 9 : 4);
        if (isUnsubscribe)
        {
          // Send final notify.
          notifier.terminate(WEATHER_REPORT);
        }
        else
        {
          // Send notify.
          notifier.notify(WEATHER_REPORT);
        }
      });

      // Example only. Never reached.
      notifier.on('expired', () =>
      {
        notifier.terminate(WEATHER_REPORT, 'timeout');
      });

      notifier.on('terminated', () =>
      {
        test.strictEqual(++eventSequence, 10); // Notifier terminated.
      });

      notifier.start();
    }

    // Start JsSIP UA with loop socket.
    const config =
    {
      sockets     : new LoopSocket(), // Message sending itself, with modified Call-ID.
      uri         : REQUEST_URI,
      contact_uri : CONTACT_URI,
      register    : false
    };

    const ua = new JsSIP.UA(config);

    // Uncomment to see SIP communication.
    // JsSIP.debug.enable('JsSIP:*');

    ua.on('newSubscribe', (e) =>
    {
      test.strictEqual(++eventSequence, 3); // Receive initial subscribe.

      const subs = e.request;
      const ev = subs.parseHeader('event');

      test.strictEqual(subs.ruri.toString(), REQUEST_URI);
      test.strictEqual(ev.event, EVENT_NAME);

      if (ev.event !== EVENT_NAME)
      {
        subs.reply(489); // "Bad Event".

        return;
      }

      const accepts = subs.getHeaders('accept');
      const canUse = accepts && accepts.some((v) => v.includes(CONTENT_TYPE));

      test.ok(canUse); // Notifier can use subscribe accept header.

      if (!canUse)
      {
        subs.reply(406); // "Not Acceptable".

        return;
      }

      createNotifier(ua, subs);
    });

    ua.on('connected', () =>
    {
      test.strictEqual(++eventSequence, 1); // Socket connected.

      createSubscriber(ua);
    });

    ua.on('disconnected', () =>
    {
      test.done();
    });

    ua.start();
  }
};
