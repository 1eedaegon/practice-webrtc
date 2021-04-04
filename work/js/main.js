let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let turnReady;
// Client socket.io
const room = "foo-room";
const socket = io.connect();
if (room !== "") {
  socket.emit("create or join", room);
  console.log("Attemptted to create or join room: ", room);
}
socket.on("created", (room) => {
  console.log("Createed room" + room);
  isInitiator = true;
});
socket.on("full", (room) => {
  console.log("Room" + room + "is full");
});
socket.on("join", (room) => {
  console.log("Another peer made a request to join room" + room);
  console.log("This peer is the initiator of room" + room);
});
socket.on("joined", (room) => {
  console.log("joined" + room);
  isChannelReady = true;
});
socket.on("log", (arr) => {
  console.log.apply(console, array);
});

// video stream
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then(gotStream)
  .catch((e) => {
    alert(`getUserMedia() error: ${e.name}`);
  });

const pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
// Set up audio and video regardless of what devices are present
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};
// Client
var sendMessage = (msg) => {
  console.log("Client sending: ", msg);
  socket.emit("message", msg);
};
socket.on("message", (msg) => {
  console.log("Client received: ", msg);
  if (msg === "got user media") {
    maybeStart();
    return;
  }
  if (msg.type === "offer") {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
    return;
  }
  if (msg.type === "answer" && isStarted) {
    ps.setRemoteDescription(new RTCSessionDescription(msg));
    return;
  }
  if (msg.type === "candidate" && isStarted) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate,
    });
    pc.addIceCandidate(candidate);
    return;
  }
  if (msg.type === "bye" && isStarted) {
    handleRemoteHangup();
    return;
  }
});

var gotStream = (stream) => {
  console.log("Adding local stream.");
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage("got user mediaa");
  if (isInitiator) {
    maybeStart();
  }
};

const constraints = {
  video: true,
};
console.log("Getting user media with constraints", constraints);
if (location.hostname !== "localhost") {
  requestTurn(
    "https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913"
  );
}

var maybeStart = () => {
  console.log(">>> maybeStart() ", isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
    console.log(">>> creating peer connection");
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log("isInitiator", isInitiator);
    if (isInitiator) doCall();
  }
};
window.onbeforeunload = () => sendMessage("bye");

// Peer Connections
var createPeerConnection = () => {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log("Created");
  } catch (e) {
    console.log(`Failed to create PeerConnection, execption: ${e.message}`);
    alert("Cannot create RTCPeerConnection object.");
    return;
  }
};

var handleIceCandidate = (e) => {
  console.log(`icecandidate event: ${e}`);
  if (e.candidate) {
    sendMessage({
      type: "candidate",
      label: e.candidate.sdpMLineIndex,
      id: e.candidate.sdpMid,
      candidate: e.candidate.candidate,
    });
  }
  console.log("End of candidates.");
};

var handleCreateOfferError = (e) => {
  console.log(`createOffer() error: ${e}`);
};
var doCall = () => {
  console.log("Sending offer to peer");
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
};
var doAnswer = () => {
  console.log("Sending answer to peer. ");
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
};
var setLocalAndSendMessage = (sessionDescription) => {
  pc.setLocalDescription(sessionDescription);
  console.log("setLocalAndSendMessaage sending message", sessionDescription);
  sendMessage(sessionDescription);
};
var onCreateSessionDescriptionError = (err) => {
  trace(`Failed to create session description: ${err.toString()}`);
};
var requestTurn = (turnURL) => {
  let turnExists = false;
  for (i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === "turn:") {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log(`Getting TURN server from: ${turnURL}`);
    // no TURN server
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        let turnServer = JSON.parse(xhr.responseText);
        console.log(`Got TURN server: ${turnServer}`);
        pcConfig.iceServers.push({
          urls: "turn:" + turnServer.username + "@" + turnServer.turn,
          credential: turnServer.password,
        });
        turnReady = true;
      }
    };
    xhr.open("GET", turnURL, true);
    xhr.send();
  }
};
var handleRemoteStreamAdded = (e) => {
  console.log("Remote stream added.");
  remoteStream = e.stream;
  remoteVideo.srcObject = remoteStream;
};
var handleRemoteStreamRemoved = (e) => {
  console.log(`Remote stream removed. Event: ${e}`);
};
var hangup = () => {
  console.log("Hanging up.");
  stop();
  sendMessage("bye");
};
var handleRemoteHangup = () => {
  console.log("Session ternimated.");
  stop();
  isInitiator = false;
};
var stop = () => {
  isStarted = false;
  pc.close();
  pc = null;
};
