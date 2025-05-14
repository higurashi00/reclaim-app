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
  const [sdkInitializationMessage, setSdkInitializationMessage] = useState('');
  const [proofData, setProofData] = useState(null); 
  const [currentStep, setCurrentStep] = useState(1); // 1: Proof, 2: UserInfo

  const [userInfo, setUserInfo] = useState({
    employeeId: '',
    department: '',
    name: '',
  });
  const [isSubmittingUserInfo, setIsSubmittingUserInfo] = useState(false);

  useEffect(() => {
    async function initializeReclaim() {
      try {
        if (!APP_ID_FRONTEND || !APP_SECRET_FRONTEND || !PROVIDER_ID_FRONTEND) {
          console.error('Error: Missing one or more Reclaim environment variables in frontend (REACT_APP_ID, REACT_APP_SECRET, REACT_APP_PROVIDER_ID)');
          setStatusMessage('フロントエンド設定エラー: 必要な環境変数がありません。');
          setVerificationStatus('failure');
          return;
        }
        setStatusMessage('Reclaim SDKを初期化中...');
        const proofRequest = await ReclaimProofRequest.init(
          APP_ID_FRONTEND,
          APP_SECRET_FRONTEND,
          PROVIDER_ID_FRONTEND
        );
        setReclaimProofRequest(proofRequest);
        setSdkInitializationMessage('Reclaim SDK初期化完了。「Web Proof発行/検証」を開始してください。');
        setStatusMessage(''); // Clear general status message after SDK init message is set
      } catch (error) {
        console.error('Reclaim SDK初期化エラー:', error);
        setSdkInitializationMessage(''); // Clear SDK init message on error
        setStatusMessage(`SDK初期化エラー: ${error.message}`);
        setVerificationStatus('failure');
      }
    }
    initializeReclaim();
  }, []);

  const handleCreateClaim = async () => {
    if (!reclaimProofRequest) {
      setStatusMessage('SDKが初期化されていません。リフレッシュしてください。');
      return;
    }
    try {
      setSdkInitializationMessage(''); // Clear SDK init message when claim creation starts
      setStatusMessage('QRコードURLを生成中...');
      setVerificationStatus('pending'); 
      const url = await reclaimProofRequest.getRequestUrl();
      setQrCodeValue(url);
      setStatusMessage('QRコードをスキャンして「Web Proof発行/検証」を開始してください。');

      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          console.log('onSuccessCallback: Proofs received in frontend:', proofs);
          setStatusMessage('Proof受信。バックエンドで検証中...');
          setQrCodeValue(''); 

          let proofToSend;
          if (typeof proofs === 'string') {
            try {
              proofToSend = JSON.parse(proofs);
            } catch (e) {
               setStatusMessage('受信したProofの形式が不正です。');
               setVerificationStatus('failure');
               return;
            }
          } else if (Array.isArray(proofs) && proofs.length > 0) {
            proofToSend = proofs[0];
          } else if (typeof proofs === 'object' && proofs !== null) {
            proofToSend = proofs;
          } else {
            setStatusMessage('受信したProofの形式が不明です。');
            setVerificationStatus('failure');
            return;
          }
          setProofData(proofToSend); 
          
          const verifyResponse = await fetch(`${BACKEND_URL}/receive-proofs`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, 
            body: JSON.stringify(proofToSend)
          });
          const result = await verifyResponse.json();

          if (verifyResponse.ok && result.status === 'success') {
            setVerificationStatus('success');
            setStatusMessage('Step1: Web Proof発行/検証 成功。Step2: 登録申請に進んでください。');
            setCurrentStep(2); 
          } else {
            setVerificationStatus('failure');
            setStatusMessage(result.error || 'Web Proof発行/検証に失敗しました。');
          }
        },
        onFailure: (error) => {
          console.error('onFailureCallback: Error receiving proof in frontend:', error);
          setQrCodeValue('');
          setStatusMessage('Proofの取得/検証に失敗しました。');
          setVerificationStatus('failure');
        }
      });
    } catch (error) {
      console.error('handleCreateClaim エラー:', error);
      setStatusMessage(`「Web Proof発行/検証」プロセス開始エラー: ${error.message}`);
      setVerificationStatus('failure');
    }
  };

  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleUserInfoSubmit = async (e) => {
    e.preventDefault();
    if (!userInfo.employeeId || !userInfo.department || !userInfo.name) {
      setStatusMessage('すべての社員情報を入力してください。');
      return;
    }
    setIsSubmittingUserInfo(true);
    setStatusMessage('社員情報を送信中...');
    
    let extractedName = null;
    let extractedBestScore = null;

    if (proofData && proofData.claimData && typeof proofData.claimData.parameters === 'string') {
      try {
        const parametersObject = JSON.parse(proofData.claimData.parameters);
        if (parametersObject && parametersObject.paramValues) {
          extractedName = parametersObject.paramValues.NAME || null; // キー名を大文字のNAMEに修正
          extractedBestScore = parametersObject.paramValues.BestScore || null;
        }
      } catch (error) {
        console.error("Error parsing parameters JSON string:", error);
        setStatusMessage("Proofデータ形式エラー:パラメータの解析に失敗しました。");
      }
    }

    console.log('Extracted Name from proof:', extractedName);
    console.log('Extracted BestScore from proof:', extractedBestScore);

    try {
      const response = await fetch(`${BACKEND_URL}/submit-user-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userInfo: userInfo, 
          proof: { // proofオブジェクトとして送信
            Name: extractedName, 
            BestScore: extractedBestScore 
          }
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setStatusMessage('社員情報が正常に送信されました。');
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
        <h1>Web Proof 発行/検証テスト（Reclaim Protocol）</h1>
      </header>
      <main className="app-main">
        <div className={`step-container ${currentStep === 1 ? 'active' : 'inactive'}`}>
          <h2>Step 1: Web Proof発行/検証</h2>
          {sdkInitializationMessage && currentStep === 1 && !qrCodeValue && verificationStatus !== 'success' && verificationStatus !== 'failure' && (
            <p className="sdk-init-message">{sdkInitializationMessage}</p>
          )}
          {currentStep === 1 && verificationStatus !== 'success' && (
            <>
              {!qrCodeValue && verificationStatus !== 'failure' && (
                <button onClick={handleCreateClaim} className="auth-button" disabled={!reclaimProofRequest || verificationStatus === 'pending' || verificationStatus === 'failure'}>
                  {verificationStatus === 'pending' ? '検証中...' : 'Web Proof発行/検証を開始'}
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
        </div>

        <div className={`step-container ${currentStep === 2 ? 'active' : 'inactive'}`}>
          <h2>Step 2: 登録申請</h2>
          <div className={`user-info-form-container ${currentStep !== 2 ? 'form-disabled' : ''}`}>
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
                  disabled={currentStep !== 2 || isSubmittingUserInfo}
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
                  disabled={currentStep !== 2 || isSubmittingUserInfo}
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
                  disabled={currentStep !== 2 || isSubmittingUserInfo}
                />
              </div>
              <button type="submit" className="submit-button" disabled={currentStep !== 2 || isSubmittingUserInfo || !proofData}>
                {isSubmittingUserInfo ? '送信中...' : '送信'}
              </button>
            </form>
          </div>
          {currentStep !== 2 && (
            <p className="status-message info">Step 1を完了すると、登録申請フォームが有効になります。</p>
          )}
        </div>

        {statusMessage && (
          <div className="status-container">
            <p className={`status-message ${verificationStatus}`}>{statusMessage}</p>
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

