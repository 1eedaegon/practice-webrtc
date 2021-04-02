"use strict";
// const tract = console.log;
const mediaStreamConstraints = {
  video: {
    width: { min: 1280 },
    height: { min: 720 },
  },
  audio: true,
};
const localVideo = document.querySelector("video");
let localStream;

const gotLocalMediaStream = (mediaStream) => {
  localStream = mediaStream;
  localVideo.srcObject = mediaStream;
  trace("Received local stream.");
  callButton.disabled = false;
};
const handleLocalMediaStreamError = (error) =>
  console.log(`navigator.getUserMedia Error: ${erro}`);

navigator.mediaDevices
  .getUserMedia(mediaStreamConstraints)
  .then(gotLocalMediaStream)
  .catch(handleLocalMediaStreamError);
//  Initialize local peer connection
let localPeerConnection = new RTCPeerConnection(servers);

// Handle peer connection
const handleConnection = (evt) => {
  const peerConnection = evt.target;
  const iceCandidate = evt.candidate;
  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);
    // Check other peers
    otherPeer
      .addIceCandidate(newIceCandidate)
      .then(() => {
        handleConnectionSuccess(peerConnection);
      })
      .catch((error) => {
        // Peer Not found and retry
        handleConnectionFailure(peerConnection, error);
      });
    trace(
      `${getPeerName(peerConnection)} ICE cadidate: \n` +
        `${event.candidate.candidate}`
    );
  }
};
const createdOffer = (description) => {
  trace(`Offer from localPeerConnection: \n ${description.sdp}`);
  trace("localPeerConnection setLocalDescription start.");
  localPeerConnection
    .setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    })
    .catch(setSessionDescriptionError);
  trace("remotePeerConnection setRemoteDescription start.");
  remotePeerConnection
    .setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(remotePeerConnection);
    })
    .catch(setSessionDescriptionError);
  trace();
  remotePeerConnection
    .createAnswer()
    .then(createdAnswer)
    .catch(setSessionDescriptionError);
};
const createdAnswer = (description) => {
  trace(`Answer from remotePeerConnection: \n ${description.sdp}`);
  trace("remotePeerConnection setLocalDescription start.");
  remotePeerConnection
    .setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(remotePeerConnection);
    })
    .catch(setSessionDescriptionError);
  trace("localPeerConnection setRemoteDescription start.");
  localPeerConnection
    .setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
    })
    .catch(setSessionDescriptionError);
};

// Using SDP Layer
localPeerConnection
  .createOffer(offerOptions)
  .then(createdOffer)
  .catch(setSessionDescriptionError);

// May Servers will STUNs and TURNs

localPeerConnection.addEventListener("icecandidate", handleConnection);
localPeerConnection.addEventListener(
  "iceconnectionstatechange",
  handleConnectionChange
);
localPeerConnection.addStream(localStream);
trace("Added local stream to localPeerConnection");
