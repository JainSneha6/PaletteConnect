import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { FaChalkboardTeacher } from 'react-icons/fa';

const socket = io('https://paletteconnect.onrender.com'); // Adjust to your server URL

const VideoRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [peers, setPeers] = useState([]);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const videoGrid = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            userVideo.current.srcObject = stream; // Show local video

            socket.emit('joinRoom', roomId);

            socket.on('user-connected', (userId) => {
                const peer = createPeer(userId, socket.id, stream);
                peersRef.current.push({ peerID: userId, peer });
                setPeers((users) => [...users, peer]); // Update peers state
            });

            socket.on('signal', ({ signalData, from }) => {
                const peerObj = peersRef.current.find((p) => p.peerID === from);
                if (peerObj) {
                    peerObj.peer.signal(signalData);
                }
            });

            socket.on('user-disconnected', (userId) => {
                const peerObj = peersRef.current.find((p) => p.peerID === userId);
                if (peerObj) {
                    peerObj.peer.destroy(); // Destroy peer on disconnect
                    setPeers((users) => users.filter((p) => p.peerID !== userId)); // Update peers state
                }
            });
        });

        return () => {
            socket.off('user-connected');
            socket.off('signal');
            socket.off('user-disconnected');
        };
    }, [roomId]);

    const createPeer = (userToSignal, callerID, stream) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('signal', { signalData: signal, to: userToSignal });
        });

        peer.on('stream', (stream) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            videoGrid.current.append(video); // Append the video to the grid
        });

        return peer;
    };

    const joinWhiteboard = () => {
        navigate(`/room/${roomId}`);
    };

    return (
        <div className="flex flex-col items-center p-4">
            <div ref={videoGrid} className="flex flex-wrap justify-center items-center gap-4 mb-4">
                <video muted ref={userVideo} autoPlay playsInline className="w-48 h-auto border-2 border-blue-500 rounded" />
                {/* Peers' videos will be added to videoGrid */}
            </div>
            <button onClick={joinWhiteboard} className="flex items-center bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 px-4 rounded">
                <FaChalkboardTeacher className="mr-2" /> Switch to Whiteboard
            </button>
        </div>
    );
};

export default VideoRoom;
