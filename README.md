# Reclaim Protocol Web Proof発行/検証 Webアプリケーション

このリポジトリは、Reclaim Protocolを使用してWeb Proofの発行と検証、およびその後の情報登録を行うReactベースのWebアプリケーションです。

## プロジェクト構成

```
reclaim-app/
├── backend/      # Node.jsバックエンド
│   ├── .env          # バックエンド用環境変数ファイル (各自作成)
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js   # バックエンドサーバーロジック
└── frontend/     # Reactフロントエンド
    ├── .env          # フロントエンド用環境変数ファイル (各自作成)
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

### 1. 環境変数の設定

アプリケーションを実行する前に、フロントエンドとバックエンドの両方で環境変数を設定する必要があります。

**フロントエンド (`reclaim-app/frontend/.env`):**

プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下の内容を記述してください。プレースホルダーの値を実際の値に置き換えてください。

```env
REACT_APP_ID=your_frontend_app_id
REACT_APP_SECRET=your_frontend_app_secret
REACT_APP_PROVIDER_ID=your_frontend_provider_id
```

**バックエンド (`reclaim-app/backend/.env`):**

プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下の内容を記述してください。プレースホルダーの値を実際の値に置き換えてください。

```env
REACT_APP_ID=your_backend_app_id
REACT_APP_SECRET=your_backend_app_secret
REACT_APP_PROVIDER_ID=your_backend_provider_id
PORT=3000
```

**注意:** `.env` ファイルは `.gitignore` に追加し、バージョン管理システムにコミットしないでください。

### 2. バックエンドサーバーの起動

```bash
cd reclaim-app/backend

# 依存関係のインストール (初回のみ)
npm install

# バックエンドサーバーの起動 (デフォルトポート: 3000)
npm start
# または node server.js
```

バックエンドサーバーが `http://localhost:3000` （または`.env`で指定したPORT）で起動します。

### 3. フロントエンドアプリケーションの起動

別のターミナルを開き、以下のコマンドを実行します。

```bash
cd reclaim-app/frontend

# 依存関係のインストール (初回のみ)
npm install

# フロントエンド開発サーバーの起動 (デフォルトポート: 3001 または CRAが指定するポート)
npm start
```

フロントエンドアプリケーションが開発サーバーで起動し、ブラウザで自動的に開かれます（通常は `http://localhost:3001` など）。

## アプリケーションフロー

1.  **Step 1: Web Proof発行/検証**
    *   フロントエンド (`http://localhost:3001` など) にアクセスします。
    *   「Web Proof発行/検証を開始」ボタンをクリックします。
    *   QRコードが表示されます。
    *   お手持ちのスマートフォンにインストールされたReclaimアプリでQRコードをスキャンします。
    *   Reclaimアプリの指示に従い、指定された情報源（例: GitHub）での認証とProofの作成・提出を行います。
    *   認証とProof検証が成功すると、フロントエンド画面に「Step1: Web Proof発行/検証 成功。Step2: 登録申請に進んでください。」といったメッセージが表示され、Step2がアクティブになります。
    *   失敗した場合はエラーメッセージが表示されます。

2.  **Step 2: 登録申請**
    *   Step1が成功すると、社員情報（社員番号、部署名、氏名）の入力フォームがアクティブになります。
    *   必要な情報を入力し、「送信」ボタンをクリックします。
    *   入力された情報は、Step1で検証されたProofと共にバックエンドに送信されます。
    *   バックエンドは情報を受信し、コンソールに出力します（本番環境ではデータベース保存などの処理を想定）。
    *   フロントエンドには送信結果のメッセージが表示されます。

## 注意事項

-   **セキュリティ**: `REACT_APP_SECRET` などの機密情報は、`.env` ファイルに記述し、絶対にバージョン管理システムにコミットしないでください。`.env` ファイルは必ず `.gitignore` に追加してください。フロントエンドコードに直接シークレットを含めることは、本番環境では避けるべきです。今回の実装ではフロントエンドも `.env` から読み込みますが、よりセキュアな構成としては、フロントエンドはバックエンドAPIを通じて必要な処理を行い、シークレットはバックエンドのみで管理することを推奨します。
-   **エラーハンドリング**: 現状は基本的なエラーハンドリングのみ実装されています。本番運用に向けて、より詳細なエラーログの記録やユーザーへのフィードバック強化をご検討ください。
-   **環境変数名**: バックエンドでも `REACT_APP_` プレフィックスの環境変数名を使用していますが、これはフロントエンドの `.env` ファイルの命名規則に合わせたものです。バックエンド専用の環境変数名（例: `APP_ID`, `APP_SECRET`）を使用することも可能です。その場合は `server.js` 内の参照箇所も適宜修正してください。

## AWSへのデプロイについて (概要)

### フロントエンド (React)

-   `npm run build` コマンドで静的ファイルを生成します。
-   生成された `build` ディレクトリの内容を、AWS S3バケットにホスティングし、CloudFront経由で配信するのが一般的な方法です。
-   環境変数（`REACT_APP_ID` など）は、ビルドプロセス中またはデプロイ先の環境設定（例: Amplify, S3/CloudFrontのLambda@Edgeなど）で適切に設定する必要があります。

### バックエンド (Node.js/Express)

-   AWS Elastic Beanstalk, AWS App Runner, Amazon ECS (with Fargate), またはEC2インスタンス上にデプロイする方法があります。
-   アプリケーションの依存関係 (`package.json`) を含めてデプロイパッケージを作成します。
-   環境変数 (`REACT_APP_ID`, `REACT_APP_SECRET`, `REACT_APP_PROVIDER_ID`, `PORT` など) は、各AWSサービスの環境設定機能を使用して安全に設定します。
-   CORS設定が本番環境のドメインを許可していることを確認してください。
-   HTTPS化を忘れずに行ってください（例: ALBやCloudFrontを利用）。

上記は一般的な指針であり、具体的な手順は選択するAWSサービスやアーキテクチャによって異なります。AWSの公式ドキュメントをご参照ください。

