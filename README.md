# Reclaim Protocol GitHub認証 Webアプリケーション

このリポジトリは、Reclaim Protocolを使用してGitHub認証を行うReactベースのWebアプリケーションです。

## プロジェクト構成

```
reclaim-app/
├── backend/      # Node.jsバックエンド
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js   # バックエンドサーバーロジック
└── frontend/     # Reactフロントエンド
    ├── node_modules/
    ├── public/
    ├── src/
    │   ├── App.css     # アプリケーションのスタイルシート
    │   ├── App.js      # メインのReactコンポーネント
    │   ├── index.css   # グローバルスタイルシート
    │   ├── index.js    # アプリケーションのエントリーポイント
    │   └── ... (その他のReact関連ファイル)
    ├── package.json
    └── package-lock.json
```

## 事前準備

- Node.js (v16以上推奨)
- npm
- Reclaim Protocol アプリケーションID (APP_ID)
- Reclaim Protocol アプリケーションシークレット (APP_SECRET)
- Reclaim Protocol プロバイダーID (PROVIDER_ID) (例: GitHub認証の場合)

## ローカル環境での実行方法

### 1. バックエンドサーバーの起動

```bash
cd reclaim-app/backend

# 依存関係のインストール
npm install

# server.js内のAPP_ID, APP_SECRET, PROVIDER_IDを実際の値に置き換えてください。
# (本番環境では環境変数など、より安全な方法で管理することを強く推奨します)
# 例:
# const APP_ID = "YOUR_APPLICATION_ID";
# const APP_SECRET = "YOUR_APPLICATION_SECRET";
# const PROVIDER_ID = "YOUR_PROVIDER_ID";

# バックエンドサーバーの起動 (デフォルトポート: 3000)
npm start
```

バックエンドサーバーが `http://localhost:3000` で起動します。

### 2. フロントエンドアプリケーションの起動

別のターミナルを開き、以下のコマンドを実行します。

```bash
cd reclaim-app/frontend

# 依存関係のインストール
npm install

# App.js内のAPP_ID_FRONTEND, APP_SECRET_FRONTEND, PROVIDER_ID_FRONTEND を
# バックエンドのserver.jsで使用したものと同じ実際の値に置き換えてください。
# (本番環境では環境変数など、より安全な方法で管理することを強く推奨します)
# 例:
# const APP_ID_FRONTEND = "YOUR_APPLICATION_ID";
# const APP_SECRET_FRONTEND = "YOUR_APPLICATION_SECRET"; // セキュリティリスクあり。本番ではバックエンド経由を推奨
# const PROVIDER_ID_FRONTEND = "YOUR_PROVIDER_ID";

# フロントエンド開発サーバーの起動 (デフォルトポート: 3001)
npm start
```

フロントエンドアプリケーションが `http://localhost:3001` で起動し、ブラウザで自動的に開かれます。

## 認証フロー

1.  フロントエンド (`http://localhost:3001`) にアクセスします。
2.  「GitHubで認証を開始」ボタンをクリックします。
3.  QRコードが表示されます。
4.  お手持ちのスマートフォンにインストールされたReclaimアプリでQRコードをスキャンします。
5.  Reclaimアプリの指示に従い、GitHubアカウントでの認証とProofの作成・提出を行います。
6.  認証が成功すると、フロントエンド画面に「github認証成功」と表示されます。失敗した場合はエラーメッセージが表示されます。

## 注意事項

-   **セキュリティ**: `APP_SECRET` などの機密情報は、ソースコードに直接ハードコーディングするのではなく、環境変数やシークレット管理サービスを使用して安全に管理してください。特にフロントエンドコードにシークレットを含めることは、本番環境では避けるべきです。今回の実装は、公式ドキュメントのサンプルコードに準拠していますが、本番運用時にはバックエンドでシークレットを管理し、フロントエンドは安全なAPIエンドポイントを通じて必要な情報のみを取得する構成を検討してください。
-   **エラーハンドリング**: 現状は基本的なエラーハンドリングのみ実装されています。本番運用に向けて、より詳細なエラーログの記録やユーザーへのフィードバック強化をご検討ください。


## AWSへのデプロイについて (概要)

### フロントエンド (React)

-   `npm run build` コマンドで静的ファイルを生成します。
-   生成された `build` ディレクトリの内容を、AWS S3バケットにホスティングし、CloudFront経由で配信するのが一般的な方法です。
-   環境変数（`REACT_APP_BACKEND_URL` など）は、ビルドプロセス中またはデプロイ先の環境設定で適切に設定する必要があります。

### バックエンド (Node.js/Express)

-   AWS Elastic Beanstalk, AWS App Runner, Amazon ECS (with Fargate), またはEC2インスタンス上にデプロイする方法があります。
-   アプリケーションの依存関係 (`package.json`) を含めてデプロイパッケージを作成します。
-   環境変数 (`APP_ID`, `APP_SECRET`, `PROVIDER_ID`, `PORT` など) は、各AWSサービスの環境設定機能を使用して安全に設定します。
-   CORS設定が本番環境のドメインを許可していることを確認してください。
-   HTTPS化を忘れずに行ってください（例: ALBやCloudFrontを利用）。

上記は一般的な指針であり、具体的な手順は選択するAWSサービスやアーキテクチャによって異なります。AWSの公式ドキュメントをご参照ください。

