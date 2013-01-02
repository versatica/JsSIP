
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
 */
JsSIP.DigestAuthentication = function (ua, request, response) {
  var authenticate, realm, qop, nonce, opaque,
    username = ua.configuration.authorization_user,
    password = ua.configuration.password;

  if(response.status_code === 401) {
    authenticate = response.parseHeader('www-authenticate');
  } else {
    authenticate = response.parseHeader('proxy-authenticate');
  }

  realm = authenticate.realm.replace(/"/g,'');
  qop = authenticate.qop || null;
  nonce = authenticate.nonce.replace(/"/g,'');
  opaque = authenticate.opaque;

  this.password = password;
  this.method   = request.method;

  this.username = username;
  this.realm = realm;
  this.nonce = nonce;
  this.uri = request.ruri;
  this.qop = qop;
  this.response = null;
  this.algorithm = "MD5";
  this.opaque = opaque;
  this.cnonce = null;
  this.nc = 0;
};

JsSIP.DigestAuthentication.prototype.authenticate = function(password) {
  var ha1, ha2;

  password = password || this.password;

  this.cnonce = Math.random().toString(36).substr(2, 12);
  this.nc += 1;

  // nc-value = 8LHEX. Max value = 'FFFFFFFF'
  if (this.nc === 4294967296) {
    console.log('Maximum "nc" value has been reached. Reseting "nc"');
    this.nc = 1;
  }

  // HA1 = MD5(A1) = MD5(username:realm:password)
  ha1 = JsSIP.utils.MD5(this.username + ":" + this.realm + ":" + password);

  if (this.qop === 'auth' || this.qop === null) {
    // HA2 = MD5(A2) = MD5(method:digestURI)
    ha2 = JsSIP.utils.MD5(this.method + ":" + this.uri);

  } else if (this.qop === 'auth-int') {
    // HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody))
    ha2 = JsSIP.utils.MD5(this.method + ":" + this.uri + ":" + JsSIP.utils.MD5(this.body ? this.body : ""));
  }

  if(this.qop === 'auth' || this.qop === 'auth-int') {
    // response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2)
    this.response = JsSIP.utils.MD5(ha1 + ":" + this.nonce + ":" + this.decimalToHex(this.nc) + ":" + this.cnonce + ":" + this.qop + ":" + ha2);
  } else {
    // response = MD5(HA1:nonce:HA2)
    this.response = JsSIP.utils.MD5(ha1 + ":" + this.nonce + ":" + ha2);
  }

  return this.toString();
};


JsSIP.DigestAuthentication.prototype.update = function(response) {
  var authenticate, nonce;

  if(response.status_code === 401) {
    authenticate = response.parseHeader('www-authenticate');
  } else {
    authenticate = response.parseHeader('proxy-authenticate');
  }

  nonce = authenticate.nonce.replace(/"/g,'');

  if(nonce !== this.nonce) {
    this.nc = 0;
    this.nonce = nonce;
  }

  this.realm = authenticate.realm.replace(/"/g,'');
  this.qop = authenticate.qop || null;
  this.opaque = authenticate.opaque;
};


JsSIP.DigestAuthentication.prototype.toString = function() {
  var authorization = 'Digest ';

  authorization += 'username="' + this.username + '",';
  authorization += 'realm="' + this.realm + '",';
  authorization += 'nonce="' + this.nonce + '",';
  authorization += 'uri="' + this.uri + '",';
  authorization += 'response="' + this.response + '",';
  authorization += this.opaque ? 'opaque="' + this.opaque + '",': '';
  authorization += this.qop ? 'qop=' + this.qop + ',' : '';
  authorization += this.qop ? 'cnonce="' + this.cnonce + '",' : '';
  authorization += this.qop ? 'nc=' + this.decimalToHex(this.nc) + ',': '';
  authorization += 'algorithm=MD5';

  return authorization;
};


JsSIP.DigestAuthentication.prototype.decimalToHex = function(decimal) {
  var hex = Number(decimal).toString(16);
  return '00000000'.substr(0, 8-hex.length) + hex;
};
