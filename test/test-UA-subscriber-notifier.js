require('./include/common');
const JsSIP = require('../');
const LoopSocket = require('./include/loopSocket');

describe('subscriber/notifier communication', () =>
{
  test('should handle subscriber/notifier communication', () => new Promise((resolve) =>
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
        // 'receive notify with subscription-state: active'
        expect(++eventSequence).toBe(6);
      });

      subscriber.on('notify', (isFinal, notify, body, contType) =>
      {
        eventSequence++;
        // 'receive notify'
        expect(eventSequence === 7 || eventSequence === 11).toBe(true);

        expect(notify.method).toBe('NOTIFY');
        expect(notify.getHeader('contact')).toBe(`<${CONTACT_URI}>`); // 'notify contact'
        expect(body).toBe(WEATHER_REPORT); // 'notify body'
        expect(contType).toBe(CONTENT_TYPE); // 'notify content-type'

        const subsState = notify.parseHeader('subscription-state').state;

        expect(subsState === 'pending' || subsState === 'active' || subsState === 'terminated').toBe(true); // 'notify subscription-state'

        // After receiving the first notify, send un-subscribe.
        if (eventSequence === 7)
        {
          ++eventSequence; // 'send un-subscribe'

          subscriber.terminate(WEATHER_REQUEST);
        }
      });

      subscriber.on('terminated', (terminationCode, reason, retryAfter) =>
      {
        expect(++eventSequence).toBe(12); // 'subscriber terminated'
        expect(terminationCode).toBe(subscriber.C.FINAL_NOTIFY_RECEIVED);
        expect(reason).toBeUndefined();
        expect(retryAfter).toBeUndefined();

        ua.stop();
      });

      subscriber.on('accepted', () =>
      {
        expect(++eventSequence).toBe(5); // 'initial subscribe accepted'
      });

      expect(++eventSequence).toBe(2); // 'send subscribe'

      subscriber.subscribe(WEATHER_REQUEST);
    }

    /**
     * @param {JsSIP.UA} ua
     */
    function createNotifier(ua, subscribe)
    {
      const notifier = ua.notify(subscribe, CONTENT_TYPE, { pending: false });

      // Receive subscribe (includes initial)
      notifier.on('subscribe', (isUnsubscribe, subs, body, contType) =>
      {
        expect(subscribe.method).toBe('SUBSCRIBE');
        expect(subscribe.getHeader('contact')).toBe(`<${CONTACT_URI}>`); // 'subscribe contact'
        expect(subscribe.getHeader('accept')).toBe(SUBSCRIBE_ACCEPT); // 'subscribe accept'
        expect(body).toBe(WEATHER_REQUEST); // 'subscribe body'
        expect(contType).toBe(CONTENT_TYPE); // 'subscribe content-type'

        expect(++eventSequence).toBe(isUnsubscribe ? 9 : 4);
        if (isUnsubscribe)
        {
          // 'send final notify'
          notifier.terminate(WEATHER_REPORT);
        }
        else
        {
          // 'send notify'
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
        expect(++eventSequence).toBe(10); // 'notifier terminated'
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
      expect(++eventSequence).toBe(3); // 'receive initial subscribe'

      const subs = e.request;
      const ev = subs.parseHeader('event');

      expect(subs.ruri.toString()).toBe(REQUEST_URI); // 'initial subscribe uri'
      expect(ev.event).toBe(EVENT_NAME); // 'subscribe event'

      if (ev.event !== EVENT_NAME)
      {
        subs.reply(489); // "Bad Event"

        return;
      }

      const accepts = subs.getHeaders('accept');
      const canUse = accepts && accepts.some((v) => v.includes(CONTENT_TYPE));

      expect(canUse).toBe(true); // 'notifier can use subscribe accept header'

      if (!canUse)
      {
        subs.reply(406); // "Not Acceptable"

        return;
      }

      createNotifier(ua, subs);
    });

    ua.on('connected', () =>
    {
      expect(++eventSequence).toBe(1); // 'socket connected'

      createSubscriber(ua);
    });

    ua.on('disconnected', () =>
    {
      resolve();
    });

    ua.start();
  }));
});
