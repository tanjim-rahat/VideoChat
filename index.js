const APP = {
    id: '617100625b0d45b28231347a6118948f',
    userID: crypto.randomUUID(),
    peerID: null,
    roomID: null,
    token: null,
    localStream: null,
    remoteStream: new MediaStream(),
    peerConnection: null,
    ICEServers: [{urls:['stun.l.google.com:19302', 'stun1.l.google.com:19302', 'stun2.l.google.com:19302']}]
}

const chatClient = AgoraRTM.createInstance(APP.id)
chatClient.login({uid: APP.userID, token: APP.token})


const localVideoEl = document.getElementById('video1')
const remoteVideoEl = document.getElementById('video2')

async function init () {    
    
    APP.channel = chatClient.createChannel(APP.roomID)
    
    APP.channel.on('MemberJoined', memberId => {
        createOffer()
    })

    APP.channel.on('ChannelMessage', (msg, memberId) => {
        msg = JSON.parse(msg.text)

        if (msg.type == 'offer') {
            createAnswer(msg.offer)
        }

        if (msg.type == 'answer') {
            if (!APP.peerConnection.currentRemoteDescription) {
                APP.peerConnection.setRemoteDescription(msg.answer)
            }
        }

        if (msg.type == 'candidate') {
            if (APP.peerConnection) {
                APP.peerConnection.addIceCandidate(msg.candidate)
            }
        }
    })
    
    await APP.channel.join()
    
    navigator.mediaDevices.getUserMedia({video: true, audio: false}).then(stream => {
        APP.localStream = stream
        localVideoEl.srcObject = APP.localStream
    })
}

async function initPeerConnection () {
    const peerConnection = new RTCPeerConnection(APP.ICEServers)

    APP.localStream.getTracks().forEach(track => peerConnection.addTrack(track))

    remoteVideoEl.srcObject = APP.remoteStream

    peerConnection.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
            APP.remoteStream.addTrack(track)
            console.log(track)
        })
    }

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            APP.channel.sendMessage(JSON.stringify({type: 'candidate', candidate: event.candidate}))
        }
    }
    
    APP.peerConnection = peerConnection
}

async function createOffer () {
    await initPeerConnection()

    APP.peerConnection.createOffer().then(offer => {
        APP.peerConnection.setLocalDescription(offer)
        APP.channel.sendMessage({text:JSON.stringify({type: 'offer', offer: offer})})
    })
}

async function createAnswer (offer) {
    await initPeerConnection()

    APP.peerConnection.setRemoteDescription(offer)

    const answer = await APP.createAnswer()
    APP.peerConnection.setLocalDescription(answer)

    APP.channel.sendMessage(JSON.stringify({type: 'answer', answer: answer}))
}

function cut () {
    APP.localStream.getTracks().forEach(track => track.stop())
    APP.localStream = null
    APP.channel.leave()
}