const peer = new Peer()

let localStream, remoteStream, runningCall
 
const localVideoEl = document.getElementById('video1')
const remoteVideoEl = document.getElementById('video2')

async function init (screen) {
    return new Promise((resolve, reject) => {
        peer.on('open', (id) => {

            peer.on('connection', conn => {
                console.log(conn)

                conn.on('close', () => {
                    localStream.getTracks().forEach(track => track.stop())
                    localStream = null
                    remoteStream = null

                    screen('welcome')
                })
            })

            peer.on('call', call => {

                call.answer(localStream)

                call.on('stream', stream => {
                    remoteStream = remoteVideoEl.srcObject = stream
                })

            })
            
            resolve(id)
        })
    })
}

async function startLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    localStream.getAudioTracks().forEach(track => track.enabled = false)
    localVideoEl.srcObject = localStream
}


async function peerCall (id) {
    await startLocalStream()
    
    const conn = peer.connect(id)
    
    const call = peer.call(id, localStream)

    call.on('stream', stream => {
        remoteStream = remoteVideoEl.srcObject = stream
    })

    call.on('close', () => {
        localStream.getTracks().forEach(track => track.stop())
        localStream = null
        remoteStream = null

        conn.close()
    })

    runningCall = call
}

function toggleVideo () {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
    }
}

function toggleAudio () {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
    }
}

function cut () {
    if (runningCall) runningCall.close()
}