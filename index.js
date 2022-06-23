let peer, localStream, remoteStream, runningCall, incomingCall, runningConn, cut

const localVideoEl = document.getElementById('video1')
const remoteVideoEl = document.getElementById('video2')

async function init (screen, showMessage) {

    cut = () => {

        if (runningConn) runningConn.close()
        runningConn = null
    
        localStream && localStream.getTracks().forEach(track => track.stop())
        localStream = null
        
        if (runningCall) {
            
            runningCall.close()
            runningCall = null
            
            remoteStream = null            

            screen('welcome')
            showMessage('Call Ended')

        }
    }

    return new Promise((resolve, reject) => {
        
        peer = new Peer(Math.random().toString(32).split('.')[1].toUpperCase())
        
        peer.on('open', id => {

            peer.on('call', call => {
                
                console.log('NEW CALL')                

                runningCall = call
                
                if (localStream) {
                    call.answer(localStream)
                } else {
                    incomingCall = call
                }

                call.on('stream', stream => {
                    remoteStream = remoteVideoEl.srcObject = stream
                })

                call.on('close', () => {
                    console.log('CALL CLOSED')
                    cut()
                })

            })

            peer.on('connection', conn => {
                runningConn = conn
    
                conn.on('close', () => {
                    console.log('CONN CLOSED')
                    cut()
                })
            })
            
            resolve(id)
        })

        peer.on('error', error => {
            console.error(error)
        })
    })
}

/**
 * Collects the local stream of the user
 */
async function startLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    localStream.getAudioTracks().forEach(track => track.enabled = false)
    localVideoEl.srcObject = localStream

    if (incomingCall) {
        incomingCall.answer(localStream)
        incomingCall = null
    }
}


async function peerCall (id, screen) {
    
    await startLocalStream()

    const conn = runningConn = peer.connect(id)
    
    conn.on('data', data => {})

    conn.on('close', () => {
        console.log('CONN CLOSED')
        cut()
    })

    const call = runningCall =  peer.call(id, localStream)

    call.on('stream', stream => {
        remoteStream = remoteVideoEl.srcObject = stream
    })
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