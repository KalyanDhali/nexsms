import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const CONTENT = {
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last updated: August 2026',
      sections: [
        ['1. Acceptance of Terms', 'By creating an account or using NexSMS ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.'],
        ['2. The Service', 'NexSMS provides cloud phone numbers, SMS sending, receiving, scheduling, bulk messaging and related tools. We may add, change or remove features at any time with reasonable notice.'],
        ['3. Accounts', 'You must provide accurate information when registering. You are responsible for safeguarding your credentials and for all activity under your account. Notify us immediately of any unauthorized use.'],
        ['4. Acceptable Use', 'You agree not to use the Service to send spam, phishing, fraud, harassment, unlawful content, or messages to recipients who have not consented. We reserve the right to suspend accounts that violate this policy.'],
        ['5. Compliance', 'You are responsible for complying with all applicable laws, including SMS marketing regulations, consent requirements and data protection rules in every jurisdiction where you send messages.'],
        ['6. Fees and Billing', 'Usage is billed according to your selected plan or prepaid balance. Prices may change with notice. Failed messages and operator fees may still incur charges. Unused prepaid credit is non-refundable except as set out in the Refund Policy.'],
        ['7. Number Rental', 'Numbers may be revoked if unused, in violation of these terms, or if required by regulators. You have no property right in any phone number.'],
        ['8. Intellectual Property', 'The Service, its design, software and branding remain the property of NexSMS. You may not copy, resell or reverse engineer any part of the Service.'],
        ['9. Limitation of Liability', 'The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, NexSMS is not liable for indirect, incidental or consequential damages, or for failed message delivery caused by carriers or third parties.'],
        ['10. Termination', 'Either party may terminate this agreement. We may suspend or close your account for breach of these terms, security concerns, or at our discretion with notice where possible.'],
        ['11. Changes', 'We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance.'],
        ['12. Contact', 'Questions about these Terms can be sent to support@nexsms.app.'],
      ],
    },
    zh: {
      title: '服务条款',
      updated: '最后更新：2026年8月',
      sections: [
        ['1. 条款接受', '注册账户或使用 NexSMS（"本服务"）即表示您同意本服务条款。如不同意，请勿使用本服务。'],
        ['2. 服务内容', 'NexSMS 提供云号码、短信发送与接收、定时发送、批量群发及相关工具。我们可能在合理通知后随时增加、修改或移除功能。'],
        ['3. 账户', '注册时须提供真实信息。您有责任保管登录凭据，并对账户下的所有活动负责。如发现未经授权的使用，请立即通知我们。'],
        ['4. 可接受使用', '您不得使用本服务发送垃圾短信、钓鱼、欺诈、骚扰、违法内容，或向未同意接收的收件人发送消息。我们保留暂停违规账户的权利。'],
        ['5. 合规要求', '您有责任遵守所有适用法律，包括您发送消息所在地区的短信营销法规、同意要求与数据保护规定。'],
        ['6. 费用与计费', '按所选套餐或预存余额计费。价格可能变更并会提前通知。失败消息与运营商费用仍可能产生费用。未使用的预存余额除退款政策规定外不予退还。'],
        ['7. 号码租赁', '若号码长期未使用、违反本条款或监管机构要求，号码可能被收回。您对任何电话号码不享有所有权。'],
        ['8. 知识产权', '本服务、设计、软件与品牌归 NexSMS 所有。您不得复制、转售或反向工程本服务的任何部分。'],
        ['9. 责任限制', '本服务按"现状"提供，不作任何保证。在法律允许的最大范围内，NexSMS 对间接、附带或后果性损害，或因运营商或第三方导致的投递失败不承担责任。'],
        ['10. 终止', '任一方均可终止本协议。对于违反条款、安全问题等情况，我们可能暂停或关闭您的账户，并在可行时提前通知。'],
        ['11. 条款变更', '我们可能不时更新本条款。变更后继续使用本服务即表示接受。'],
        ['12. 联系我们', '有关条款的问题请发送至 support@nexsms.app。'],
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: August 2026',
      sections: [
        ['1. Overview', 'This Privacy Policy explains how NexSMS collects, uses and protects your personal data when you use our Service.'],
        ['2. Data We Collect', 'We collect account information (name, email, phone number), billing details, messages you send and receive, and technical data such as IP address and device information.'],
        ['3. How We Use Data', 'We use your data to provide the Service, process billing, prevent fraud and abuse, comply with legal obligations, and improve our products. We never sell your personal data.'],
        ['4. Message Content', 'Message content is processed to deliver your SMS through our carrier partners. We retain message logs as required for billing, troubleshooting and legal compliance.'],
        ['5. Cookies and Tracking', 'We use essential cookies for authentication and security. Analytics are used in aggregate form. You may disable cookies in your browser, which may affect some functionality.'],
        ['6. Sharing', 'We share data only with service providers who help us operate (SMS carriers, payment processors, hosting), under contractual obligations of confidentiality and security.'],
        ['7. Data Security', 'We apply industry-standard safeguards including encryption in transit and at rest, access controls and monitoring to protect your data.'],
        ['8. Your Rights', 'Depending on your jurisdiction, you may have the right to access, correct, export or delete your personal data. Contact support@nexsms.app to exercise these rights.'],
        ['9. Retention', 'We retain personal data only as long as necessary for the purposes described, or as required by law.'],
        ['10. Children', 'The Service is not directed at children under the age of 16, and we do not knowingly collect their data.'],
        ['11. Changes', 'We may update this policy from time to time and will post the revised version here.'],
        ['12. Contact', 'For privacy questions, contact support@nexsms.app.'],
      ],
    },
    zh: {
      title: '隐私政策',
      updated: '最后更新：2026年8月',
      sections: [
        ['1. 概述', '本隐私政策说明 NexSMS 在您使用本服务时如何收集、使用和保护您的个人数据。'],
        ['2. 我们收集的数据', '我们收集账户信息（姓名、邮箱、电话号码）、账单信息、您发送和接收的短信，以及 IP 地址和设备信息等技术数据。'],
        ['3. 数据用途', '我们使用您的数据来提供服务、处理计费、防止欺诈与滥用、履行法律义务以及改进产品。我们绝不会出售您的个人数据。'],
        ['4. 短信内容', '短信内容将用于通过运营商合作伙伴完成投递。为满足计费、故障排查和合规要求，我们会保留消息日志。'],
        ['5. Cookie 与追踪', '我们使用必要的 Cookie 进行身份验证与安全。分析数据以聚合形式使用。您可以在浏览器中禁用 Cookie，这可能影响部分功能。'],
        ['6. 数据共享', '我们仅与帮助运营的服务提供商（短信运营商、支付处理商、托管方）共享数据，并要求其承担保密与安全义务。'],
        ['7. 数据安全', '我们采用行业标准的安全措施，包括传输与存储加密、访问控制与监控，以保护您的数据。'],
        ['8. 您的权利', '根据您所在地区的法律，您可能有权访问、更正、导出或删除您的个人数据。请联系 support@nexsms.app 行使这些权利。'],
        ['9. 数据保留', '我们仅在实现上述目的所需或法律要求的期限内保留个人数据。'],
        ['10. 儿童', '本服务不面向 16 岁以下儿童，我们也不会故意收集其数据。'],
        ['11. 政策变更', '我们可能不时更新本政策，并在本页面发布修订版。'],
        ['12. 联系我们', '如有隐私问题，请联系 support@nexsms.app。'],
      ],
    },
  },
  refund: {
    en: {
      title: 'Refund Policy',
      updated: 'Last updated: August 2026',
      sections: [
        ['1. Overview', 'This Refund Policy explains when prepaid credit and payments can be refunded.'],
        ['2. Prepaid Credit', 'Prepaid credit purchased is added to your balance and used for per-message charges. Unused prepaid credit is refundable only in the cases described below.'],
        ['3. Unused Balance (First Purchase)', 'If you have not sent any messages and request a refund within 7 days of your first credit purchase, we will refund the full unused balance to the original payment method.'],
        ['4. Service Failure', 'If the Service is unavailable for a continuous period that materially prevents usage (subject to provider outages), we may issue credit or a pro-rated refund at our discretion.'],
        ['5. Carrier Fees', 'Charges for messages that were sent successfully are non-refundable, including messages that carriers ultimately failed to deliver.'],
        ['6. Subscription Plans', 'Monthly subscription fees are non-refundable except within the 7-day first-purchase window described above. You may cancel renewal at any time before the next billing cycle.'],
        ['7. Fraud and Abuse', 'No refunds are issued for accounts suspended for violation of our Terms of Service or detected fraud.'],
        ['8. How to Request', 'Submit a request to support@nexsms.app with your account email, purchase details and the amount you wish to refund. We aim to respond within 5 business days.'],
        ['9. Processing Time', 'Approved refunds are processed to the original payment method within 5–10 business days, depending on your payment provider.'],
        ['10. Contact', 'Questions about this policy can be sent to support@nexsms.app.'],
      ],
    },
    zh: {
      title: '退款政策',
      updated: '最后更新：2026年8月',
      sections: [
        ['1. 概述', '本退款政策说明预存余额与款项在何种情况下可以退款。'],
        ['2. 预存余额', '购买的预存余额将计入您的账户，用于按条计费。未使用的预存余额仅在下列情况下可退款。'],
        ['3. 未使用余额（首次购买）', '如果您尚未发送任何消息，并在首次充值后 7 天内申请退款，我们将按原支付方式退还全部未使用余额。'],
        ['4. 服务故障', '如果服务因持续故障而严重影响使用（运营商中断除外），我们可酌情发放补偿额度或按比例退款。'],
        ['5. 运营商费用', '已成功发送的消息费用不可退还，包括运营商最终未能投递的消息。'],
        ['6. 订阅套餐', '月度订阅费除上述 7 天首次购买窗口外不予退还。您可在下一个计费周期前随时取消续订。'],
        ['7. 欺诈与滥用', '因违反服务条款或检测到欺诈而被封禁的账户不予退款。'],
        ['8. 如何申请', '请向 support@nexsms.app 提交申请，并附上账户邮箱、购买详情及希望退款的金额。我们将在 5 个工作日内回复。'],
        ['9. 处理时间', '获批的退款将在 5–10 个工作日内按原支付方式退回，具体取决于您的支付提供商。'],
        ['10. 联系我们', '如有关于本政策的问题，请发送至 support@nexsms.app。'],
      ],
    },
  },
};

function LegalNav() {
  const { theme } = useTheme();
  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">N</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{theme.siteName}</span>
        </Link>
        <Link to="/" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          ← Home
        </Link>
      </div>
    </nav>
  );
}

function LegalFooter({ links }) {
  const { theme } = useTheme();
  return (
    <footer className="bg-slate-950 py-10 mt-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-slate-400 hover:text-white transition">{l.label}</Link>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-600">© 2026 {theme.siteName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function LegalPage({ type }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const content = CONTENT[type] || CONTENT.terms;
  const data = isZh ? content.zh : content.en;

  const links = [
    { to: '/terms', label: isZh ? '服务条款' : 'Terms of Service' },
    { to: '/privacy', label: isZh ? '隐私政策' : 'Privacy Policy' },
    { to: '/refund', label: isZh ? '退款政策' : 'Refund Policy' },
    { to: '/#faq', label: isZh ? '常见问题' : 'FAQ' },
  ];

  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <LegalNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">{data.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data.updated}</p>
        <div className="mt-8 space-y-8">
          {data.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{h}</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <LegalFooter links={links} />
    </div>
  );
}
