// Community notifications in the language of the phone that gets them.
type Texts = { like: string; comment: string; follow: string; request: string; referral: string };

const TEXTS: Record<string, Texts> = {
  es: { like: 'A {name} le gustó tu publicación', comment: '{name} comentó tu publicación: {text}', follow: '{name} empezó a seguirte', request: '{name} quiere seguirte', referral: '🎉 {name} se unió con tu código: tienes 1 semana de Premium gratis.' },
  en: { like: '{name} liked your post', comment: '{name} commented on your post: {text}', follow: '{name} started following you', request: '{name} wants to follow you', referral: '🎉 {name} joined with your code: you get 1 week of Premium free.' },
  pt: { like: '{name} curtiu sua publicação', comment: '{name} comentou sua publicação: {text}', follow: '{name} começou a seguir você', request: '{name} quer seguir você', referral: '🎉 {name} entrou com seu código: você ganhou 1 semana de Premium grátis.' },
  fr: { like: '{name} a aimé votre publication', comment: '{name} a commenté votre publication : {text}', follow: '{name} a commencé à vous suivre', request: '{name} souhaite vous suivre', referral: '🎉 {name} a rejoint avec votre code : 1 semaine de Premium offerte.' },
  de: { like: '{name} gefällt dein Beitrag', comment: '{name} hat deinen Beitrag kommentiert: {text}', follow: '{name} folgt dir jetzt', request: '{name} möchte dir folgen', referral: '🎉 {name} ist mit deinem Code dabei: 1 Woche Premium gratis für dich.' },
  it: { like: 'A {name} piace il tuo post', comment: '{name} ha commentato il tuo post: {text}', follow: '{name} ha iniziato a seguirti', request: '{name} vuole seguirti', referral: '🎉 {name} si è unito con il tuo codice: hai 1 settimana di Premium gratis.' },
  nl: { like: '{name} vindt je bericht leuk', comment: '{name} reageerde op je bericht: {text}', follow: '{name} volgt je nu', request: '{name} wil je volgen', referral: '🎉 {name} deed mee met jouw code: je krijgt 1 week Premium gratis.' },
  pl: { like: '{name} polubił(a) Twój post', comment: '{name} skomentował(a) Twój post: {text}', follow: '{name} obserwuje Cię', request: '{name} chce Cię obserwować', referral: '🎉 {name} dołączył(a) z twoim kodem: masz 1 tydzień Premium za darmo.' },
  tr: { like: '{name} gönderini beğendi', comment: '{name} gönderine yorum yaptı: {text}', follow: '{name} seni takip etmeye başladı', request: '{name} seni takip etmek istiyor', referral: '🎉 {name} kodunla katıldı: 1 hafta ücretsiz Premium kazandın.' },
  ru: { like: 'Пользователю {name} понравилась ваша публикация', comment: '{name} прокомментировал(а) вашу публикацию: {text}', follow: '{name} подписался(-ась) на вас', request: '{name} хочет подписаться на вас', referral: '🎉 {name} присоединился(-ась) по вашему коду: у вас неделя Premium бесплатно.' },
  ja: { like: '{name}さんがあなたの投稿にいいねしました', comment: '{name}さんがあなたの投稿にコメントしました：{text}', follow: '{name}さんがあなたをフォローしました', request: '{name}さんがフォローをリクエストしています', referral: '🎉 {name}さんがあなたのコードで参加しました。Premiumが1週間無料になりました。' },
  ko: { like: '{name}님이 회원님의 게시물을 좋아합니다', comment: '{name}님이 회원님의 게시물에 댓글을 남겼습니다: {text}', follow: '{name}님이 회원님을 팔로우하기 시작했습니다', request: '{name}님이 팔로우를 요청했습니다', referral: '🎉 {name}님이 내 코드로 가입했어요. Premium 1주일 무료!' },
  zh: { like: '{name} 赞了你的帖子', comment: '{name} 评论了你的帖子：{text}', follow: '{name} 关注了你', request: '{name} 想关注你', referral: '🎉 {name} 使用你的邀请码加入了：你获得 1 周免费 Premium。' },
  hi: { like: '{name} को आपकी पोस्ट पसंद आई', comment: '{name} ने आपकी पोस्ट पर टिप्पणी की: {text}', follow: '{name} ने आपको फ़ॉलो करना शुरू किया', request: '{name} आपको फ़ॉलो करना चाहते हैं', referral: '🎉 {name} आपके कोड से जुड़े: आपको 1 हफ्ते का Premium मुफ़्त मिला।' },
  id: { like: '{name} menyukai postingan Anda', comment: '{name} mengomentari postingan Anda: {text}', follow: '{name} mulai mengikuti Anda', request: '{name} ingin mengikuti Anda', referral: '🎉 {name} bergabung dengan kodemu: kamu dapat 1 minggu Premium gratis.' },
};

export const communityText = (lang: string | null, kind: keyof Texts, vars: { name: string; text?: string }) =>
  (TEXTS[lang ?? ''] ?? TEXTS.es)[kind].replace('{name}', vars.name).replace('{text}', vars.text ?? '');
