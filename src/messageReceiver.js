
/**
 * @fileoverview Message Receiver
 */

/**
 * SIP MESSAGE requests reception.
 * @augments JsSIP
 * @param {JsSIP.UA} ua
 * @param {JSIP.IncomingRequest} request
 */
JsSIP.messageReceiver = function(ua, request) {
  var content_type = request.getHeader('content-type');

  request.reply(200, JsSIP.c.REASON_200);

  if (content_type && content_type === "text/plain") {
    ua.emit('message',[request.s('from').user, request.s('from').uri, request.body]);
  }
  /*
  else if (content_type && content_type.match("application/im-iscomposing\\+xml") && message.body.match("<state>active</state>")) {
            GUI.phoneIsComposingReceived(message.from.uri, true);
  }
  else if (content_type && content_type.match("application/im-iscomposing\\+xml") && message.body.match("<state>idle</state>")) {
      GUI.phoneIsComposingReceived(message.from.uri, false);
  }*/
};