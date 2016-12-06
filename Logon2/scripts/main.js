// main.js has 9 functions:
// -require() and initWebAPI() functions build the WebAPI Object
// -connect(), disconnect(), logon(), logoff() functions control the logon states
// -sendMessage(), processMessage() functions send and process messages
// -processLogonResult() Spectacularly process logon_result in processMessage()
//
// Download the UML of WebAPI PowerPoint from website:
//

// both websocket and WebAPI must be global objects
var websocket, WebAPI;

// this function always executes first: run initWebAPI() if WebSockets and ArrayBuffer
// are supported by the ProtoBuf we are using
require(["ProtoBuf"], function (ProtoBufInit) {
    var body = $("#body").get(0);
    if ('WebSocket' in window) {
        if ('ArrayBuffer' in window) {
              initWebAPI();// see function in line 30
        } else {
            console.log("ArrayBuffer is not supported");
        }
    } else {
        console.log("WebSockets are not supported");
    }
});

// initWebAPI() builds the WebAPI Object through webapi_1.proto, which
// formats every message we send to or receive from the server
function initWebAPI() {
  var protobuf = require("ProtoBuf");
  var builder = protobuf.protoFromFile("protocol/webapi_1.proto");
  WebAPI = builder.build("WebAPI_1");
}

// when Connect button is clicked, we run the connect function
// there are four main processes handled by the connect function:
// 1. creat new websocket to wss:// demoapi.cqg.com:443
// 2. react properly when connection is open and ready to communicate
// 3. run processMessage() function when message(s) received from server
// 4. react properly when onclose or onerror events received
function connect(){
    // https:// developer.mozilla.org/en-US/docs/Web/API/WebSocket
    // create a new websocket if there is no websocket.
    if (websocket != null){
      // console.log("Already connected.");// uncomment to see the console
      return;
    }
    var host = $("#url").get(0).value;
    websocket = new WebSocket(host);
    websocket.binaryType = 'arraybuffer';
    $("#state").html("Connecting...".big().bold().fontcolor("green"));
    // there are four readyStates:
    // CONNECTING 	    0	The connection is not yet open.
    // OPEN	            1	The connection is open and ready to communicate.
    // CLOSING	        2	The connection is in the process of closing.
    // CLOSED	          3	The connection is closed or couldn't be opened.
    // console.log('WebSocket status: ' + websocket.readyState);// uncomment to see the console

    // websocket.onopen()
    // An event listener to be called when the WebSocket connection's readyState
    // changes to OPEN; this indicates that the connection is ready to send
    // and receive data. The event is a simple one with the name "open".
    websocket.onopen = function () {
        // console.log("Connected! status: " + this.readyState);// uncomment to see console
        $("#state").html(" Connected!".big().bold().fontcolor("green"));
        $("#connect").get(0).disabled = true;
        $("#disconnect").get(0).disabled = false;
        $("#logon").get(0).disabled = false;
        $("#logoff").get(0).disabled = false;
    };
    // websocket.onmessage()
    // An event listener to be called when a message is received from the server
    // The listener receives a MessageEvent named "msg"
    websocket.onmessage = function (msg) {
        processMessage(msg.data);// see processMessage() function in line 167
    };
    // websocket.onclose()
    // An event listener to be called when the WebSocket connection's readyState
    // changes to CLOSED. The listener receives a CloseEvent named "close".
    // Disconnection results in the readyState changing to CLOSED, and
    // might happen for many reasons, not just clicking Disconnect button
    websocket.onclose = function (evt) {
        // console.log("Disconnected! status: " + this.readyState);// uncomment to see console
        delete websocket;
        websocket = null;
        $("#state").html(" Disconnected!".big().bold().fontcolor("red"));
        $("#connect").get(0).disabled = false;
        $("#disconnect").get(0).disabled = true;
        $("#logon").get(0).disabled = true;
        $("#logoff").get(0).disabled = true;
    };
    // websocket.onerror()
    // An event listener to be called when an error occurs.
    websocket.onerror = function (evt) {
        disconnect();
        // console.log("Error:" + evt.data);// uncomment to see console
    };
}

// runs when Disconnect button clicked, close and delete (destroy) websocket
function disconnect() {
    if (!websocket) {
        console.log("Not connected.");
    }
    else {
        websocket.close();
        delete websocket;
        websocket = null;
    }
}

