require('./include/common');
const DigestAuthentication = require('../src/DigestAuthentication.js');

// Results of this tests originally obtained from RFC 2617 and:
// 'https://pernau.at/kd/sipdigest.php'

describe('DigestAuthentication', () =>
{
  test('parse no auth testrealm@host.com -RFC 2617-', () =>
  {
    const method = 'GET';
    const ruri = '/dir/index.html';
    const cnonce = '0a4f113b';
    const credentials =
    {
      username : 'Mufasa',
      password : 'Circle Of Life',
      realm    : 'testrealm@host.com',
      ha1      : null
    };
    const challenge =
    {
      algorithm : 'MD5',
      realm     : 'testrealm@host.com',
      nonce     : 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
      opaque    : '5ccc069c403ebaf9f0171e9517f40e41',
      stale     : null,
      qop       : 'auth'
    };

    const digest = new DigestAuthentication(credentials);

    digest.authenticate({ method, ruri }, challenge, cnonce);

    expect(digest._response).toBe('6629fae49393a05397450978507c4ef1');
  });

  test('digest authenticate qop = null', () =>
  {
    const method = 'REGISTER';
    const ruri = 'sip:testrealm@host.com';
    const credentials = {
      username : 'testuser',
      password : 'testpassword',
      realm    : 'testrealm@host.com',
      ha1      : null
    };
    const challenge =
    {
      algorithm : 'MD5',
      realm     : 'testrealm@host.com',
      nonce     : '5a071f75353f667787615249c62dcc7b15a4828f',
      opaque    : null,
      stale     : null,
      qop       : null
    };

    const digest = new DigestAuthentication(credentials);

    digest.authenticate({ method, ruri }, challenge);

    expect(digest._response).toBe('f99e05f591f147facbc94ff23b4b1dee');
  });

  test('digest authenticate qop = auth', () =>
  {
    const method = 'REGISTER';
    const ruri = 'sip:testrealm@host.com';
    const cnonce = '0a4f113b';
    const credentials =
    {
      username : 'testuser',
      password : 'testpassword',
      realm    : 'testrealm@host.com',
      ha1      : null
    };
    const challenge =
    {
      algorithm : 'MD5',
      realm     : 'testrealm@host.com',
      nonce     : '5a071f75353f667787615249c62dcc7b15a4828f',
      opaque    : null,
      stale     : null,
      qop       : 'auth'
    };

    const digest = new DigestAuthentication(credentials);

    digest.authenticate({ method, ruri }, challenge, cnonce);

    expect(digest._response).toBe('a69b9c2ea0dea1437a21df6ddc9b05e4');
  });

  test('digest authenticate qop = auth-int and empty body', () =>
  {
    const method = 'REGISTER';
    const ruri = 'sip:testrealm@host.com';
    const cnonce = '0a4f113b';
    const credentials =
    {
      username : 'testuser',
      password : 'testpassword',
      realm    : 'testrealm@host.com',
      ha1      : null
    };
    const challenge =
    {
      algorithm : 'MD5',
      realm     : 'testrealm@host.com',
      nonce     : '5a071f75353f667787615249c62dcc7b15a4828f',
      opaque    : null,
      stale     : null,
      qop       : 'auth-int'
    };

    const digest = new DigestAuthentication(credentials);

    digest.authenticate({ method, ruri }, challenge, cnonce);

    expect(digest._response).toBe('82b3cab8b1c4df404434db6a0581650c');
  });

  test('digest authenticate qop = auth-int and non-empty body', () =>
  {
    const method = 'REGISTER';
    const ruri = 'sip:testrealm@host.com';
    const body = 'TEST BODY';
    const cnonce = '0a4f113b';
    const credentials =
    {
      username : 'testuser',
      password : 'testpassword',
      realm    : 'testrealm@host.com',
      ha1      : null
    };
    const challenge =
    {
      algorithm : 'MD5',
      realm     : 'testrealm@host.com',
      nonce     : '5a071f75353f667787615249c62dcc7b15a4828f',
      opaque    : null,
      stale     : null,
      qop       : 'auth-int'
    };

    const digest = new DigestAuthentication(credentials);

    digest.authenticate({ method, ruri, body }, challenge, cnonce);

    expect(digest._response).toBe('7bf0e9de3fbb5da121974509d617f532');
  });
});
