// ---------------- [스피드런 풀: 히라가나 전체 (71자)] ----------------
const SPEEDRUN_HIRA = [
  // 기본 청음 (46자)
  { kana: "あ", ans: "아" }, { kana: "い", ans: "이" }, { kana: "う", ans: "우" }, { kana: "え", ans: "에" }, { kana: "お", ans: "오" },
  { kana: "か", ans: "카" }, { kana: "き", ans: "키" }, { kana: "く", ans: "쿠" }, { kana: "け", ans: "케" }, { kana: "こ", ans: "코" },
  { kana: "さ", ans: "사" }, { kana: "し", ans: "시" }, { kana: "す", ans: "스" }, { kana: "せ", ans: "세" }, { kana: "そ", ans: "소" },
  { kana: "た", ans: "타" }, { kana: "ち", ans: "치" }, { kana: "つ", ans: "츠" }, { kana: "て", ans: "테" }, { kana: "と", ans: "토" },
  { kana: "な", ans: "나" }, { kana: "に", ans: "니" }, { kana: "ぬ", ans: "누" }, { kana: "ね", ans: "네" }, { kana: "の", ans: "노" },
  { kana: "は", ans: "하" }, { kana: "ひ", ans: "히" }, { kana: "ふ", ans: "후" }, { kana: "へ", ans: "헤" }, { kana: "ほ", ans: "호" },
  { kana: "ま", ans: "마" }, { kana: "み", ans: "미" }, { kana: "む", ans: "무" }, { kana: "め", ans: "메" }, { kana: "も", ans: "모" },
  { kana: "や", ans: "야" }, { kana: "ゆ", ans: "유" }, { kana: "よ", ans: "요" },
  { kana: "ら", ans: "라" }, { kana: "り", ans: "리" }, { kana: "る", ans: "루" }, { kana: "れ", ans: "레" }, { kana: "ろ", ans: "로" },
  { kana: "わ", ans: "와" }, { kana: "を", ans: "오" }, { kana: "ん", ans: "응" },
  // 탁음 & 반탁음 (25자)
  { kana: "が", ans: "가" }, { kana: "ぎ", ans: "기" }, { kana: "ぐ", ans: "구" }, { kana: "げ", ans: "게" }, { kana: "ご", ans: "고" },
  { kana: "ざ", ans: "자" }, { kana: "じ", ans: "지" }, { kana: "ず", ans: "즈" }, { kana: "ぜ", ans: "제" }, { kana: "ぞ", ans: "조" },
  { kana: "だ", ans: "다" }, { kana: "ぢ", ans: "지" }, { kana: "づ", ans: "즈" }, { kana: "で", ans: "데" }, { kana: "도", ans: "도" },
  { kana: "ば", ans: "바" }, { kana: "び", ans: "비" }, { kana: "ぶ", ans: "부" }, { kana: "べ", ans: "베" }, { kana: "ぼ", ans: "보" },
  { kana: "ぱ", ans: "파" }, { kana: "ぴ", ans: "피" }, { kana: "ぷ", ans: "푸" }, { kana: "ぺ", ans: "페" }, { kana: "ぽ", ans: "포" }
];

// ---------------- [스피드런 풀: 가타카나 전체 (71자)] ----------------
const SPEEDRUN_KATA = [
  // 기본 청음 (46자)
  { kana: "ア", ans: "아" }, { kana: "イ", ans: "이" }, { kana: "ウ", ans: "우" }, { kana: "エ", ans: "에" }, { kana: "オ", ans: "오" },
  { kana: "カ", ans: "카" }, { kana: "キ", ans: "키" }, { kana: "ク", ans: "쿠" }, { kana: "ケ", ans: "케" }, { kana: "コ", ans: "코" },
  { kana: "サ", ans: "사" }, { kana: "シ", ans: "시" }, { kana: "ス", ans: "스" }, { kana: "セ", ans: "세" }, { kana: "ソ", ans: "소" },
  { kana: "タ", ans: "타" }, { kana: "チ", ans: "치" }, { kana: "ツ", ans: "츠" }, { kana: "テ", ans: "테" }, { kana: "ト", ans: "토" },
  { kana: "ナ", ans: "나" }, { kana: "ニ", ans: "니" }, { kana: "ヌ", ans: "누" }, { kana: "ネ", ans: "네" }, { kana: "ノ", ans: "노" },
  { kana: "ハ", ans: "하" }, { kana: "ヒ", ans: "히" }, { kana: "フ", ans: "후" }, { kana: "ヘ", ans: "헤" }, { kana: "ホ", ans: "호" },
  { kana: "マ", ans: "마" }, { kana: "ミ", ans: "미" }, { kana: "ム", ans: "무" }, { kana: "メ", ans: "메" }, { kana: "モ", ans: "모" },
  { kana: "ヤ", ans: "야" }, { kana: "ユ", ans: "유" }, { kana: "ヨ", ans: "요" },
  { kana: "ラ", ans: "라" }, { kana: "リ", ans: "리" }, { kana: "ル", ans: "루" }, { kana: "레", ans: "레" }, { kana: "ロ", ans: "로" },
  { kana: "ワ", ans: "와" }, { kana: "ヲ", ans: "오" }, { kana: "ン", ans: "응" },
  // 탁음 & 반탁음 (25자)
  { kana: "ガ", ans: "가" }, { kana: "ギ", ans: "기" }, { kana: "グ", ans: "구" }, { kana: "ゲ", ans: "게" }, { kana: "ゴ", ans: "고" },
  { kana: "ザ", ans: "자" }, { kana: "ジ", ans: "지" }, { kana: "ズ", ans: "즈" }, { kana: "ゼ", ans: "제" }, { kana: "ゾ", ans: "조" },
  { kana: "ダ", ans: "다" }, { kana: "ヂ", ans: "지" }, { kana: "ヅ", ans: "즈" }, { kana: "デ", ans: "데" }, { kana: "ド", ans: "도" },
  { kana: "バ", ans: "바" }, { kana: "ビ", ans: "비" }, { kana: "ブ", ans: "부" }, { kana: "ベ", ans: "베" }, { kana: "ボ", ans: "보" },
  { kana: "パ", ans: "파" }, { kana: "ピ", ans: "피" }, { kana: "プ", ans: "푸" }, { kana: "ペ", ans: "페" }, { kana: "ポ", ans: "포" }
];
