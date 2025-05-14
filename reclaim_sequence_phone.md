```mermaid
sequenceDiagram
    participant ユーザー
    participant フロントエンド
    participant スマホAPP
    participant バックエンド

    ユーザー->>フロントエンド: 認証開始ボタンをクリック
    activate フロントエンド
    フロントエンド->>フロントエンド: ReclaimProofRequest.init() (SDK初期化)
    フロントエンド->>フロントエンド: getRequestUrl() (QRコード用URL生成)
    フロントエンド-->>ユーザー: QRコード表示
    deactivate フロントエンド

    ユーザー->>スマホAPP: QRコードをスキャン
    activate スマホAPP
    スマホAPP->>スマホAPP: (Reclaimサーバーと通信し認証情報要求)
    ユーザー->>スマホAPP: 認証情報を提供しProof作成・提出
    スマホAPP-->>フロントエンド: Proofを送信 (onSuccessコールバック)
    deactivate スマホAPP
    activate フロントエンド

    フロントエンド->>バックエンド: /receive-proofs APIへProofを送信して検証依頼
    activate バックエンド
    バックエンド->>バックエンド: 受信したProofを検証 (verifyProof)
    バックエンド-->>フロントエンド: 検証結果を返却
    deactivate バックエンド

    フロントエンド->>ユーザー: 検証結果を表示 (認証成功/失敗)
    deactivate フロントエンド