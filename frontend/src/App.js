import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import './App.css';

const BACKEND_URL = 'http://localhost:3000';
const APP_ID_FRONTEND = process.env.REACT_APP_ID;
const APP_SECRET_FRONTEND = process.env.REACT_APP_SECRET;
const PROVIDER_ID_FRONTEND = process.env.REACT_APP_PROVIDER_ID;

function App() {
  const [reclaimProofRequest, setReclaimProofRequest] = useState(null);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(''); // '', 'pending', 'success', 'failure'
  const [statusMessage, setStatusMessage] = useState('アプリを初期化しています...');
  const [proofData, setProofData] = useState(null); // To store the received proof

  // New state for user info form
  const [userInfo, setUserInfo] = useState({
    employeeId: '',
    department: '',
    name: '',
  });
  const [isSubmittingUserInfo, setIsSubmittingUserInfo] = useState(false);

  useEffect(() => {
    async function initializeReclaim() {
      try {
        setStatusMessage('Reclaim SDKを初期化中...');
        const proofRequest = await ReclaimProofRequest.init(
          APP_ID_FRONTEND,
          APP_SECRET_FRONTEND,
          PROVIDER_ID_FRONTEND
        );
        setReclaimProofRequest(proofRequest);
        setStatusMessage('Reclaim SDK初期化完了。認証を開始してください。\n');
      } catch (error) {
        console.error('Reclaim SDK初期化エラー:', error);
        setStatusMessage(`SDK初期化エラー: ${error.message}`);
        setVerificationStatus('failure');
      }
    }
    initializeReclaim();
  }, []);

  const handleCreateClaim = async () => {
    if (!reclaimProofRequest) {
      setStatusMessage('SDKが初期化されていません。リフレッシュしてください。\n');
      return;
    }
    try {
      setStatusMessage('QRコードURLを生成中...');
      const url = await reclaimProofRequest.getRequestUrl();
      setQrCodeValue(url);
      setStatusMessage('QRコードをスキャンして認証を開始してください。\n');

      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          console.log('onSuccessCallback: Proofs received in frontend:', proofs);
          setStatusMessage('Proof受信。バックエンドで検証中...');
          setVerificationStatus('pending');
          setQrCodeValue(''); 

          let proofToSend;
          if (typeof proofs === 'string') {
            try {
              proofToSend = JSON.parse(proofs);
            } catch (e) {
               setStatusMessage('受信したProofの形式が不正です。\n');
               setVerificationStatus('failure');
               return;
            }
          } else if (Array.isArray(proofs) && proofs.length > 0) {
            proofToSend = proofs[0];
          } else if (typeof proofs === 'object' && proofs !== null) {
            proofToSend = proofs;
          } else {
            setStatusMessage('受信したProofの形式が不明です。\n');
            setVerificationStatus('failure');
            return;
          }
          setProofData(proofToSend); // Store proof data
          
          const verifyResponse = await fetch(`${BACKEND_URL}/receive-proofs`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, 
            body: JSON.stringify(proofToSend)
          });
          const result = await verifyResponse.json();

          if (verifyResponse.ok && result.status === 'success') {
            setVerificationStatus('success');
            setStatusMessage('github認証成功。社員情報を入力してください。\n');
          } else {
            setVerificationStatus('failure');
            setStatusMessage(result.error || '認証に失敗しました。\n');
          }
        },
        onFailure: (error) => {
          console.error('onFailureCallback: Error receiving proof in frontend:', error);
          setQrCodeValue('');
          setStatusMessage('Proofの取得/検証に失敗しました。\n');
          setVerificationStatus('failure');
        }
      });
    } catch (error) {
      console.error('handleCreateClaim エラー:', error);
      setStatusMessage(`認証プロセス開始エラー: ${error.message}`);
      setVerificationStatus('failure');
    }
  };

  // Handle form input change
  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleUserInfoSubmit = async (e) => {
    e.preventDefault();
    if (!userInfo.employeeId || !userInfo.department || !userInfo.name) {
      setStatusMessage('すべての社員情報を入力してください。');
      return;
    }
    setIsSubmittingUserInfo(true);
    setStatusMessage('社員情報を送信中...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/submit-user-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userInfo: userInfo, 
          proof: proofData 
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setStatusMessage('社員情報が正常に送信されました。');
        // Optionally, reset form or navigate
        setUserInfo({ employeeId: '', department: '', name: '' }); 
      } else {
        setStatusMessage(result.error || '社員情報の送信に失敗しました。');
      }
    } catch (error) {
      console.error('Error submitting user info:', error);
      setStatusMessage('社員情報の送信中にエラーが発生しました。');
    }
    setIsSubmittingUserInfo(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Reclaim Protocol GitHub認証</h1>
      </header>
      <main className="app-main">
        {verificationStatus !== 'success' && (
          <>
            {!qrCodeValue && verificationStatus !== 'failure' && (
              <button onClick={handleCreateClaim} className="auth-button" disabled={!reclaimProofRequest || verificationStatus === 'pending'}>
                {verificationStatus === 'pending' ? '検証中...' : 'GitHubで認証を開始'}
              </button>
            )}
            {qrCodeValue && (
              <div className="qr-code-container">
                <p>以下のQRコードをReclaimアプリでスキャンしてください:</p>
                <QRCode value={qrCodeValue} size={256} level="H" bgColor="#FFFFFF" fgColor="#000000" />
              </div>
            )}
          </>
        )}

        <div className="status-container">
          <p className={`status-message ${verificationStatus}`}>{statusMessage}</p>
        </div>

        {verificationStatus === 'success' && (
          <div className="user-info-form-container">
            <h2>社員情報入力</h2>
            <form onSubmit={handleUserInfoSubmit}>
              <div className="form-group">
                <label htmlFor="employeeId">社員番号:</label>
                <input 
                  type="text" 
                  id="employeeId" 
                  name="employeeId" 
                  value={userInfo.employeeId} 
                  onChange={handleUserInfoChange} 
                  placeholder="例: 12345"
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="department">部署名:</label>
                <input 
                  type="text" 
                  id="department" 
                  name="department" 
                  value={userInfo.department} 
                  onChange={handleUserInfoChange} 
                  placeholder="例: 開発部"
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">氏名:</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={userInfo.name} 
                  onChange={handleUserInfoChange} 
                  placeholder="例: 山田 太郎"
                  required 
                />
              </div>
              <button type="submit" className="submit-button" disabled={isSubmittingUserInfo}>
                {isSubmittingUserInfo ? '送信中...' : '送信'}
              </button>
            </form>
          </div>
        )}
      </main>
      <footer className="app-footer">
        <p>Reclaim Protocol Demo</p>
      </footer>
    </div>
  );
}

export default App;

