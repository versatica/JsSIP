var Utils = {};

module.exports = Utils;


/**
 * Dependencies.
 */
var JsSIP_C = require('./Constants');
var URI = require('./URI');
var Grammar = require('./Grammar');


Utils.str_utf8_length = function(string) {
  return unescape(encodeURIComponent(string)).length;
};

Utils.isFunction = function(fn) {
  if (fn !== undefined) {
    return (Object.prototype.toString.call(fn) === '[object Function]')? true : false;
  } else {
    return false;
  }
};

Utils.isDecimal = function(num) {
  return !isNaN(num) && (parseFloat(num) === parseInt(num,10));
};

Utils.isEmpty = function(value) {
  if (value === null || value === "" || value === undefined || (value instanceof Array && value.length === 0) || (typeof(value) === 'number' && isNaN(value))) {
    return true;
  }
};

Utils.createRandomToken = function(size, base) {
  var i, r,
    token = '';

  base = base || 32;

  for( i=0; i < size; i++ ) {
    r = Math.random() * base|0;
    token += r.toString(base);
  }
  return token;
};

Utils.newTag = function() {
  return Utils.createRandomToken(10);
};

// http://stackoverflow.com/users/109538/broofa
Utils.newUUID = function() {
  var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });

  return UUID;
};

Utils.hostType = function(host) {
  if (!host) {
    return;
  } else {
    host = Grammar.parse(host,'host');
    if (host !== -1) {
      return host.host_type;
    }
  }
};

/**
* Normalize SIP URI.
* NOTE: It does not allow a SIP URI without username.
* Accepts 'sip', 'sips' and 'tel' URIs and convert them into 'sip'.
* Detects the domain part (if given) and properly hex-escapes the user portion.
* If the user portion has only 'tel' number symbols the user portion is clean of 'tel' visual separators.
*/
Utils.normalizeTarget = function(target, domain) {
  var uri, target_array, target_user, target_domain;

  // If no target is given then raise an error.
  if (!target) {
    return;
  // If a URI instance is given then return it.
  } else if (target instanceof URI) {
    return target;

  // If a string is given split it by '@':
  // - Last fragment is the desired domain.
  // - Otherwise append the given domain argument.
  } else if (typeof target === 'string') {
    target_array = target.split('@');

    switch(target_array.length) {
      case 1:
        if (!domain) {
          return;
        }
        target_user = target;
        target_domain = domain;
        break;
      case 2:
        target_user = target_array[0];
        target_domain = target_array[1];
        break;
      default:
        target_user = target_array.slice(0, target_array.length-1).join('@');
        target_domain = target_array[target_array.length-1];
    }

    // Remove the URI scheme (if present).
    target_user = target_user.replace(/^(sips?|tel):/i, '');

    // Remove 'tel' visual separators if the user portion just contains 'tel' number symbols.
    if (/^[\-\.\(\)]*\+?[0-9\-\.\(\)]+$/.test(target_user)) {
      target_user = target_user.replace(/[\-\.\(\)]/g, '');
    }

    // Build the complete SIP URI.
    target = JsSIP_C.SIP + ':' + Utils.escapeUser(target_user) + '@' + target_domain;

    // Finally parse the resulting URI.
    if ((uri = URI.parse(target))) {
      return uri;
    } else {
      return;
    }
  } else {
    return;
  }
};

/**
* Hex-escape a SIP URI user.
*/
Utils.escapeUser = function(user) {
  // Don't hex-escape ':' (%3A), '+' (%2B), '?' (%3F"), '/' (%2F).
  return encodeURIComponent(decodeURIComponent(user)).replace(/%3A/ig, ':').replace(/%2B/ig, '+').replace(/%3F/ig, '?').replace(/%2F/ig, '/');
};

Utils.headerize = function(string) {
  var exceptions = {
    'Call-Id': 'Call-ID',
    'Cseq': 'CSeq',
    'Www-Authenticate': 'WWW-Authenticate'
    },
    name = string.toLowerCase().replace(/_/g,'-').split('-'),
    hname = '',
    parts = name.length, part;

  for (part = 0; part < parts; part++) {
    if (part !== 0) {
      hname +='-';
    }
    hname += name[part].charAt(0).toUpperCase()+name[part].substring(1);
  }
  if (exceptions[hname]) {
    hname = exceptions[hname];
  }
  return hname;
};

Utils.sipErrorCause = function(status_code) {
  var cause;

  for (cause in JsSIP_C.SIP_ERROR_CAUSES) {
    if (JsSIP_C.SIP_ERROR_CAUSES[cause].indexOf(status_code) !== -1) {
      return JsSIP_C.causes[cause];
    }
  }

  return JsSIP_C.causes.SIP_FAILURE_CODE;
};

/**
* Generate a random Test-Net IP (http://tools.ietf.org/html/rfc5735)
*/
Utils.getRandomTestNetIP = function() {
  function getOctet(from,to) {
    return Math.floor(Math.random()*(to-from+1)+from);
  }
  return '192.0.2.' + getOctet(1, 254);
};

