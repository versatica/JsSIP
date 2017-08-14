'use strict';

const C = {
  // RTCSession states
  STATUS_NULL:               0,
  STATUS_INVITE_SENT:        1,
  STATUS_1XX_RECEIVED:       2,
  STATUS_INVITE_RECEIVED:    3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED:           5,
  STATUS_WAITING_FOR_ACK:    6,
  STATUS_CANCELED:           7,
  STATUS_TERMINATED:         8,
  STATUS_CONFIRMED:          9
};

module.exports = C;

