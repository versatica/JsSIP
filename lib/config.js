const Utils = require('./Utils');
const JsSIP_C = require('./Constants');
const Grammar = require('./Grammar');
const URI = require('./URI');
const Socket = require('./Socket');

// Default settings.
module.exports.settings = {
  // SIP authentication.
  authorization_user : null,
  password           : null,
  realm              : null,
  ha1                : null,

  // SIP account.
  display_name : null,
  uri          : null,
  contact_uri  : null,

  // SIP instance id (GRUU).
  instance_id : null,

  // Preloaded SIP Route header field.
  use_preloaded_route : false,

  // Session parameters.
  session_timers    : true,
  no_answer_timeout : 60,

  // Registration parameters.
  register         : true,
  register_expires : 600,
  registrar_server : null,

  // Connection options.
  sockets                          : null,
  connection_recovery_max_interval : null,
  connection_recovery_min_interval : null,

  /*
   * Host address.
   * Value to be set in Via sent_by and host part of Contact FQDN.
  */
  via_host : `${Utils.createRandomToken(12)}.invalid`
};

// Configuration checker.
module.exports.check = {
  mandatory : {

    sockets(sockets)
    {
      /* Allow defining sockets parameter as:
       *  Socket: socket
       *  Array of Socket: [socket1, socket2]
       *  Array of Objects: [{socket: socket1, weight:1}, {socket: Socket2, weight:0}]
       *  Array of Objects and Socket: [{socket: socket1}, socket2]
       */
      const _sockets = [];

      if (Socket.isSocket(sockets))
      {
        _sockets.push({ socket: sockets });
      }
      else if (Array.isArray(sockets) && sockets.length)
      {
        for (const socket of sockets)
        {
          if (Socket.isSocket(socket))
          {
            _sockets.push({ socket: socket });
          }
        }
      }
      else
      {
        return;
      }

      return _sockets;
    },

    uri(uri)
    {
      if (!/^sip:/i.test(uri))
      {
        uri = `${JsSIP_C.SIP}:${uri}`;
      }
      const parsed = URI.parse(uri);

      if (!parsed)
      {
        return;
      }
      else if (!parsed.user)
      {
        return;
      }
      else
      {
        return parsed;
      }
    }
  },

  optional : {

    authorization_user(authorization_user)
    {
      if (Grammar.parse(`"${authorization_user}"`, 'quoted_string') === -1)
      {
        return;
      }
      else
      {
        return authorization_user;
      }
    },

    connection_recovery_max_interval(connection_recovery_max_interval)
    {
      if (Utils.isDecimal(connection_recovery_max_interval))
      {
        const value = Number(connection_recovery_max_interval);

        if (value > 0)
        {
          return value;
        }
      }
    },

    connection_recovery_min_interval(connection_recovery_min_interval)
    {
      if (Utils.isDecimal(connection_recovery_min_interval))
      {
        const value = Number(connection_recovery_min_interval);

        if (value > 0)
        {
          return value;
        }
      }
    },

    contact_uri(contact_uri)
    {
      if (typeof contact_uri === 'string')
      {
        const uri = Grammar.parse(contact_uri, 'SIP_URI');

        if (uri !== -1)
        {
          return uri;
        }
      }
    },

    display_name(display_name)
    {
      if (Grammar.parse(`"${display_name}"`, 'display_name') === -1)
      {
        return;
      }
      else
      {
        return display_name;
      }
    },

    instance_id(instance_id)
    {
      if ((/^uuid:/i.test(instance_id)))
      {
        instance_id = instance_id.substr(5);
      }

      if (Grammar.parse(instance_id, 'uuid') === -1)
      {
        return;
      }
      else
      {
        return instance_id;
      }
    },

    no_answer_timeout(no_answer_timeout)
    {
      if (Utils.isDecimal(no_answer_timeout))
      {
        const value = Number(no_answer_timeout);

        if (value > 0)
        {
          return value;
        }
      }
    },

    session_timers(session_timers)
    {
      if (typeof session_timers === 'boolean')
      {
        return session_timers;
      }
    },

    password(password)
    {
      return String(password);
    },

    realm(realm)
    {
      return String(realm);
    },

    ha1(ha1)
    {
      return String(ha1);
    },

    register(register)
    {
      if (typeof register === 'boolean')
      {
        return register;
      }
    },

    register_expires(register_expires)
    {
      if (Utils.isDecimal(register_expires))
      {
        const value = Number(register_expires);

        if (value > 0)
        {
          return value;
        }
      }
    },

    registrar_server(registrar_server)
    {
      if (!/^sip:/i.test(registrar_server))
      {
        registrar_server = `${JsSIP_C.SIP}:${registrar_server}`;
      }

      const parsed = URI.parse(registrar_server);

      if (!parsed)
      {
        return;
      }
      else if (parsed.user)
      {
        return;
      }
      else
      {
        return parsed;
      }
    },

    use_preloaded_route(use_preloaded_route)
    {
      if (typeof use_preloaded_route === 'boolean')
      {
        return use_preloaded_route;
      }
    }
  }
};
