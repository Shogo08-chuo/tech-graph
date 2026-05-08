export const metadata = {
  title: "プライバシーポリシー | TechGraph",
  description: "TechGraph のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
      <div className="mx-auto max-w-3xl rounded-lg border border-[#d9dee7] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-3 text-sm leading-7 text-[#536174]">
          TechGraph（以下、「本サービス」）は、ユーザーの個人情報を以下の方針に基づいて取り扱います。
        </p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">1. 取得する情報</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            本サービスでは GitHub ログインおよび Google ログインを利用しており、認証に必要な範囲で
            アカウント情報（表示名、メールアドレス、プロフィール画像等）を取得します。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">2. 利用目的</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            取得した情報は、ログイン認証、ユーザーごとのプロジェクト管理機能の提供、サービス改善のために利用します。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">3. 第三者提供</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">4. 安全管理</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            個人情報への不正アクセス、漏えい、改ざん、滅失を防止するため、合理的な安全対策を講じます。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">5. 開示・訂正・削除</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            本人から個人情報の開示、訂正、削除の請求があった場合、合理的な範囲で速やかに対応します。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">6. 改定</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            本ポリシーは必要に応じて改定することがあります。重要な変更がある場合は本ページ上で通知します。
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">7. お問い合わせ</h2>
          <p className="mt-2 text-sm leading-7 text-[#536174]">
            本ポリシーに関するお問い合わせは、リポジトリ管理者までご連絡ください。
          </p>
        </section>

        <p className="mt-8 text-xs text-[#7a8598]">制定日: 2026-05-08</p>
      </div>
    </main>
  );
}
