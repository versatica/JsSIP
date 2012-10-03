$(document).ready(function(){

  // Default settings.
  var default_sip_uri = "jmillan@jssip.net";
  var default_sip_password = '';
  var outbound_proxy_set = {
    host: "tryit.jssip.net:10080",
    ws_path:'ws',
    ws_query: 'wwdf'
  };


  // Global variables.
  PageTitle = "SIP on the Web";
  document.title = PageTitle;

  $("#version .jssip-version").text("JsSIP version:  " + JsSIP.version());
  $("#version .jssip-svn-revision").text("SVN revision:  " + JsSIP.svn_revision());
  $("#version").show();

  sip_uri = default_sip_uri;
  sip_password = default_sip_password;

  login_inputs = $("#login-box input");
  login_sip_uri = $("#login-box input#sip_uri");
  login_sip_password = $("#login-box input#sip_password");
  login_ws_uri = $("#login-box input#ws_uri");

  register_checkbox = $("#phone > .status #register");

  phone_dialed_number_screen = $("#phone > .controls  input.destination");

  phone_call_button = $("#phone > .controls > .dialbox > .dial-buttons > .call");

  phone_chat_button = $("#phone > .controls > .dialbox > .dial-buttons > .chat");

  phone_dialpad_button = $("#phone > .controls > .dialpad .button");

  soundPlayer = document.createElement("audio");
  soundPlayer.volume = 1;


  // Local variables.
  var theme01 = $("#themes > div.theme01");
  var theme02 = $("#themes > div.theme02");
  var theme03 = $("#themes > div.theme03");
  var theme04 = $("#themes > div.theme04");
  var theme05 = $("#themes > div.theme05");


  // Initialization.
  $("#login-page").height($(window).height());
  $("#login-page").width($(window).width());

  $(window).resize(function(event) {
    $("#login-page").height($(window).height());
    $("#login-page").width($(window).width());
  });

  login_inputs.focus(function() {
    if ($(this).hasClass("unset")) {
      $(this).val("");
      $(this).removeClass("unset");
    }
  });

  login_sip_uri.blur(function() {
    if ($(this).val() == "") {
      $(this).addClass("unset");
      $(this).val("SIP username");
    }
  });

  login_sip_password.blur(function() {
    if ($(this).val() == "") {
      $(this).addClass("unset");
      $(this).val("SIP password");
    }
  });

  login_ws_uri.blur(function() {
    if ($(this).val() == "") {
      $(this).addClass("unset");
      $(this).val("WS URI (i.e: wss://example.net)");
    }
  });


  login_inputs.keypress(function(e) {
    // Enter pressed?.
    if (e.which == 13) {

      if (login_sip_uri.val() != "" && ! login_sip_uri.hasClass("unset"))
        sip_uri = login_sip_uri.val();
      if (login_sip_password.val() != "" && ! login_sip_password.hasClass("unset"))
        sip_password = login_sip_password.val();
      if (login_ws_uri.val() != "" && ! login_ws_uri.hasClass("unset")) {
        ws_uri = login_ws_uri.val();
        if (!check_ws_uri(ws_uri)) {
          alert("Invalid WS URI field");
          return;
        } else {
          outbound_proxy_set = check_ws_uri(ws_uri);
        }
      }

      if (sip_uri == null) {
        alert("Please fill SIP uri field");
        return;
      }
      else if (sip_password == null) {
        alert("Please fill SIP password field");
        return;
      }
      else if (ws_uri == null) {
        alert("Please fill WS URI field");
        return;
      }

      phone_init();
    }
  });

  theme01.click(function(event) {
    $("body").removeClass();
    $("body").addClass("bg01");
  });

  theme02.click(function(event) {
    $("body").removeClass();
    $("body").addClass("bg02");
  });

  theme03.click(function(event) {
    $("body").removeClass();
    $("body").addClass("bg03");
  });

  theme04.click(function(event) {
    $("body").removeClass();
    $("body").addClass("bg04");
  });

  theme05.click(function(event) {
    $("body").removeClass();
    $("body").addClass("bg05");
  });


  register_checkbox.change(function(event) {
    if ($(this).is(":checked")) {
      console.warn("register_checkbox has been checked");
      // Don't change current status for now. Registration callbacks will do it.
      register_checkbox.attr("checked", false);
      // Avoid new change until the registration action ends.
      register_checkbox.attr("disabled", true);
      MyPhone.register();
    }
    else {
      console.warn("register_checkbox has been unchecked");
      // Don't change current status for now. Registration callbacks will do it.
      register_checkbox.attr("checked", true);
      // Avoid new change until the registration action ends.
      register_checkbox.attr("disabled", true);
      MyPhone.deregister();
    }
  });

  // NOTE: Para hacer deregister_all (esquina arriba-dcha un cuadro
  // transparente de 20 x 20 px.
  $("#deregister_all").click(function() {
    MyPhone.deregister('all');
  });

  // NOTE: Para desconectarse/conectarse al WebSocket.
  $("#ws_reconnect").click(function() {
    if (MyPhone.transport.connected)
      MyPhone.transport.disconnect();
    else
      MyPhone.transport.connect();
  });

  phone_call_button.click(function(event) {
    GUI.phoneCallButtonPressed();
  });

  phone_chat_button.click(function(event) {
    GUI.phoneChatButtonPressed();
  });

  phone_dialpad_button.click(function() {
    if ($(this).hasClass("digit-asterisk"))
      sound_file = "asterisk";
    else if ($(this).hasClass("digit-pound"))
      sound_file = "pound";
    else
      sound_file = $(this).text();
    soundPlayer.setAttribute("src", "sounds/dialpad/" + sound_file + ".ogg");
    soundPlayer.play();

    phone_dialed_number_screen.val(phone_dialed_number_screen.val() + $(this).text());
    //phone_dialed_number_screen.focus();
  });

  phone_dialed_number_screen.keypress(function(e) {
     // Enter pressed? so Dial.
    if (e.which == 13)
      GUI.phoneCallButtonPressed();
  });


  function phone_init() {
    $("#phone > .status .user").text(sip_uri);
    $("#login-page").fadeOut(1000, function() {
      $(this).remove();
    });

    var configuration  = {
      'outbound_proxy_set':  [outbound_proxy_set],
      'uri': sip_uri,
      'display_name': '',
      'password':  sip_password,
      'register_expires': 120,
      'secure_transport': false,
      'via_host': random_host(),
      'stun_server': 'aliax.net',
      'hack_use_via_tcp': true
    };

    try {
      MyPhone = new JsSIP.UA(configuration);
    } catch(e) {
      console.log(e);
      return;
    }

    // Transport connection/disconnection callbacks
    MyPhone.on('connect', ws_connected);
    MyPhone.on('disconnect', ws_disconnected);

    // Call/Message reception callbacks
    MyPhone.on('call', function(display_name, uri, call) {
      GUI.phoneCallReceived(display_name, uri, call)
      }
    );

    MyPhone.on('message', function(display_name, uri, text) {
      GUI.phoneChatReceived(display_name, uri, text)
      }
    );

    // Registration/Deregistration callbacks
    MyPhone.on('register', function(){
      console.info('Registered');
      GUI.setStatus("registered");
      }
    );

    MyPhone.on('deregister', function(){
      console.info('Deregistered');
      GUI.setStatus("connected");
      }
    );

    MyPhone.on('registrationFailure', function() {
      console.info('Registration failure');
      GUI.setStatus("connected");
      }
    );

    // Start
    MyPhone.start();
  }

  function ws_connected() {
    document.title = PageTitle;
    GUI.setStatus("connected");
    // Habilitar el phone.
    $("#phone .controls .ws-disconnected").hide();
  };

  function ws_disconnected() {
    document.title = PageTitle;
    GUI.setStatus("disconnected");
    // Deshabilitar el phone.
    $("#phone .controls .ws-disconnected").show();
    // Eliminar todas las sessiones existentes.
    $("#sessions > .session").each(function(i, session) {
      GUI.removeSession(session, 500);
    });
  };

  function random_host() {
    function get_octet() {
      return (Math.random() * 255 | 0) + 1;
    }
    return get_octet()+'.'+get_octet()+'.'+get_octet()+'.'+get_octet();
  }

  function check_ws_uri(ws_uri) {
    var ws_uri_prefix, ws_uri_hostport, ws_uri_path, ws_uri_query, slash_idx, query_idx;

    ws_uri_prefix = ws_uri.substr(0,5);

    if (ws_uri_prefix !== 'ws://') {
      return false
    }

    ws_uri = ws_uri.substr(5);
    slash_idx = ws_uri.indexOf('/');

    if (slash_idx === -1) {
      ws_uri_hostport = ws_uri;
    } else {
      ws_uri_hostport = ws_uri.substr(0,slash_idx);
      ws_uri = ws_uri.substr(slash_idx);
      query_idx = ws_uri.indexOf('?');

      if (query_idx === -1) {
        ws_uri_path = ws_uri.substr(1);
      } else {
        ws_uri_path = ws_uri.substr(1, query_idx-1);
        ws_uri_query = ws_uri.substr(query_idx+1);
      }
    }

    return {
      host: ws_uri_hostport,
      ws_path: ws_uri_path,
      ws_query: ws_uri_query
    };
  }


  // If data is already set (default values) then directly go.
  if (sip_uri && sip_password && ws_uri)
    phone_init();

});
