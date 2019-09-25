const Utils = require('./Utils');
const JsSIP_C = require('./Constants');
const Grammar = require('./Grammar');
const URI = require('./URI');
const Socket = require('./Socket');
const Exceptions = require('./Exceptions');

// Default settings.
exports.settings = {
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
  session_timers                : true,
  session_timers_refresh_method : JsSIP_C.UPDATE,
  no_answer_timeout             : 60,

  // Registration parameters.
  register         : true,
  register_expires : 600,
  registrar_server : null,

  // Connection options.
  sockets                          : null,
  connection_recovery_max_interval : JsSIP_C.CONNECTION_RECOVERY_MAX_INTERVAL,
  connection_recovery_min_interval : JsSIP_C.CONNECTION_RECOVERY_MIN_INTERVAL,

  /*
   * Host address.
   * Value to be set in Via sent_by and host part of Contact FQDN.
  */
  via_host : `${Utils.createRandomToken(12)}.invalid`,

  // Request reception
  content_type_share_state_regexp : null,
  content_type_enter_room_regexp  : null
};

// Configuration checks.
const checks = {
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
          if (Object.prototype.hasOwnProperty.call(socket, 'socket') &&
              Socket.isSocket(socket.socket))
          {
            _sockets.push(socket);
          }
          else if (Socket.isSocket(socket))
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

    user_agent(user_agent)
    {
      if (typeof user_agent === 'string')
      {
        return user_agent;
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
      return display_name;
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

    session_timers_refresh_method(method)
    {
      if (typeof method === 'string')
      {
        method = method.toUpperCase();

        if (method === JsSIP_C.INVITE || method === JsSIP_C.UPDATE)
        {
          return method;
        }
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
    },

    content_type_share_state_regexp(content_type_share_state_regexp)
    {
      if (content_type_share_state_regexp instanceof RegExp)
      {
        return content_type_share_state_regexp;
      }
    },

    content_type_enter_room_regexp(content_type_enter_room_regexp)
    {
      if (content_type_enter_room_regexp instanceof RegExp)
      {
        return content_type_enter_room_regexp;
      }
    }
  }
};

exports.load = (dst, src) =>
{
  // Check Mandatory parameters.
  for (const parameter in checks.mandatory)
  {
    if (!src.hasOwnProperty(parameter))
    {
      throw new Exceptions.ConfigurationError(parameter);
    }
    else
    {
      const value = src[parameter];
      const checked_value = checks.mandatory[parameter](value);

      if (checked_value !== undefined)
      {
        dst[parameter] = checked_value;
      }
      else
      {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters.
  for (const parameter in checks.optional)
  {
    if (src.hasOwnProperty(parameter))
    {
      const value = src[parameter];

      /* If the parameter value is null, empty string, undefined, empty array
       * or it's a number with NaN value, then apply its default value.
       */
      if (Utils.isEmpty(value))
      {
        continue;
      }

      const checked_value = checks.optional[parameter](value);

      if (checked_value !== undefined)
      {
        dst[parameter] = checked_value;
      }
      else
      {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }
};
