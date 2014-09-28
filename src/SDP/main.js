(function(JsSIP) {

  var parser = require('sdp-transform');

  JsSIP.Parser.parseSDP = parser.parse;
  JsSIP.Parser.writeSDP = parser.write;
  JsSIP.Parser.parseFmtpConfig = parser.parseFmtpConfig;
  JsSIP.Parser.parsePayloads = parser.parsePayloads;
  JsSIP.Parser.parseRemoteCandidates = parser.parseRemoteCandidates;

}(JsSIP));

