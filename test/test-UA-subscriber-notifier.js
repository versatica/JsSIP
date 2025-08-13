/* eslint no-console: 0*/

require('./include/common');
const JsSIP = require('../');
const LoopSocket = require('./include/LoopSocket');

module.exports = {
  'subscriber/notifier communication' : function(test)
  {
    test.expect(39);

    let eventSequence = 0;

    const TARGET = 'ikq';
    const REQUEST_URI = 'sip:ikq@example.com';
    const CONTACT_URI = 'sip:ikq@abcdefabcdef.invalid;transport=ws';
    const SUBSCRIBE_ACCEPT = 'application/text, text/plain';
    const EVENT_NAME = 'weather';
    const CONTENT_TYPE = 'text/plain';
    const WEATHER_REQUEST = 'Please report the weather condition';
    const WEATHER_REPORT = '+20..+24°C, no precipitation, light wind';

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
        test.ok(++eventSequence === 6, 'receive notify with subscription-state: active');
      });

      subscriber.on('notify', (isFinal, notify, body, contType) =>
      {
        eventSequence++;
        test.ok(eventSequence === 7 || eventSequence === 11, 'receive notify');

        test.strictEqual(notify.method, 'NOTIFY');
        test.strictEqual(notify.getHeader('contact'), `<${CONTACT_URI}>`, 'notify contact');
        test.strictEqual(body, WEATHER_REPORT, 'notify body');
        test.strictEqual(contType, CONTENT_TYPE, 'notify content-type');

        const subsState = notify.parseHeader('subscription-state').state;

        test.ok(subsState === 'pending' || subsState === 'active' || subsState === 'terminated', 'notify subscription-state');

        // After receiving the first notify, send un-subscribe.
        if (eventSequence === 7)
        {
          test.ok(++eventSequence === 8, 'send un-subscribe');

          subscriber.terminate(WEATHER_REQUEST);
        }
      });

      subscriber.on('terminated', (terminationCode, reason, retryAfter) =>
      {
        test.ok(++eventSequence === 12, 'subscriber terminated');
        test.ok(terminationCode === subscriber.C.RECEIVE_FINAL_NOTIFY);
        test.ok(reason === undefined);
        test.ok(retryAfter === undefined);

        ua.stop();

        test.done();
      });

      subscriber.on('accepted', () =>
      {
        test.ok(++eventSequence === 5, 'initial subscribe accepted');
      });

      test.ok(++eventSequence === 2, 'send subscribe');

      subscriber.subscribe(WEATHER_REQUEST);
    }

    function createNotifier(ua, subscribe)
    {
      const notifier = ua.notify(subscribe, CONTENT_TYPE, { pending: false });

      // Receive subscribe (includes initial)
      notifier.on('subscribe', (isUnsubscribe, subs, body, contType) =>
      {
        test.strictEqual(subscribe.method, 'SUBSCRIBE');
        test.strictEqual(subscribe.getHeader('contact'), `<${CONTACT_URI}>`, 'subscribe contact');
        test.strictEqual(subscribe.getHeader('accept'), SUBSCRIBE_ACCEPT, 'subscribe accept');
        test.strictEqual(body, WEATHER_REQUEST, 'subscribe body');
        test.strictEqual(contType, CONTENT_TYPE, 'subscribe content-type');

        if (isUnsubscribe)
        {
          test.ok(++eventSequence === 9, 'receive un-subscribe, send final notify');

          notifier.terminate(WEATHER_REPORT);
        }
        else
        {
          test.ok(++eventSequence === 4, 'receive subscribe, send notify');

          notifier.notify(WEATHER_REPORT);
        }
      });

      notifier.on('terminated', (terminationCode, sendFinalNotify) =>
      {
        test.ok(++eventSequence === 10, 'notifier terminated');
        test.ok(!sendFinalNotify, 'final notify sending if subscription expired');

        if (sendFinalNotify)
        {
          notifier.terminate(WEATHER_REPORT, 'timeout');
        }
      });

      notifier.start();
    }

    // Start JsSIP UA with loop socket.
    const config =
    {
      sockets     : new LoopSocket(), // message sending itself, with modified Call-ID
      uri         : REQUEST_URI,
      contact_uri : CONTACT_URI,
      register    : false
    };

    const ua = new JsSIP.UA(config);

    // Uncomment to see SIP communication
    // JsSIP.debug.enable('JsSIP:*');

    ua.on('newSubscribe', (e) =>
    {
      test.ok(++eventSequence === 3, 'receive initial subscribe');

      const subs = e.request;
      const ev = subs.parseHeader('event');

      test.strictEqual(subs.ruri.toString(), REQUEST_URI, 'initial subscribe uri');
      test.strictEqual(ev.event, EVENT_NAME, 'subscribe event');

      if (ev.event !== EVENT_NAME)
      {
        subs.reply(489); // "Bad Event"

        return;
      }

      const accepts = subs.getHeaders('accept');
      const canUse = accepts && accepts.some((v) => v.includes(CONTENT_TYPE));

      test.ok(canUse, 'notifier can use subscribe accept header');

      if (!canUse)
      {
        subs.reply(406); // "Not Acceptable"

        return;
      }

      createNotifier(ua, subs);
    });

    ua.on('connected', () =>
    {
      test.ok(++eventSequence === 1, 'socket connected');

      createSubscriber(ua);
    });

    ua.start();
  }
};
