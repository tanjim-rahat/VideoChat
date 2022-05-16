const APP = {
    id: '617100625b0d45b28231347a6118948f',
    userID: crypto.randomUUID(),
    peerID: null,
    roomID: null,
    token: null,
    localStream: null,
    remoteStream: new MediaStream(),
    peerConnection: null,
    ICEServers: [{urls:['stun.ru-brides.com:3478']}]
}

const chatClient = AgoraRTM.createInstance(APP.id)
chatClient.login({uid: APP.userID, token: APP.token})


const localVideoEl = document.getElementById('video1')
const remoteVideoEl = document.getElementById('video2')

async function init (screen) {    
    
    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    stream.getAudioTracks().forEach(track => track.enabled = false)

    APP.localStream = stream
    localVideoEl.srcObject = APP.localStream
    
    APP.channel = chatClient.createChannel(APP.roomID)
    
    APP.channel.on('MemberJoined', memberId => {
        createOffer()
    })

    APP.channel.on('MemberLeft', memberId => {
        cut()
        screen('welcome')
    })

    APP.channel.on('ChannelMessage', (msg, memberId) => {
        msg = JSON.parse(msg.text)

        if (msg.type == 'offer') {
            createAnswer(msg.offer)
            console.log('GOT offer')
        }

        if (msg.type == 'answer') {
            if (!APP.peerConnection.currentRemoteDescription) {
                APP.peerConnection.setRemoteDescription(msg.answer)
                console.log('GOT answer')
            }
        }

        if (msg.type == 'candidate') {
            if (APP.peerConnection) {
                APP.peerConnection.addIceCandidate(msg.candidate)
                console.log('Added candidate')
            }
        }
    })
    
    await APP.channel.join()

}

async function initPeerConnection () {
    const peerConnection = new RTCPeerConnection(APP.ICEServers)

    peerConnection.ontrack = event => {
        APP.remoteStream.addTrack(event.track)
        // console.log(event)
        // event.streams[0].getTracks().forEach(track => {
        //     APP.remoteStream.addTrack(track)
        //     console.log(track)
        // })
    }

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            APP.channel.sendMessage({text: JSON.stringify({type: 'candidate', candidate: event.candidate})})
            console.log(event.candidate)
        }
    }

    APP.localStream.getTracks().forEach(track => peerConnection.addTrack(track))

    remoteVideoEl.srcObject = APP.remoteStream
    
    APP.peerConnection = peerConnection
}

async function createOffer () {
    await initPeerConnection()

    APP.peerConnection.createOffer().then(offer => {
        APP.peerConnection.setLocalDescription(offer)
        APP.channel.sendMessage({text:JSON.stringify({type: 'offer', offer: offer})})

        console.log(offer)
    })
}

async function createAnswer (offer) {
    await initPeerConnection()

    APP.peerConnection.setRemoteDescription(offer)

    const answer = await APP.peerConnection.createAnswer()
    APP.peerConnection.setLocalDescription(answer)

    APP.channel.sendMessage({text: JSON.stringify({type: 'answer', answer: answer})
    })
    console.log(answer)
}


function toggleVideo () {
    if (APP.localStream) {
        APP.localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
    }
}

function toggleAudio () {
    if (APP.localStream) {
        APP.localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
    }
}


function cut () {
    APP.localStream.getTracks().forEach(track => track.stop())
    APP.localStream = null
    APP.channel.leave()

    APP.peerConnection.close()
}