
/**
 * @fileoverview DigestAuthentication
 */

/**
 * SIP Digest Authentication.
 * @augments JsSIP.
 * @function Digest Authentication
 * @param {JsSIP.UA} ua
 * @param {JsSIP.OutgoingRequest} request
 * @param {JsSIP.IncomingResponse} response
 * @returns {String}
 */
JsSIP.DigestAuthentication = function (ua, request, response) {
  var authenticate, ha1, ha2, param,
    authorization = {},
    digest = '',
    nc = "00000001",
    cnonce = Math.random().toString(36).substr(2, 12),
    credentials = {
      username: ua.configuration.authorization_user,
      password: ua.configuration.password
    };

  if(response.status_code === 401) {
    authenticate = response.parseHeader('www-authenticate');
  } else {
    authenticate = response.parseHeader('proxy-authenticate');
  }

  response = {
    realm: authenticate.realm.replace(/"/g,''),
    qop: authenticate.qop || null,
    nonce: authenticate.nonce.replace(/"/g,'')
  };

  // HA1 = MD5(A1) = MD5(username:realm:password)
  ha1 = JsSIP.utils.MD5(credentials.username + ":" + response.realm + ":" + credentials.password);

  switch(response.qop) {
    case 'auth-int':
      // HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody))
      ha2 = JsSIP.utils.MD5(request.method + ":" + request.ruri + ":" + JsSIP.utils.MD5(request.body ? request.body : ""));
      break;
    default:
      // HA2 = MD5(A2) = MD5(method:digestURI)
      ha2 = JsSIP.utils.MD5(request.method + ":" + request.ruri);
  }

  if(response.qop) {
    // response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2)
    response = JsSIP.utils.MD5(ha1 + ":" + response.nonce + ":" + nc + ":" + cnonce + ":" + response.qop + ":" + ha2);
  } else {
    // response = MD5(HA1:nonce:HA2)
    response = JsSIP.utils.MD5(ha1 + ":" + response.nonce + ":" + ha2);
  }

  // Fill the Authorization object
  authorization.username = '"' + credentials.username + '"';
  authorization.realm = authenticate.realm;
  authorization.nonce = authenticate.nonce;
  authorization.uri = '"' + request.ruri + '"';
  authorization.qop = authenticate.qop || null;
  authorization.response = '"' + response + '"';
  authorization.algorithm = "MD5";
  authorization.opaque = authenticate.opaque || null;
  authorization.cnonce = authenticate.qop ? '"' + cnonce + '"' : null;
  authorization.nc = authenticate.qop ? nc : null;

  for(param in authorization) {
    if(authorization[param] !== null) {
      digest += ',' + param + '=' + authorization[param];
    }
  }

  return 'Digest ' + digest.substr(1);
};