// MD5 (Message-Digest Algorithm) http://www.webtoolkit.info
Utils.calculateMD5 = function(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
  }

  function addUnsigned(lX,lY) {
    var lX4,lY4,lX8,lY8,lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }

  function doF(x,y,z) {
    return (x & y) | ((~x) & z);
  }

  function doG(x,y,z) {
    return (x & z) | (y & (~z));
  }

  function doH(x,y,z) {
    return (x ^ y ^ z);
  }

  function doI(x,y,z) {
    return (y ^ (x | (~z)));
  }

  function doFF(a,b,c,d,x,s,ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doF(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doGG(a,b,c,d,x,s,ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doG(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doHH(a,b,c,d,x,s,ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doH(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doII(a,b,c,d,x,s,ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doI(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1=lMessageLength + 8;
    var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
    var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
    var lWordArray = new Array(lNumberOfWords-1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while ( lByteCount < lMessageLength ) {
      lWordCount = (lByteCount-(lByteCount % 4))/4;
      lBytePosition = (lByteCount % 4)*8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount-(lByteCount % 4))/4;
    lBytePosition = (lByteCount % 4)*8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
    lWordArray[lNumberOfWords-2] = lMessageLength<<3;
    lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
    return lWordArray;
  }

  function wordToHex(lValue) {
    var wordToHexValue="",wordToHexValue_temp="",lByte,lCount;
    for (lCount = 0;lCount<=3;lCount++) {
      lByte = (lValue>>>(lCount*8)) & 255;
      wordToHexValue_temp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length-2,2);
    }
    return wordToHexValue;
  }

  function utf8Encode(string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  var x=[];
  var k,AA,BB,CC,DD,a,b,c,d;
  var S11=7, S12=12, S13=17, S14=22;
  var S21=5, S22=9 , S23=14, S24=20;
  var S31=4, S32=11, S33=16, S34=23;
  var S41=6, S42=10, S43=15, S44=21;

  string = utf8Encode(string);

  x = convertToWordArray(string);

  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

  for (k=0;k<x.length;k+=16) {
    AA=a; BB=b; CC=c; DD=d;
    a=doFF(a,b,c,d,x[k+0], S11,0xD76AA478);
    d=doFF(d,a,b,c,x[k+1], S12,0xE8C7B756);
    c=doFF(c,d,a,b,x[k+2], S13,0x242070DB);
    b=doFF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
    a=doFF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
    d=doFF(d,a,b,c,x[k+5], S12,0x4787C62A);
    c=doFF(c,d,a,b,x[k+6], S13,0xA8304613);
    b=doFF(b,c,d,a,x[k+7], S14,0xFD469501);
    a=doFF(a,b,c,d,x[k+8], S11,0x698098D8);
    d=doFF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
    c=doFF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
    b=doFF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a=doFF(a,b,c,d,x[k+12],S11,0x6B901122);
    d=doFF(d,a,b,c,x[k+13],S12,0xFD987193);
    c=doFF(c,d,a,b,x[k+14],S13,0xA679438E);
    b=doFF(b,c,d,a,x[k+15],S14,0x49B40821);
    a=doGG(a,b,c,d,x[k+1], S21,0xF61E2562);
    d=doGG(d,a,b,c,x[k+6], S22,0xC040B340);
    c=doGG(c,d,a,b,x[k+11],S23,0x265E5A51);
    b=doGG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
    a=doGG(a,b,c,d,x[k+5], S21,0xD62F105D);
    d=doGG(d,a,b,c,x[k+10],S22,0x2441453);
    c=doGG(c,d,a,b,x[k+15],S23,0xD8A1E681);
    b=doGG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
    a=doGG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
    d=doGG(d,a,b,c,x[k+14],S22,0xC33707D6);
    c=doGG(c,d,a,b,x[k+3], S23,0xF4D50D87);
    b=doGG(b,c,d,a,x[k+8], S24,0x455A14ED);
    a=doGG(a,b,c,d,x[k+13],S21,0xA9E3E905);
    d=doGG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
    c=doGG(c,d,a,b,x[k+7], S23,0x676F02D9);
    b=doGG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    a=doHH(a,b,c,d,x[k+5], S31,0xFFFA3942);
    d=doHH(d,a,b,c,x[k+8], S32,0x8771F681);
    c=doHH(c,d,a,b,x[k+11],S33,0x6D9D6122);
    b=doHH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a=doHH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
    d=doHH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
    c=doHH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
    b=doHH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a=doHH(a,b,c,d,x[k+13],S31,0x289B7EC6);
    d=doHH(d,a,b,c,x[k+0], S32,0xEAA127FA);
    c=doHH(c,d,a,b,x[k+3], S33,0xD4EF3085);
    b=doHH(b,c,d,a,x[k+6], S34,0x4881D05);
    a=doHH(a,b,c,d,x[k+9], S31,0xD9D4D039);
    d=doHH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
    c=doHH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
    b=doHH(b,c,d,a,x[k+2], S34,0xC4AC5665);
    a=doII(a,b,c,d,x[k+0], S41,0xF4292244);
    d=doII(d,a,b,c,x[k+7], S42,0x432AFF97);
    c=doII(c,d,a,b,x[k+14],S43,0xAB9423A7);
    b=doII(b,c,d,a,x[k+5], S44,0xFC93A039);
    a=doII(a,b,c,d,x[k+12],S41,0x655B59C3);
    d=doII(d,a,b,c,x[k+3], S42,0x8F0CCC92);
    c=doII(c,d,a,b,x[k+10],S43,0xFFEFF47D);
    b=doII(b,c,d,a,x[k+1], S44,0x85845DD1);
    a=doII(a,b,c,d,x[k+8], S41,0x6FA87E4F);
    d=doII(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
    c=doII(c,d,a,b,x[k+6], S43,0xA3014314);
    b=doII(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a=doII(a,b,c,d,x[k+4], S41,0xF7537E82);
    d=doII(d,a,b,c,x[k+11],S42,0xBD3AF235);
    c=doII(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
    b=doII(b,c,d,a,x[k+9], S44,0xEB86D391);
    a=addUnsigned(a,AA);
    b=addUnsigned(b,BB);
    c=addUnsigned(c,CC);
    d=addUnsigned(d,DD);
  }

  var temp = wordToHex(a)+wordToHex(b)+wordToHex(c)+wordToHex(d);

  return temp.toLowerCase();
};
