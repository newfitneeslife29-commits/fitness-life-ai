// Community notifications in the language of the phone that gets them.
type Texts = { like: string; comment: string; follow: string; request: string };

const TEXTS: Record<string, Texts> = {
  es: { like: 'A {name} le gustó tu publicación', comment: '{name} comentó tu publicación: {text}', follow: '{name} empezó a seguirte', request: '{name} quiere seguirte' },
  en: { like: '{name} liked your post', comment: '{name} commented on your post: {text}', follow: '{name} started following you', request: '{name} wants to follow you' },
  pt: { like: '{name} curtiu sua publicação', comment: '{name} comentou sua publicação: {text}', follow: '{name} começou a seguir você', request: '{name} quer seguir você' },
  fr: { like: '{name} a aimé votre publication', comment: '{name} a commenté votre publication : {text}', follow: '{name} a commencé à vous suivre', request: '{name} souhaite vous suivre' },
  de: { like: '{name} gefällt dein Beitrag', comment: '{name} hat deinen Beitrag kommentiert: {text}', follow: '{name} folgt dir jetzt', request: '{name} möchte dir folgen' },
  it: { like: 'A {name} piace il tuo post', comment: '{name} ha commentato il tuo post: {text}', follow: '{name} ha iniziato a seguirti', request: '{name} vuole seguirti' },
  nl: { like: '{name} vindt je bericht leuk', comment: '{name} reageerde op je bericht: {text}', follow: '{name} volgt je nu', request: '{name} wil je volgen' },
  pl: { like: '{name} polubił(a) Twój post', comment: '{name} skomentował(a) Twój post: {text}', follow: '{name} obserwuje Cię', request: '{name} chce Cię obserwować' },
  tr: { like: '{name} gönderini beğendi', comment: '{name} gönderine yorum yaptı: {text}', follow: '{name} seni takip etmeye başladı', request: '{name} seni takip etmek istiyor' },
  ru: { like: 'Пользователю {name} понравилась ваша публикация', comment: '{name} прокомментировал(а) вашу публикацию: {text}', follow: '{name} подписался(-ась) на вас', request: '{name} хочет подписаться на вас' },
  ja: { like: '{name}さんがあなたの投稿にいいねしました', comment: '{name}さんがあなたの投稿にコメントしました：{text}', follow: '{name}さんがあなたをフォローしました', request: '{name}さんがフォローをリクエストしています' },
  ko: { like: '{name}님이 회원님의 게시물을 좋아합니다', comment: '{name}님이 회원님의 게시물에 댓글을 남겼습니다: {text}', follow: '{name}님이 회원님을 팔로우하기 시작했습니다', request: '{name}님이 팔로우를 요청했습니다' },
  zh: { like: '{name} 赞了你的帖子', comment: '{name} 评论了你的帖子：{text}', follow: '{name} 关注了你', request: '{name} 想关注你' },
  hi: { like: '{name} को आपकी पोस्ट पसंद आई', comment: '{name} ने आपकी पोस्ट पर टिप्पणी की: {text}', follow: '{name} ने आपको फ़ॉलो करना शुरू किया', request: '{name} आपको फ़ॉलो करना चाहते हैं' },
  id: { like: '{name} menyukai postingan Anda', comment: '{name} mengomentari postingan Anda: {text}', follow: '{name} mulai mengikuti Anda', request: '{name} ingin mengikuti Anda' },
};

export const communityText = (lang: string | null, kind: keyof Texts, vars: { name: string; text?: string }) =>
  (TEXTS[lang ?? ''] ?? TEXTS.es)[kind].replace('{name}', vars.name).replace('{text}', vars.text ?? '');