// runs when Logon button is clicked, send required Logon messages to the WebAPI server
// ****pay attention that a user is only allowed to logon once for each connection;
// avoid unneccessary logon attempts
function logon(){
    var user, pass;
    user = $("#user").get(0);
    pass = $("#pass").get(0);
    if (!user.value||!pass.value) {
        alert("UserName or Password can not be empty");
        return;
    }
    // the WebAPI.ClientMsg is like a template, and user will modify this template
    // to create client messages (clMsg) for any kind of request
    // clMsg is the message we will send to the server, and the server will respond
    // depending on the required and optional messages contained in the clMsg.
    // In WebAPI.Logon, there are 4 required messages and 6 optional messages.
    // In this example, we use required messages only
    var clMsg = new WebAPI.ClientMsg;
    var logon = new WebAPI.Logon;
    logon.user_name = user.value;// required
    logon.password = pass.value;// required
    logon.client_id = "WebApiTest";// required, only use "WebApiTest" for demo
    logon.client_version = "any name will be fine";// required, name it "anyfing" you want
    clMsg.logon = logon;
    // see sendMessage() function below, this function is called for all sent messages
    sendMessage(clMsg, "Sent: Required Logon Information ");
    $("#logon").get(0).disabled = true;
    $("#logoff").get(0).disabled = false;
}

// runs when Logoff button clicked, sends required Logoff messages to the server
// user will be auto-logged off after five minutes disconnection
// user will be auto-disconnected after logged off for one minute
// I suggest run disconnect() right after logoff, why? it makes life easier
// should you ever want to log back in quickly
function logoff() {
    var clMsg = new WebAPI.ClientMsg;
    var logoff = new WebAPI.Logoff;
    logoff.text_message = "Going away!";
    clMsg.logoff = logoff;
    sendMessage(clMsg, "Sent: Logoff: " + logoff.text_message);
    $("#logon").get(0).disabled = false;
    $("#logoff").get(0).disabled = true;
    disconnect();// want harder life? comment this to see some interesting behaviors
}

// sendMessage() function will encode and send your WebAPI request(s) to
// the server, and will console a confirm message for the user as well
function sendMessage(message, logMsg) {
    try {
        var buffer = message.encode();// encode
        websocket.send(buffer.toArrayBuffer());// send
        console.log(logMsg);
    }
    catch (ex) {
        console.log(ex.message);
    }
}

// In this example, we are only logging on and off, but the processMessage function
// is where you will get your market data! Or your order confirmation, or whatever
// you requested. The processMessage function will parse the returned ServerMsg
// (such as ignore all null values) to return and/or display the specified information
function processMessage(msg) {
    // WebAPI.ServerMsg.decode()function is used to translate ArrayBuffer{} to
    // readable Message{} which contains information_report, logon_result,
    // market_data_subscription_status, real_time_market_data and so on
    var sMsg = WebAPI.ServerMsg.decode(msg);
    // console.log(sMsg);// uncomment to see the whole ServerMsg
    if (sMsg.logon_result)
        processLogonResult(sMsg.logon_result);// see function below
}

// Spectacularly process the logon_result
function processLogonResult(result) {
    // user can compare the result_code received in the message to the
    // codes specified by the protocol. There are 8 possible Logon results:
    // 1.   0:  SUCCESS
    // 2. 101:  FAILURE
    // 3. 103:  NO_ONETIME_PASSWORD
    // 4. 104:  PASSWORD_EXPIRED
    // 5. 105:  CONCURRENT_SESSION
    // 6. 106:  REDIRECTED
    // 7. 107:  ENCODING_TYPE_NOT_SUPPORTED
    // 8. 108:  ROUTINE_ERROR
    var isLogonSuccess = (result.result_code == WebAPI.LogonResult.ResultCode.SUCCESS);
    if (isLogonSuccess) {
        baseTime = new Date(Date.parse(result.base_time + "Z"));
        // there are 8 keys in result, let's console three of them
        console.log("Logon successful! Your user id is:   " + result.user_id);
        console.log("BaseTime:                            " + baseTime);
        console.log("SessionToken:                        " + result.session_token);
    }
    else {
        console.log("Failed to logon");
        disconnect();
    }
}
