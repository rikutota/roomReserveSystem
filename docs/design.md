# 会議室予約システム 設計メモ

## 1. 技術構成

### フロントエンド

* React
* TypeScript
* Vite
* React Router
* fetch API

### バックエンド

* Node.js
* Express
* TypeScript
* Prisma

### データベース

* PostgreSQL

### 認証

* メールアドレスとパスワード
* パスワードはbcryptでハッシュ化
* 認証情報はHTTP Only Cookieで管理
* ログアウト時にCookieを削除する

## 2. システム構成

```text
ブラウザ
  │
  │ HTTP
  ▼
React
  │
  │ REST API
  ▼
Express
  │
  │ Prisma
  ▼
PostgreSQL
```

ReactからPostgreSQLへ直接接続せず、必ずExpressのAPIを経由する。

## 3. 画面構成

### `/register`

ユーザー登録画面。

入力項目：

* メールアドレス
* パスワード
* パスワード確認

### `/login`

ログイン画面。

入力項目：

* メールアドレス
* パスワード

### `/rooms`

会議室一覧画面。

表示内容：

* 会議室名
* 定員
* 説明
* 予約画面へのリンク

### `/rooms/:roomId`

会議室詳細・予約画面。

表示内容：

* 会議室情報
* 予約済み時間
* 予約開始時刻
* 予約終了時刻
* 予約ボタン

### `/reservations`

自分の予約一覧画面。

表示内容：

* 会議室名
* 開始時刻
* 終了時刻
* 予約キャンセルボタン

## 4. テーブル設計

### users

| カラム           | 型           | 説明           |
| ------------- | ----------- | ------------ |
| id            | UUID        | ユーザーID       |
| email         | VARCHAR     | メールアドレス      |
| password_hash | VARCHAR     | ハッシュ化したパスワード |
| created_at    | TIMESTAMPTZ | 登録日時         |

制約：

* `id`は主キー
* `email`は重複不可

### meeting_rooms

| カラム         | 型       | 説明    |
| ----------- | ------- | ----- |
| id          | UUID    | 会議室ID |
| name        | VARCHAR | 会議室名  |
| capacity    | INTEGER | 定員    |
| description | TEXT    | 説明    |

会議室は初期データとして登録し、初期版では追加・編集・削除機能を作らない。

### reservations

| カラム             | 型           | 説明       |
| --------------- | ----------- | -------- |
| id              | UUID        | 予約ID     |
| user_id         | UUID        | 予約したユーザー |
| meeting_room_id | UUID        | 予約した会議室  |
| start_at        | TIMESTAMPTZ | 利用開始日時   |
| end_at          | TIMESTAMPTZ | 利用終了日時   |
| created_at      | TIMESTAMPTZ | 予約登録日時   |

制約：

* `user_id`は`users.id`を参照
* `meeting_room_id`は`meeting_rooms.id`を参照
* `start_at < end_at`
* 予約時間は最大1時間
* 同じ会議室の予約時間は重複不可

## 5. テーブルの関連

```text
users
  1
  │
  │
  N
reservations
  N
  │
  │
  1
meeting_rooms
```

1人のユーザーは複数の予約を持てる。

1つの会議室は複数の予約を持てる。

## 6. API設計

### ユーザー登録

```http
POST /api/auth/register
```

リクエスト：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

処理：

1. 入力値を検証する
2. メールアドレスの重複を確認する
3. パスワードをハッシュ化する
4. ユーザーを登録する

### ログイン

```http
POST /api/auth/login
```

リクエスト：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

処理：

1. ユーザーをメールアドレスで検索する
2. パスワードを照合する
3. 認証Cookieを発行する

### ログアウト

```http
POST /api/auth/logout
```

処理：

1. 認証Cookieを削除する

### ログインユーザー取得

```http
GET /api/auth/me
```

レスポンス例：

```json
{
  "id": "ユーザーID",
  "email": "user@example.com"
}
```

未ログインの場合は`401 Unauthorized`を返す。

### 会議室一覧取得

```http
GET /api/rooms
```

### 会議室詳細取得

```http
GET /api/rooms/:roomId
```

### 会議室の予約状況取得

```http
GET /api/rooms/:roomId/reservations
```

クエリ例：

```http
GET /api/rooms/:roomId/reservations?date=2026-08-01
```

### 予約作成

```http
POST /api/reservations
```

リクエスト：

```json
{
  "meetingRoomId": "会議室ID",
  "startAt": "2026-08-01T10:00:00+09:00",
  "endAt": "2026-08-01T11:00:00+09:00"
}
```

処理：

1. ログイン状態を確認する
2. 会議室が存在するか確認する
3. 開始時刻と終了時刻を検証する
4. 過去の予約でないか確認する
5. 予約時間が1時間以内か確認する
6. 同じ会議室に重複予約がないか確認する
7. 予約を登録する

### 自分の予約一覧取得

```http
GET /api/reservations/me
```

### 予約キャンセル

```http
DELETE /api/reservations/:reservationId
```

処理：

1. ログイン状態を確認する
2. 予約が存在するか確認する
3. ログインユーザー本人の予約か確認する
4. 予約を削除する

## 7. 予約重複判定

既存予約と新規予約が次の条件を両方満たす場合、重複とする。

```text
既存予約.start_at < 新規予約.end_at
AND
既存予約.end_at > 新規予約.start_at
```

既存予約が`10:00〜11:00`、新規予約が`11:00〜12:00`の場合は重複しない。

```text
10:00 < 12:00 → true
11:00 > 11:00 → false
```

条件を両方満たさないため、予約可能。

重複判定はユーザー単位ではなく、会議室単位で行う。

## 8. 入力値の検証

### ユーザー登録

* メールアドレス形式である
* メールアドレスが未登録である
* パスワードが8文字以上である

### 予約

* 会議室IDが存在する
* 開始時刻が終了時刻より前である
* 開始時刻が現在時刻より後である
* 利用時間が1時間以内である
* 同じ会議室の既存予約と重複しない

入力値はフロントエンドとバックエンドの両方で検証する。

バックエンド側の検証を最終的な判定とする。

## 9. HTTPステータス

| ステータス | 用途                |
| ----- | ----------------- |
| 200   | 取得・ログイン・ログアウト成功   |
| 201   | ユーザー登録・予約作成成功     |
| 400   | 入力値が不正            |
| 401   | 未ログイン             |
| 403   | 他人の予約を操作しようとした    |
| 404   | 会議室や予約が存在しない      |
| 409   | メールアドレスまたは予約時間が重複 |
| 500   | サーバー内部エラー         |

## 10. 日時の扱い

データベースでは`TIMESTAMPTZ`を使用する。

日時はデータベース内部ではUTCとして保存し、画面上では日本時間に変換して表示する。

フロントエンドからAPIへはISO 8601形式で送信する。

```text
2026-08-01T10:00:00+09:00
```

## 11. ディレクトリ構成

```text
meeting-room-system/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── api/
│       └── types/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── schemas/
├── docs/
│   ├── requirements.md
│   └── design.md
└── README.md
```

## 12. 実装順序

1. GitHubリポジトリを作成する
2. Reactプロジェクトを作成する
3. Expressプロジェクトを作成する
4. PostgreSQLとPrismaを設定する
5. 会議室一覧を実装する
6. ユーザー登録を実装する
7. ログイン・ログアウトを実装する
8. 予約作成を実装する
9. 重複予約防止を実装する
10. 自分の予約一覧を実装する
11. 予約キャンセルを実装する
12. テストとデプロイを行う
