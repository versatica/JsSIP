const T1Udp = 30000;
const T2Udp = T1Udp * 3;
const T1 = 500;
const T4 = 5000;

module.exports = {
  T1Udp,
  T2Udp,
  T4,
  TIMER_B                       : 64 * T1,
  TIMER_D                       : 0 * T1,
  TIMER_F                       : 64 * T1,
  TIMER_H                       : 64 * T1,
  TIMER_I                       : 0 * T1,
  TIMER_J                       : 0 * T1,
  TIMER_K                       : 0 * T4,
  TIMER_L                       : 64 * T1,
  TIMER_M                       : 64 * T1,
  PROVISIONAL_RESPONSE_INTERVAL : 60000 // See RFC 3261 Section 13.3.1.1
};
