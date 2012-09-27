window.GUI = {

  phoneCallButtonPressed : function() {
    var user, uri;

    if (!(destination = phone_dialed_number_screen.val()))
      return false;

    uri = destination;
    if (! uri) {
      alert("ERROR: wrong destination (" + destination + ")");
      return false;
    }

    if (uri.indexOf('@') === -1) {
      user = uri;
      uri = 'sip:' + uri + '@jssip.net';
    } else {
      user = uri.substr(0,uri.indexOf('@'));
      uri = 'sip:' + uri + ''
    }

    phone_dialed_number_screen.val("");

    var session = GUI.getSession(uri);

    // If this is a new session create it with call status "trying".
    if (!session) {
      session = GUI.createSession(user, uri);
      GUI.setCallSessionStatus(session, "trying");
      session.call = GUI.jssipCall(uri, session);
      session.call.send();
    }
    // If the session already exists but has no call, start it and set to "trying".
    else if ($(session).find(".call").hasClass("inactive")) {
      GUI.setCallSessionStatus(session, "trying");
      session.call = GUI.jssipCall(uri, session);
    }
    // If the session exists with active call do nothing.
    else {
    }

    $(session).find(".chat input").focus();
  },


  phoneChatButtonPressed : function() {
    if (!(destination = phone_dialed_number_screen.val()))
      return false;

    var uri = destination;
    if (! uri) {
      alert("ERROR: wrong destination (" + destination + ")");
      return false;
    }

    if (uri.indexOf('@') === -1) {
      user = uri;
      uri = 'sip:' + uri + '@jssip.net';
    } else {
      user = uri.substr(0,uri.indexOf('@'));
      uri = 'sip:' + uri + ''
    }

    phone_dialed_number_screen.val("");

    var session = GUI.getSession(uri);

    // If this is a new session create it without call.
    if (!session) {
      session = GUI.createSession(user, uri);
      GUI.setCallSessionStatus(session, "inactive");
    }
    // If it exists, do nothing.
    else {
    }

    $(session).find(".chat input").focus();
  },


  /*
   * Esta función debe ser llamada por jssip al recibir un initial INVITE,
   * y debe pasar como parámetros el display-name (sin "" a ser posible)
   * y el From URI (sip:user@domain).
   * Si el display-name es null, entonces jssip debe pasar el From URI username.
   */
  phoneCallReceived : function(display_name, uri, call) {
    var session = GUI.getSession(uri);

    // If this is a new session create it with call status "incoming".
    if (!session) {
      session = GUI.createSession(display_name, uri);
      GUI.setCallSessionStatus(session, "incoming");
    }
    // If the session already exists but has no call, start it and set to "incoming".
    else if ($(session).find(".call").hasClass("inactive")) {
      GUI.setCallSessionStatus(session, "incoming");
    }
    // If the session exists with active callreject it.
    else {
      call.terminate();
      return false;
    }

    session.call = call;
    session.call.on('cancel',function(reason) {
      document.title = PageTitle;
      if (reason && reason.match("SIP;cause=200", "i")) {
        GUI.setCallSessionStatus(session, "answered_elsewhere");
        GUI.removeSession(session, 1500);
      }
      else {
        GUI.setCallSessionStatus(session, "terminated", "cancelled by peer");
        GUI.removeSession(session, 1000);
      }
    });
    session.call.on('terminate', function(cause) {
      switch (cause) {
        default:
          (function(){
            document.title = PageTitle;
            GUI.setCallSessionStatus(session, "terminated", cause.toLowerCase());
            GUI.removeSession(session, 1500);
          })();
          break;
      }
    });

    $(session).find(".chat input").focus();

    // Return true so jssip knows that the call is ringing in the web.
    return true;
  },


  /*
   * Esta función debe ser llamada por jssip al recibir un MESSAGE
   * de tipo text/plain,
   * y debe pasar como parámetros el display-name (sin "" a ser posible),
   * el From URI (sip:user@domain) y el texto del MESSAGE.
   * Si el display-name es null, entonces jssip debe pasar el From URI username.
   */
  phoneChatReceived : function(display_name, uri, text) {
    var session = GUI.getSession(uri);

    // If this is a new session create it with call status "inactive", and add the message.
    if (!session) {
      session = GUI.createSession(display_name, uri);
      GUI.setCallSessionStatus(session, "inactive");
    }

    GUI.addChatMessage(session, "peer", text);
    //$(session).find(".chat input").focus();
  },


  /*
   * Esta función debe ser llamada por jssip al recibir un MESSAGE
   * de tipo application/im-iscomposing+xml,
   * y debe pasar como parámetro el From URI (sip:user@domain) y otro
   * parámetro active que es:
   * - true: es un evento "iscomposing active"
   * - false: es un evento "iscomposing idle"
   */
  phoneIsComposingReceived : function(uri, active) {
    var session = GUI.getSession(uri);

    // If a session does not exist just ignore it.
    if (!session)
      return false;

    var chatting = $(session).find(".chat > .chatting");

    // If the session has no chat ignore it.
    if ($(chatting).hasClass("inactive"))
      return false;

    if (active)
      $(session).find(".chat .iscomposing").show();
    else
      $(session).find(".chat .iscomposing").hide();
  },


  /*
   * Busca en las sessions existentes si existe alguna con mismo peer URI. En ese
   * caso devuelve el objeto jQuery de dicha session. Si no, devuelve false.
   */
  getSession : function(uri) {
    var session_found = null;

    $("#sessions > .session").each(function(i, session) {
      if (uri == $(this).find(".peer > .uri").text()) {
        session_found = session;
        return false;
      }
    });

    if (session_found)
      return session_found;
    else
      return false;
  },


  createSession : function(display_name, uri) {
    var session_div = $('\
    <div class="session"> \
      <div class="close"></div> \
      <div class="container"> \
        <div class="peer"> \
          <span class="display-name">' + display_name + '</span> \
          <span>&lt;</span><span class="uri">' + uri + '</span><span>&gt;</span> \
        </div> \
        <div class="call inactive"> \
          <div class="button dial"></div> \
          <div class="button hangup"></div> \
          <div class="button hold"></div> \
          <div class="button resume"></div> \
          <div class="call-status"></div> \
        </div> \
        <div class="chat"> \
          <div class="chatting inactive"></div> \
          <input class="inactive" type="text" name="chat-input" value="type to chat..."/> \
          <div class="iscomposing"></div> \
        </div> \
      </div> \
    </div> \
    ');

    $("#sessions").append(session_div);

    var session = $("#sessions .session").filter(":last");
    var call_status = $(session).find(".call");
    var close = $(session).find("> .close");
    var chat_input = $(session).find(".chat > input[type='text']");

    $(session).hover(function() {
      if ($(call_status).hasClass("inactive"))
        $(close).show();
    },
    function() {
      $(close).hide();
    });

    close.click(function() {
      GUI.removeSession(session, null, true);
    });

     chat_input.focus(function(e) {
      if ($(this).hasClass("inactive")) {
      $(this).val("");
      $(this).removeClass("inactive");
      }
    });

    chat_input.blur(function(e) {
      if ($(this).val() == "") {
        $(this).addClass("inactive");
        $(this).val("type to chat...");
      }
    });

    chat_input.keydown(function(e) {
      // Ignore TAB and ESC.
      if (e.which == 9 || e.which == 27) {
        return false;
      }
      // Enter pressed? so send chat.
      else if (e.which == 13 && $(this).val() != "") {
        var text = chat_input.val();
        GUI.addChatMessage(session, "me", text);
        chat_input.val("");
        GUI.jssipMessage(session, uri, text);
      }
      // Ignore Enter when empty input.
      else if (e.which == 13 && $(this).val() == "") {
        return false;
      }
      // NOTE is-composing stuff.
      // Ignore "windows" and ALT keys, DEL, mayusculas and 0 (que no sé qué es).
      else if (e.which == 18 || e.which == 91 || e.which == 46 || e.which == 16 || e.which == 0)
        return false;
      // If this is the first char in the input and the chatting session
      // is active, then send a iscomposing notification.
      else if (e.which != 8 && $(this).val() == "") {
        GUI.jssipIsComposing(uri, true);
      }
      // If this is a DELETE key and the input has been totally clean, then send "idle" isomposing.
      else if (e.which == 8 && $(this).val().match("^.$"))
        GUI.jssipIsComposing(uri, false);
    });

    $(session).fadeIn(100);

    // Return the jQuery object for the created session div.
    return session;
  },


  setCallSessionStatus : function(session, status, description) {
    var uri = $(session).find(".peer > .uri").text();
    var call = $(session).find(".call");
    var status_text = $(session).find(".call-status");
    var button_dial = $(session).find(".button.dial");
    var button_hangup = $(session).find(".button.hangup");
    var button_hold = $(session).find(".button.hold");
    var button_resume = $(session).find(".button.resume");

    // If the call is not inactive or terminated, then hide the
    // close button (without waiting for blur() in the session div).
    if (status != "inactive" && status != "terminated") {
      $(session).unbind("hover");
      $(session).find("> .close").hide();
    }

    // Unset all the functions assigned to buttons.
    button_dial.unbind("click");
    button_hangup.unbind("click");
    button_hold.unbind("click");
    button_resume.unbind("click");

    switch(status) {

      case "inactive":

        call.removeClass();
        call.addClass("call inactive");
        status_text.text("");

        button_dial.click(function() {
          GUI.setCallSessionStatus(session, "trying");
          session.call = GUI.jssipCall(uri, session);
          session.call.send();
        });

        break;

      case "trying":

        call.removeClass();
        call.addClass("call trying");
        status_text.text(description || "trying...");
        soundPlayer.setAttribute("src", "sounds/outgoing-call2.ogg");
        soundPlayer.play();

        button_hangup.click(function() {
          GUI.setCallSessionStatus(session, "terminated", "cancelled");
          session.call.terminate();
          GUI.removeSession(session, 500);
        });

        // unhide HTML Video Elements
        $('#remoteView').attr('hidden', false);
        $('#selfView').attr('hidden', false);

        // Set background image
        $('#remoteView').attr('poster', "images/sip-on-the-web.png");


        break;

      case "in-progress":

        call.removeClass();
        call.addClass("call in-progress");
        status_text.text(description || "in progress...");

        button_hangup.click(function() {
          GUI.setCallSessionStatus(session, "terminated", "cancelled");
          session.call.terminate();
          GUI.removeSession(session, 500);
        });

        break;

      case "answered":

        call.removeClass();
        call.addClass("call answered");
        status_text.text(description || "answered");

        button_hangup.click(function() {
          GUI.setCallSessionStatus(session, "terminated", "terminated");
          session.call.terminate();
          GUI.removeSession(session, 500);
        });

        button_hold.click(function() {
          GUI.setCallSessionStatus(session, "on-hold");
          session.call.hold();
        });

        break;

      case "terminated":

        call.removeClass();
        call.addClass("call terminated");
        status_text.text(description || "terminated");

        break;

      case "answered_elsewhere":

        call.removeClass();
        call.addClass("call answered-elsewhere");
        status_text.text("answered elsewhere");

        break;

      case "on-hold":

        call.removeClass();
        call.addClass("call on-hold");
        status_text.text("on hold");

        button_hangup.click(function() {
          GUI.setCallSessionStatus(session, "terminated", "terminated");
          session.call.terminate();
          GUI.removeSession(session, 500);
        });

        button_resume.click(function() {
          GUI.setCallSessionStatus(session, "answered");
          session.call.hold();
        });

        break;

      case "incoming":

        document.title = "*** incoming call ***";
        call.removeClass();
        call.addClass("call incoming");
        status_text.text("incoming call...");
        soundPlayer.setAttribute("src", "sounds/incoming-call2.ogg");
        soundPlayer.play();

        button_dial.click(function() {
          document.title = PageTitle;
          GUI.setCallSessionStatus(session, "answered");
          var selfView = document.getElementById('selfView');
          var remoteView = document.getElementById('remoteView');
          session.call.answer(selfView, remoteView);
        });

        button_hangup.click(function() {
          document.title = PageTitle;
          GUI.setCallSessionStatus(session, "terminated", "rejected");
          session.call.terminate();
          GUI.removeSession(session);
        });

        // unhide HTML Video Elements
        $('#remoteView').attr('hidden', false);
        $('#selfView').attr('hidden', false);

        // Set background image
        $('#remoteView').attr('poster', "images/sip-on-the-web.png");

        break;

      default:
        alert("ERROR: setCallSessionStatus() called with unknown status '" + status + "'");
        break;
    }
  },


  removeSession : function(session, time, force) {
    var default_time = 500;
    var uri = $(session).find(".peer > .uri").text();
    var chat_input = $(session).find(".chat > input[type='text']");

    if (force || ($(session).find(".chat .chatting").hasClass("inactive") && (chat_input.hasClass("inactive") || chat_input.val() == ""))) {
      time = ( time ? time : default_time );
      $(session).fadeTo(time, 0.7, function() {
        $(session).slideUp(100, function() {
          $(session).remove();
        });
      });
      // Enviar "iscomposing idle" si estábamos escribiendo.
      if (! chat_input.hasClass("inactive") && chat_input.val() != "")
        GUI.jssipIsComposing(uri, false);
    }
    else {
      // Como existe una sesión de chat, no cerramos el div de sesión,
      // en su lugar esperamos un poco antes de ponerlo como "inactive".
      setTimeout('GUI.setDelayedCallSessionStatus("'+uri+'", "inactive")', 1000);
    }

    // hide HTML Video Elements
    $('#remoteView').attr('hidden', true);
    $('#selfView').attr('hidden', true);
  },


  setDelayedCallSessionStatus : function(uri, status, description, force) {
    var session = GUI.getSession(uri);
    if (session)
      GUI.setCallSessionStatus(session, status, description, force);
  },


  /*
   * Añade un mensaje en el chat de la sesión.
   * - session: el objeto jQuery de la sesión.
   * - who: "me" o "peer".
   * - text: el texto del mensaje.
   */
  addChatMessage : function(session, who, text) {
    var chatting = $(session).find(".chat > .chatting");
    $(chatting).removeClass("inactive");

    if (who != "error") {
      var who_text = ( who == "me" ? "me" : $(session).find(".peer > .display-name").text() );
      var message_div = $('<p class="' + who + '"><b>' + who_text + '</b>: ' + text + '</p>');
    }
    // ERROR sending the MESSAGE.
    else {
      var message_div = $('<p class="error"><i>message failed: ' + text + '</i>');
    }
    $(chatting).append(message_div);
    $(chatting).scrollTop(1e4);

    if (who == "peer") {
      soundPlayer.setAttribute("src", "sounds/incoming-chat.ogg");
      soundPlayer.play();
    }

    // Si se había recibido un iscomposing quitarlo (sólo si es message entrante!!!).
    if (who == "peer")
      $(session).find(".chat .iscomposing").hide();
  },


/*
   * Cambia el indicador de "Status". Debe llamarse con uno de estos valores:
   * - "connected"
   * - "registered"
   * - "disconnected"
   */
  setStatus : function(status) {
    $("#conn-status").removeClass();
    $("#conn-status").addClass(status);
    $("#conn-status > .value").text(status);

    register_checkbox.attr("disabled", false);
    if(status == "registered")
      register_checkbox.attr("checked", true);
    else
      register_checkbox.attr("checked", false);
  },


  jssipCall : function(uri, session) {
    var selfView = document.getElementById('selfView');
    var remoteView = document.getElementById('remoteView');
    var call =  MyPhone.call(uri, selfView, remoteView, {audio: true, video: $('#video').is(':checked')});
    call.on('ring',function(){
      GUI.setCallSessionStatus(session, 'in-progress');
    });
    call.on('failure',function(status, reason){
      GUI.setCallSessionStatus(session, 'terminated', "" + status + " " + reason);
      soundPlayer.setAttribute("src", "sounds/outgoing-call-rejected.wav");
      soundPlayer.play();
      GUI.removeSession(session, 500);
    });
    call.on('answer',function(){
      GUI.setCallSessionStatus(session, 'answered');
    });
    call.on('terminate', function(cause) {
      switch (cause) {
        default:
          (function(){
            document.title = PageTitle;
            GUI.setCallSessionStatus(session, "terminated", cause.toLowerCase());
            GUI.removeSession(session, 1500);
          })();
          break;
      }
    });
    call.on('error',function(error){
      GUI.setCallSessionStatus(session, 'terminated', error);
      GUI.removeSession(session, 1500);
    });

    return call;
  },


  jssipMessage : function(session, uri, text) {
    try {
      var messager = MyPhone.message(uri,text);
      messager.on('success', function(response){ });
      messager.on('failure', function(response){
        GUI.addChatMessage(session, "error", response.status_code.toString() + " " + response.reason_phrase);
      });
      messager.on('error', function(error){
        if (error == JsSIP.c.REQUEST_TIMEOUT) {
          GUI.addChatMessage(session, "error", "request timeout");
        }
        else if (error === JsSIP.c.TRANSPORT_ERROR) {
          GUI.addChatMessage(session, "error", "transport error");
        }
        else if (error === JsSIP.c.USER_CLOSED) {
            GUI.addChatMessage(session, "error", "user closed");
        }
        else if (error === JsSIP.c.INVALID_TARGET) {
            GUI.addChatMessage(session, "error", "Invalid target");
        }
      });
      messager.send();
    } catch(e){
      console.log(e);
    }
  },


  jssipIsComposing : function(uri, active) {
    //JsSIP.API.is_composing(uri, active);
    console.info('is compossing..')
  }

};
