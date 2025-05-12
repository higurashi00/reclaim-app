import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { ReclaimProofRequest, verifyProof } from '@reclaimprotocol/js-sdk'; // verifyProof might not be needed in frontend if backend handles all verification
import './App.css';

const BACKEND_URL = 'http://localhost:3000';
// These should ideally be configured securely, e.g., via environment variables for the build process
// For this example, they are hardcoded as per the GitHub example structure for frontend initialization.
const APP_ID_FRONTEND = process.env.REACT_APP_ID;
// APP_SECRET is NOT directly used in the frontend for ReclaimProofRequest.init() as per the latest GitHub example.
// The GitHub example initializes ReclaimProofRequest with APP_ID, APP_SECRET, and PROVIDER_ID directly in the frontend.
// This implies the secret is exposed client-side, which is a security concern for production.
// However, to align with the provided GitHub example for js-sdk v2, we will follow that pattern.
// For a production app, the backend should handle sensitive parts like secret management.
const APP_SECRET_FRONTEND = process.env.REACT_APP_SECRET;
const PROVIDER_ID_FRONTEND = process.env.REACT_APP_PROVIDER_ID;

function App() {
  const [reclaimProofRequest, setReclaimProofRequest] = useState(null);
  const [qrCodeValue, setQrCodeValue] = useState(''); // This will be the URL from getRequestUrl()
  const [verificationStatus, setVerificationStatus] = useState(''); // '', 'pending', 'success', 'failure'
  const [statusMessage, setStatusMessage] = useState('アプリを初期化しています...');

  // Step 1: Initialize ReclaimProofRequest on component mount
  useEffect(() => {
    async function initializeReclaim() {
      try {
        setStatusMessage('Reclaim SDKを初期化中...');
        console.log('Initializing ReclaimProofRequest with:', APP_ID_FRONTEND, APP_SECRET_FRONTEND, PROVIDER_ID_FRONTEND);
        
        // As per GitHub example for js-sdk v2
        const proofRequest = await ReclaimProofRequest.init(
          APP_ID_FRONTEND,
          APP_SECRET_FRONTEND, // Including secret here as per GitHub example, though it's a security risk client-side
          PROVIDER_ID_FRONTEND
        );
        setReclaimProofRequest(proofRequest);
        setStatusMessage('Reclaim SDK初期化完了。認証を開始してください。');
        console.log('ReclaimProofRequest initialized:', proofRequest);
      } catch (error) {
        console.error('Reclaim SDK初期化エラー:', error);
        setStatusMessage(`SDK初期化エラー: ${error.message}`);
        setVerificationStatus('failure');
      }
    }
    initializeReclaim();
  }, []);

  // Step 2: Function to handle claim creation and QR code display
  const handleCreateClaim = async () => {
    if (!reclaimProofRequest) {
      console.error('Reclaim Proof Requestが初期化されていません。');
      setStatusMessage('SDKが初期化されていません。リフレッシュしてください。');
      return;
    }
    try {
      setStatusMessage('QRコードURLを生成中...');
      const url = await reclaimProofRequest.getRequestUrl();
      setQrCodeValue(url);
      setStatusMessage('QRコードをスキャンして認証を開始してください。');
      console.log('Request URL for QR Code:', url);

      // Step 3: Start listening for the proof
      // The session for proof submission is started here.
      // The user scans the QR code, and the Reclaim app sends the proof.
      console.log('Starting session to listen for proofs...');
      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          console.log('onSuccessCallback: Proofs received in frontend:', proofs);
          setStatusMessage('Proof受信。バックエンドで検証中...');
          setVerificationStatus('pending');
          setQrCodeValue(''); // Clear QR code after successful scan and proof receipt

          try {
            // The GitHub example shows proofs can be a string (message) or an array/object (actual proof)
            // We need to send the actual proof object to the backend.
            let proofToSend;
            if (typeof proofs === 'string') {
              // This case might happen if a custom callback URL is set on the Reclaim dashboard
              // and the SDK receives a message instead of the proof directly.
              // For this example, we expect the proof object directly.
              console.warn('Received a string message instead of proof object. This might indicate a misconfiguration or a different flow. Attempting to parse if JSON string.');
              try {
                proofToSend = JSON.parse(proofs);
              } catch (e) {
                 console.error('Failed to parse string as JSON proof:', proofs, e);
                 setStatusMessage('受信したProofの形式が不正です。');
                 setVerificationStatus('failure');
                 return;
              }
            } else if (Array.isArray(proofs) && proofs.length > 0) {
              proofToSend = proofs[0]; // Taking the first proof if it's an array
            } else if (typeof proofs === 'object' && proofs !== null) {
              proofToSend = proofs;
            } else {
              console.error('Received unexpected proof format:', proofs);
              setStatusMessage('受信したProofの形式が不明です。');
              setVerificationStatus('failure');
              return;
            }
            
            console.log('Sending proof to backend /receive-proofs:', proofToSend);
            const verifyResponse = await fetch(`${BACKEND_URL}/receive-proofs`, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' }, // Backend expects text/plain for this route
              body: JSON.stringify(proofToSend) // Send proof as JSON string
            });
            console.log('Received response from /receive-proofs:', verifyResponse.status, verifyResponse.statusText);
            const result = await verifyResponse.json();
            console.log('Verification result from backend:', result);

            if (verifyResponse.ok && result.status === 'success') {
              setVerificationStatus('success');
              setStatusMessage('github認証成功');
            } else {
              setVerificationStatus('failure');
              setStatusMessage(result.error || '認証に失敗しました。');
            }
          } catch (err) {
            console.error('Proof検証API呼び出しエラー (fetch /receive-proofs):', err);
            setVerificationStatus('failure');
            setStatusMessage('バックエンドとの通信に失敗しました。');
          }
        },
        onFailure: (error) => {
          console.error('onFailureCallback: Error receiving proof in frontend:', error);
          setQrCodeValue(''); // Clear QR code on failure
          setStatusMessage('Proofの取得/検証に失敗しました。');
          setVerificationStatus('failure');
        }
      });
    } catch (error) {
      console.error('handleCreateClaim エラー:', error);
      setStatusMessage(`認証プロセス開始エラー: ${error.message}`);
      setVerificationStatus('failure');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Reclaim Protocol GitHub認証</h1>
      </header>
      <main className="app-main">
        {!qrCodeValue && verificationStatus !== 'success' && (
          <button onClick={handleCreateClaim} className="auth-button" disabled={!reclaimProofRequest || verificationStatus === 'pending'}>
            {verificationStatus === 'pending' ? '検証中...' : 'GitHubで認証を開始'}
          </button>
        )}
        {qrCodeValue && verificationStatus !== 'success' && verificationStatus !== 'failure' && (
          <div className="qr-code-container">
            <p>以下のQRコードをReclaimアプリでスキャンしてください:</p>
            <QRCode value={qrCodeValue} size={256} level="H" bgColor="#FFFFFF" fgColor="#000000" />
          </div>
        )}
        <div className="status-container">
          <p className={`status-message ${verificationStatus}`}>{statusMessage}</p>
        </div>
      </main>
      <footer className="app-footer">
        <p>Reclaim Protocol Demo</p>
      </footer>
    </div>
  );
}

export default App;

