import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { AutoTrader } from "./trader";
import { UpbitClient } from "./upbit-client";
import type { TradeConfig, TradingViewSignal } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// 자동매매 인스턴스
let autoTrader: AutoTrader | null = null;

// Initialize GoogleGenAI SDK
const apiKeyEnv = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : undefined;

const ai = new GoogleGenAI({
  apiKey: apiKeyEnv,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// 503 등 일시적인 API 장애 시 사용할 정적 말씀 데이터
function getFallbackBibleData(worry: string, version: "개역개정" | "새번역" = "개역개정") {
  const text = worry.toLowerCase();
  
  let category: "fear" | "lonely" | "exhausted" | "sad" | "anger" | "comparison" | "relationship" | "worry" | "future" | "finance" | "spiritual" = "worry";
  
  if (text.includes("불안") || text.includes("두려") || text.includes("무섭") || text.includes("공포")) {
    category = "fear";
  } else if (text.includes("외롭") || text.includes("혼자") || text.includes("쓸쓸") || text.includes("소외")) {
    category = "lonely";
  } else if (text.includes("지치") || text.includes("피곤") || text.includes("번아웃") || text.includes("포기") || text.includes("낙심") || text.includes("힘들") || text.includes("힘드") || text.includes("무기력")) {
    category = "exhausted";
  } else if (text.includes("슬프") || text.includes("눈물") || text.includes("우울") || text.includes("상실") || text.includes("아프") || text.includes("애통")) {
    category = "sad";
  } else if (text.includes("화") || text.includes("분노") || text.includes("억울") || text.includes("짜증") || text.includes("미워") || text.includes("홧병")) {
    category = "anger";
  } else if (text.includes("비교") || text.includes("열등") || text.includes("질투") || text.includes("sns") || text.includes("인스타") || text.includes("박탈")) {
    category = "comparison";
  } else if (text.includes("진로") || text.includes("미래") || text.includes("비전") || text.includes("방황") || text.includes("목표") || text.includes("계획")) {
    category = "future";
  } else if (text.includes("돈") || text.includes("재정") || text.includes("물질") || text.includes("가난") || text.includes("부채") || text.includes("빚") || text.includes("금전")) {
    category = "finance";
  } else if (text.includes("죄책") || text.includes("영적") || text.includes("침체") || text.includes("의심") || text.includes("낙심") || text.includes("정죄")) {
    category = "spiritual";
  } else if (text.includes("관계") || text.includes("상처") || text.includes("다툼") || text.includes("갈등") || text.includes("배신") || text.includes("싸움")) {
    category = "relationship";
  }
  
  const dataset = {
    fear: {
      citation: "신명기 31장 8절",
      quote: version === "새번역" 
        ? "주님께서 직접 너보다 앞서 가시며, 너와 함께 계시고, 너를 떠나지도 않으시고 버리지도 않으실 것이니, 두려워하지도 말고 낙심하지도 말아라."
        : "여호와 그가 네 앞에서 가시며 너와 함께 하사 너를 떠나지 아니하시며 버리지 아니하시리니 너는 두려워하지 말라 놀라지 말라",
      meaning: "하나님께서 내 삶의 길에 앞서 서 계시며, 결코 나를 방치하지 않으신다는 평안의 약속입니다.",
      application: "눈앞의 파도에 집중하기보다, 이미 그 파도를 딛고 앞서 가 계시는 주님의 발걸음을 바라보는 시간을 가져보세요."
    },
    lonely: {
      citation: "시편 139장 9~10절",
      quote: version === "새번역" 
        ? "내가 새벽 날개를 타고 날아가서 바다 끝 가장 먼 곳에 자리를 잡더라도, 거기에서도 주님의 손이 나를 인도해 주시고, 주님의 오른손이 나를 꼭 붙들어 주십니다."
        : "내가 새벽 날개를 치며 바다 끝에 가서 거주할지라도 거기서도 주의 손이 나를 인도하시며 주의 오른손이 나를 붙드시리이다",
      meaning: "세상의 그 어떤 구석진 방, 가장 먼 바다 끝에 혼자 있는 것 같은 순간에도 주님의 눈길은 나를 꼭 쥐고 계십니다.",
      application: "철저히 홀로 버려진 것 같은 무거운 고립감을 내려놓고, 보이지 않는 곳에서 나를 붙들고 계시는 주님의 온기를 기억해 보세요."
    },
    exhausted: {
      citation: "갈라디아서 6장 9절",
      quote: version === "새번역" 
        ? "선한 일을 하다가, 낙심하지 맙시다. 포기하지 않고 꾸준히 하면, 때가 이를 때에 거두게 됩니다."
        : "우리가 선을 행하되 낙심하지 말지니 포기하지 아니하면 때가 이르매 거두리라",
      meaning: "우리의 수고와 눈물이 결코 헛되지 않으며, 하나님의 완벽한 타이밍에 소중한 열매로 거두어질 것이라는 소망의 음성입니다.",
      application: "오늘 하루는 더 열심히 달리려는 다그침을 잠시 멈추고, '여기까지 잘 왔다'고 토닥여 주시는 주님의 품에서 쉬어 가보세요."
    },
    sad: {
      citation: "시편 34장 18절",
      quote: version === "새번역" 
        ? "주님은 마음 상한 사람에게 가까이 계시고, 낙심한 사람을 구원해 주신다."
        : "여호와는 마음이 상한 자를 가까이 하시고 충심으로 통회하는 자를 구원하시는도다",
      meaning: "주님은 우리의 가슴 아픈 울음소리를 귀찮아하지 않으시고, 가장 가까이 찾아와 함께 아파해 주시는 다정한 하나님이십니다.",
      application: "슬픔을 애써 숨기거나 강한 척 포장하지 마세요. 그저 상한 마음 그대로를 안고 주님 앞에 나아가 눈물 흘려도 괜찮습니다."
    },
    anger: {
      citation: "시편 37장 7~8절",
      quote: version === "새번역" 
        ? "잠잠히 주님을 바라보며, 주님께서 구원해 주실 때까지 참고 기다려라. 하는 일마다 잘된다고 하는 자들과 악한 계획을 세워 실행하는 자들 때문에 조급해하지 말아라. 노여움을 거두고, 격분을 가라앉혀라."
        : "여호와 앞에 잠잠하고 참고 기다리라 자기 길이 형통하며 악한 꾀를 이루는 자 때문에 불평하지 말지어다 분을 그치고 노를 버리라",
      meaning: "마음을 찌르는 억울함과 분노 앞에서 내 힘으로 복수하려 애쓰지 말고, 내 삶의 정의로운 재판관이신 주님께 모든 것을 맡기는 지혜입니다.",
      application: "당신의 마음을 태우는 분노의 상대를 주님의 손에 완전히 이양하고, 내 마음의 평안과 고요를 최우선으로 지켜내 보시기 바랍니다."
    },
    comparison: {
      citation: "시편 139장 13~14절",
      quote: version === "새번역" 
        ? "주께서 내 장기를 창조하시고, 내 어머니의 모태에서 나를 짜 맞추셨습니다. 내가 이렇게 빚어진 것이 오묘하고 주님이 하신 일이 놀라워, 이 모든 일로 내가 주님께 감사를 드립니다."
        : "주께서 내 내장을 지으시며 나의 모태에서 나를 만드셨나이다 내가 주께 감사하옴은 나를 지으심이 신묘막측하심이라 주께서 하시는 일이 기이함을 내 영혼이 잘 아나이다",
      meaning: "우리는 타인과의 비교를 위해 태어난 모조품이 아닌, 주님께서 직접 장인정신으로 빚으신 우주에 단 하나뿐인 특별하고 놀라운 걸작품입니다.",
      application: "타인의 빛나는 일상과 나의 초라해 보이는 골방을 비교하는 악순환을 끊고, 내 존재 자체를 극찬하시는 주님의 창조를 신뢰하세요."
    },
    relationship: {
      citation: "골로새서 3장 12~13절",
      quote: version === "새번역" 
        ? "여러분은 하나님의 택하심을 입은 거룩하고 사랑받는 사람답게, 동정심과 친절함과 겸손함과 온유함과 오래 참음을 옷 입듯이 입으십시오. 누가 누구에게 불평할 일이 있더라도, 서로 용납하여 주고, 서로 용서해 주십시오."
        : "너희는 하나님이 택하사 거룩하고 사랑 받는 자처럼 긍휼과 자비와 겸손과 온유와 오래 참음을 옷 입고 누가 누구에게 불만이 있거든 서로 용납하여 피차 용서하되",
      meaning: "사람에게 받은 깊은 상처와 갈등의 고리를 푸는 열쇠는, 먼저 나를 한없는 용서와 사랑으로 대하신 주님의 마음에 온전히 머무는 것입니다.",
      application: "상대방에 대한 미움이 턱밑까지 차오를 때, 주께서 나를 있는 그대로 수용하셨던 것처럼 상처 입은 내 마음부터 주님의 용서로 부드럽게 감싸보세요."
    },
    worry: {
      citation: "마태복음 6장 34절",
      quote: version === "새번역" 
        ? "그러므로 내일 일을 걱정하지 말아라. 내일 걱정은 내일이 맡아서 할 것이다. 한 날의 괴로움은 그 날로 충분하다."
        : "그러므로 내일 일을 위하여 염려하지 말라 내일 일은 내일이 염려할 것이요 한 날의 괴로움은 그 날로 족하니라",
      meaning: "아직 오지 않은 내일의 무게까지 미리 가불하여 오늘을 무너뜨리지 말고, 오늘 하루에 예비된 주님의 은혜에만 머물라는 다정한 위로입니다.",
      application: "발생하지 않은 미래의 시나리오를 머릿속으로 그리며 걱정하는 손을 놓고, 지금 이 순간 숨을 쉬며 함께하시는 주님의 평강을 누리세요."
    },
    future: {
      citation: "예레미야 29장 11절",
      quote: version === "새번역" 
        ? "너희를 두고 계획하고 있는 일들은 내가 잘 알고 있다. 그것은 평화의 계획이지, 재앙의 계획이 아니다. 너희에게 미래와 희망을 주려는 것이다. 나 주의 말이다."
        : "여호와의 말씀이니라 너희를 향한 나의 생각을 내가 아나니 평안이요 재앙이 아니니라 너희에게 미래와 희망을 주는 것이니라",
      meaning: "우리 삶의 미래가 비록 불확실하고 불안할지라도, 하나님의 계획 속에는 우리를 향한 평화와 희망이 가득 담겨 있습니다.",
      application: "나의 한계를 넘어서는 앞날의 걱정을 주님께 내려놓고, 오늘을 향한 주의 신실한 인도하심을 믿고 나아가 보세요."
    },
    finance: {
      citation: "빌립보서 4장 19절",
      quote: version === "새번역" 
        ? "나의 하나님께서 자기의 풍성하심을 따라, 그리스도 예수 안에서 영광으로 여러분에게 필요한 모든 것을 채워 주실 것입니다."
        : "나의 하나님이 그리스도 예수 안에서 영광 가운데 그 풍성한 대로 너희 모든 쓸 것을 채우시리라",
      meaning: "하나님께서는 우리의 영육 간의 실질적인 필요를 알고 계시며, 주님의 풍성함을 따라 반드시 채워주시는 분입니다.",
      application: "통장의 잔고나 눈앞의 물질적 결핍보다, 우리의 필요를 가장 완벽한 타이밍에 채우시는 하늘 아버지를 신뢰해 보세요."
    },
    spiritual: {
      citation: "로마서 8장 1~2절",
      quote: version === "새번역" 
        ? "그러므로 이제 그리스도 예수 안에 있는 사람들은 정죄를 받지 않습니다. 그것은, 그리스도 예수 안에서 생명을 주시는 성령의 법이 여러분을 죄와 사망의 법에서 해방하여 주었기 때문입니다."
        : "그러므로 이제 그리스도 예수 안에 있는 자에게는 결코 정죄함이 없나니 이는 그리스도 예수 안에 있는 생명의 성령의 법이 죄와 사망의 법에서 너를 해방하였음이라",
      meaning: "어떤 영적인 메마름이나 무거운 죄책감 속에서도, 그리스도 예수 안에 거한다면 우리는 이미 용서받았고 온전히 해방되었습니다.",
      application: "나를 판단하고 무겁게 억누르는 부정적인 목소리를 끄고, 십자가를 통해 나에게 선물로 주어진 완전한 자유를 조용히 누려보세요."
    }
  };

  const selected = dataset[category];
  
  return {
    worryAnalysis: `일시적인 시스템 지연으로 인해, 지금 마음을 지켜줄 소중한 성경 말씀을 직접 전해드립니다.`,
    recommendations: [{
      source: "성경 말씀",
      citation: selected.citation,
      quote: selected.quote,
      meaning: selected.meaning,
      application: selected.application
    }],
    comfortingMessage: `주님의 은혜와 평강이 삶의 매 순간 함께하시기를 소망합니다. 염려를 내려놓고 오늘 이 약속의 말씀으로 마음의 안식을 누리시기 바랍니다.`,
    recommendedActions: [
      "성경 말씀을 마음속으로 세 번 조용히 읊조리기",
      "복잡한 생각을 멈추고 하나님의 잠잠한 사랑에 집중하기"
    ]
  };
}

// 503 등 일시적인 API 장애 시 사용할 성경 대화 Fallback 응답
function getFallbackChatResponse(message: string, turn: number = 1, version: "개역개정" | "새번역" = "개역개정") {
  const fallbackData = getFallbackBibleData(message, version);
  const rec = fallbackData.recommendations[0];
  
  if (turn === 1) {
    return `<p>마음의 어려움을 돕기 위해 예비된 하나님의 약속의 말씀입니다.</p>
<div class="verse-card">
  <p class="verse-text">"${rec.quote}"</p>
  <p class="verse-ref">${rec.citation}</p>
</div>
<p><strong>말씀 묵상:</strong> ${rec.meaning}</p>
<p><strong>실천하기:</strong> ${rec.application} 혹시 더 깊이 나누고 싶은 고민이 있으신가요?</p>`;
  } else if (turn === 2) {
    const secondQuote = version === "새번역"
      ? "주님은 나의 목자시니, 내게 부족함이 없다."
      : "여호와는 나의 목자시니 내게 부족함이 없으리로다";
    return `<p>지치고 외로운 마음을 위로하는 또 하나의 약속을 전합니다.</p>
<div class="verse-card">
  <p class="verse-text">"${secondQuote}"</p>
  <p class="verse-ref">시편 23장 1절</p>
</div>
<p><strong>말씀 묵상:</strong> 주님이 선한 목자가 되셔서 보이지 않는 삶의 골짜기에서도 우리를 푸른 초장으로 인도하신다는 뜻입니다.</p>
<p>이 구절을 천천히 되새기며 마음에 평안을 채워보시기 바랍니다.</p>`;
  } else if (turn === 3) {
    const thirdQuote = version === "새번역"
      ? "너의 갈 길을 주님께 맡기고, 주님만 의지하여라. 주님께서 다 해결해 주실 것이다."
      : "네 길을 여호와께 맡기라 그를 의지하면 그가 이루시고";
    return `<p>성경이 약속하는 흔들리지 않는 평온과 온전한 신뢰를 마음에 품으시길 바랍니다.</p>
<div class="verse-card">
  <p class="verse-text">"${thirdQuote}"</p>
  <p class="verse-ref">시편 37장 5절</p>
</div>
<p><strong>말씀 묵상:</strong> 나의 모든 염려와 길을 주님께 온전히 맡길 때, 주께서 가장 선한 길로 인도하시고 이루어 주십니다.</p>
<p>오늘 하루 이 말씀에 기대어 마음에 참된 안식을 누리시기를 소망합니다.</p>`;
  } else {
    return `<p>성경의 약속과 말씀이 삶의 평온한 보호막이 되어 주기를 신뢰합니다.</p>
<p>언제나 이 말씀 보따리를 다시 열어 마음에 참된 위안을 채워보시기 바랍니다. 평온한 하루가 되기를 소망합니다. 🙏</p>`;
  }
}

// API Endpoints
app.post("/api/recommend", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey || apiKey === "YOUR_API_KEY") {
      return res.status(401).json({ 
        error: "GEMINI_API_KEY가 올바르게 설정되지 않았습니다. Google AI Studio 화면 우측 상단의 'Settings' -> 'Environment Variables' 메뉴에서 GEMINI_API_KEY에 유효한 API 키를 등록했는지 확인해 주세요." 
      });
    }

    const { worry, sourcePreference, tone } = req.body;

    if (!worry || typeof worry !== 'string' || worry.trim().length === 0) {
      return res.status(400).json({ error: "고민 내용을 입력해주세요." });
    }

    const sourceText = "성경 말씀";

    const toneText = tone === "wise" 
      ? "이성적이고 차분한 지혜의 어조" 
      : tone === "strong" 
        ? "힘을 불어넣고 용기를 주는 격려의 어조" 
        : "따뜻하고 깊이 공감하는 다정한 어조";

    const prompt = `사용자의 고민에 맞는 최적의 위로와 가르침을 주는 성경 말씀(Bible scriptures)을 선택하여 추천해 주세요.

[사용자의 고민]
"${worry}"

[요청 사항]
1. 선호하는 말씀 출처: ${sourceText} (성경 말씀)
2. 답변의 어조/분위기: ${toneText}

사용자의 고민을 깊이 경청하고, 그 고민의 본질을 관통하는 은혜로운 성경 말씀(성경 구절)을 1개에서 3개 선택해 주세요.
추천하는 말씀은 실제로 존재하는 성경 구절이어야 하며, 사용자에게 영적인 평안과 위로, 삶의 통찰을 줄 수 있어야 합니다.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `당신은 마음의 고통과 불안을 겪고 있는 이들에게 오직 은혜로운 성경 말씀(Bible Scriptures)만을 사용하여 따뜻한 위로와 신앙적 격려, 하늘의 평안을 전해주는 말씀 위로 서비스 '바이블 터치'입니다.
다음 지침에 따라 응답하세요:
- 사용자의 마음을 판단하지 말고, 성경 말씀의 지혜로 깊이 공감하고 위로하세요.
- 오직 실제로 존재하는 성경 구절(성경 말씀)만 추천 구절로 제시하세요. (불경, 일반 철학, 에세이 등 성경이 아닌 어록은 절대 추천하지 마십시오.)
- 추천하는 말씀은 정확한 출처(예: '시편 23편 1절', '마태복음 11장 28절' 등)를 구체적으로 밝히세요.
- 추천하는 구절은 한국어(개역개정 또는 쉬운성경 등)로 가장 보편적이고 은혜로운 표현을 사용하세요.
- 각 성경 말씀마다 말씀에 담긴 신앙적 의미(meaning)와, 사용자의 고민 상황에 어떻게 대입하여 위로를 얻거나 실천해 볼 수 있는지 맞춤 조언(application)을 정성스럽게 작성해 주세요.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            worryAnalysis: {
              type: Type.STRING,
              description: "사용자의 감정 상태와 고민의 본질을 짚어내고 성경 말씀으로 공감해주는 1~2문장의 분석 및 공감 글."
            },
            recommendations: {
              type: Type.ARRAY,
              description: "고민 해결에 도움이 되는 추천 성경 말씀 목록 (1개 ~ 3개)",
              items: {
                type: Type.OBJECT,
                properties: {
                  source: {
                    type: Type.STRING,
                    description: "말씀의 분류 (항상 '성경 말씀'이어야 함)"
                  },
                  citation: {
                    type: Type.STRING,
                    description: "정확한 성경 장절 출처 정보 (예: '빌립보서 4장 6~7절', '시편 23편 1절')"
                  },
                  quote: {
                    type: Type.STRING,
                    description: "추천하는 성경 말씀의 실제 구절 전체."
                  },
                  meaning: {
                    type: Type.STRING,
                    description: "이 성경 구절이 품고 있는 하나님의 사랑과 본래의 은혜로운 의미를 쉽게 설명한 글."
                  },
                  application: {
                    type: Type.STRING,
                    description: "사용자의 현재 고민에 이 성경 말씀을 어떻게 대입하여 기도로 이겨내거나 위로를 얻을 수 있는지 맞춤 조언."
                  }
                },
                required: ["source", "citation", "quote", "meaning", "application"]
              }
            },
            comfortingMessage: {
              type: Type.STRING,
              description: "선택한 어조(따뜻한 공감 / 지혜로운 성찰 / 힘찬 격려)에 맞춰 작성된 정성 어린 마지막 위로의 편지 (3~4문장)."
            },
            recommendedActions: {
              type: Type.ARRAY,
              description: "지금 당장 마음을 가라앉히거나 은혜 안에서 실천해볼 수 있는 아주 가볍고 구체적인 묵상/기도 행동 1~2가지.",
              items: {
                type: Type.STRING
              }
            }
          },
          required: ["worryAnalysis", "recommendations", "comfortingMessage", "recommendedActions"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini 응답이 비어 있습니다.");
    }

    const data = JSON.parse(text.trim());
    res.json(data);
  } catch (error: any) {
    console.error("API error in /api/recommend:", error);
    
    const errorStr = String(error?.message || error || "");
    if (errorStr.includes("API key not valid") || errorStr.includes("API_KEY_INVALID") || errorStr.includes("key not valid")) {
      return res.status(401).json({
        error: "입력된 Gemini API 키가 올바르지 않거나 유효하지 않습니다. Google AI Studio 화면 우측 상단의 'Settings' -> 'Environment Variables' 메뉴에서 유효한 'GEMINI_API_KEY'를 등록하셨는지 다시 한번 확인해 주세요."
      });
    }

    // 503 UNAVAILABLE 이나 기타 모델 오버로드, 혹은 모든 API 호출 실패 시
    // 서비스의 영속성을 위해 미리 마련해둔 가장 적절한 성경 말씀 데이터를 반환합니다.
    console.log("Gemini API 장애 또는 503 오류 감지: Fallback 성경 말씀 데이터셋을 반환합니다.");
    const fallbackData = getFallbackBibleData(req.body.worry || "", "개역개정");
    return res.json(fallbackData);
  }
});

// 디버깅: Upbit API 테스트
app.post("/api/trading/test", async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "API Key와 Secret이 필요합니다." });
    }

    console.log("\n=== Upbit API 테스트 시작 ===");
    console.log("API Key:", apiKey.substring(0, 10) + "***");
    console.log("API Secret:", apiSecret.substring(0, 10) + "***");

    const testClient = new UpbitClient({ apiKey, apiSecret });

    try {
      const accounts = await testClient.getAccounts();
      console.log("✅ 성공! 계좌 수:", accounts.length);
      console.log("계좌 정보:", JSON.stringify(accounts, null, 2));
      res.json({ success: true, accounts });
    } catch (error: any) {
      console.error("❌ 실패");
      console.error("오류 메시지:", error.message);
      console.error("전체 오류:", error);
      res.status(400).json({ error: error.message });
    }
  } catch (error: any) {
    console.error("테스트 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 거래 설정 초기화
app.post("/api/trading/init", async (req, res) => {
  try {
    const { apiKey, apiSecret, coins, positionSizePercent, stopLossPercent, takeProfitPercent, maxDailyLoss } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "API Key와 Secret이 필요합니다." });
    }

    // Upbit API 연결 테스트
    console.log("Upbit API 테스트 중...");
    console.log("API Key (처음 10자):", apiKey?.substring(0, 10) + "***");
    const testClient = new UpbitClient({ apiKey, apiSecret });

    try {
      // 계좌 정보 조회로 API 유효성 테스트
      console.log("계좌 정보 조회 시도...");
      const accounts = await testClient.getAccounts();
      console.log("✅ Upbit API 연결 성공. 계좌 수:", accounts.length);
    } catch (apiError: any) {
      console.error("❌ Upbit API 연결 실패:");
      console.error("   오류:", apiError?.message);
      console.error("   상세:", apiError);
      const errorMsg = String(apiError?.message || apiError || "");

      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("invalid")) {
        return res.status(401).json({
          error: "Upbit API 키가 유효하지 않습니다. API 키와 Secret을 다시 확인해주세요."
        });
      } else if (errorMsg.includes("403") || errorMsg.includes("Forbidden")) {
        return res.status(403).json({
          error: "Upbit API 권한이 부족합니다. 계좌 조회 권한을 확인해주세요."
        });
      } else if (errorMsg.includes("Network") || errorMsg.includes("fetch")) {
        return res.status(503).json({
          error: "Upbit 서버에 연결할 수 없습니다. 나중에 다시 시도해주세요."
        });
      }

      return res.status(500).json({ error: errorMsg });
    }

    const config: TradeConfig = {
      enabled: true,
      exchange: "upbit",
      apiKey,
      apiSecret,
      coins: coins || ["BTC", "ETH"],
      positionSizePercent: positionSizePercent || 5,
      stopLossPercent: stopLossPercent || 2,
      takeProfitPercent: takeProfitPercent || 5,
      maxDailyLoss: maxDailyLoss || 500000,
    };

    autoTrader = new AutoTrader(config);
    res.json({ success: true, message: "✅ Upbit API 연동이 완료되었습니다!" });
  } catch (error: any) {
    console.error("거래 초기화 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// TradingView 웹훅 엔드포인트
app.post("/api/trading/webhook", async (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    const signal: TradingViewSignal = req.body;

    if (!signal.symbol || !signal.side) {
      return res.status(400).json({ error: "symbol과 side가 필요합니다." });
    }

    // 신호 처리
    await autoTrader.processSignal({
      symbol: signal.symbol,
      side: signal.side,
      price: signal.price,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: `${signal.side} 신호를 처리했습니다.` });
  } catch (error: any) {
    console.error("웹훅 처리 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 활성 거래 조회
app.get("/api/trading/active", (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    const activeTrades = autoTrader.getActiveTrades();
    res.json(activeTrades);
  } catch (error: any) {
    console.error("활성 거래 조회 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 거래 이력 조회
app.get("/api/trading/history", (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    const history = autoTrader.getTradeHistory();
    res.json(history);
  } catch (error: any) {
    console.error("거래 이력 조회 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 일일 손실액 조회
app.get("/api/trading/daily-loss", (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    const dailyLoss = autoTrader.getDailyLoss();
    res.json({ dailyLoss });
  } catch (error: any) {
    console.error("일일 손실액 조회 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 모든 거래 강제 종료
app.post("/api/trading/close-all", async (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    await autoTrader.closeAllTrades();
    res.json({ success: true, message: "모든 거래를 종료했습니다." });
  } catch (error: any) {
    console.error("거래 종료 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

// 자동매매 활성화/비활성화
app.post("/api/trading/toggle", (req, res) => {
  try {
    if (!autoTrader) {
      return res.status(400).json({ error: "자동매매 시스템이 초기화되지 않았습니다." });
    }

    const { enabled } = req.body;
    autoTrader.updateConfig({ enabled });
    res.json({ success: true, message: `자동매매가 ${enabled ? "활성화" : "비활성화"}되었습니다.` });
  } catch (error: any) {
    console.error("토글 오류:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey || apiKey === "YOUR_API_KEY") {
      return res.status(401).json({ 
        error: "GEMINI_API_KEY가 올바르게 설정되지 않았습니다. Google AI Studio 화면 우측 상단의 'Settings' -> 'Environment Variables' 메뉴에서 GEMINI_API_KEY에 유효한 API 키를 등록했는지 확인해 주세요." 
      });
    }

    const { message, turn, bibleVersion, receivedVerses } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: "메시지를 입력해주세요." });
    }

    const systemInstruction = `
# 바이블 터치 - 성경 말씀 추천 알고리즘 프롬프트

## 시스템 역할
당신은 사용자의 감정과 고민을 경청하고, 마음에 평안을 주는 성경 말씀과 구절 기반의 짧은 첨언을 전하는 안내자(AI)입니다.
인간 상담사처럼 직접 '기도하겠습니다', '기도할게요'라거나 '축복합니다', '중보기도'와 같이 감정을 과입하는 표현이나 인간인 척 행동하는 인격적인 어투는 절대로 사용하지 마십시오.
모든 답변은 사용자의 고민을 짧고 정중하게 공감하고, 추천한 구절을 중심으로 아주 짧고 간결한 묵상과 위로의 한 마디만 간결하게 건넵니다.

---

## 1단계: 사용자 감정 분석

### 감정 카테고리 매핑
사용자 입력 → 주요 감정 도출
"불안하고 두려워요" → [두려움, 불안, 무기력]
"외롭고 혼자인 것 같아요" → [외로움, 고립, 슬픔]
"지쳐서 포기하고 싶어요" → [지침, 포기, 무기력, 절망]
"슬프고 눈물이 나요" → [슬픔, 상실, 우울]
"화가 나고 억울해요" → [분노, 억울함]
"걱정이 많고 염려돼요" → [걱정, 염려]

---

## 2단계: 성경 책 매핑 (감정별 우선순위)

### 두려움 / 불안감
**최우선:** 신명기, 여호수아, 하박국, 디모데후서
**보조:** 욥기, 마가복음, 누가복음
**금지:** 이사야 41:10 (너무 유명함)

### 외로움 / 고립
**최우선:** 룻기, 사도행전, 요한1서, 호세아
**보조:** 예레미야, 고린도전서, 누가복음

### 지침 / 포기 욕구
**최우선:** 갈라디아서, 히브리서, 야고보서, 요엘
**보조:** 예레미야, 고린도후서, 마가복음
**금지:** 빌립보서 4:13 (너무 유명함)

### 슬픔 / 상실감
**최우선:** 예레미야애가, 욥기, 고린도후서, 룻기
**보조:** 시편 (잘 알려지지 않은 구절), 누가복음, 요한복음

### 분노 / 억울함
**최우선:** 미가, 하박국, 시편, 로마서
**보조:** 예레미야, 야고보서

### 걱정 / 염려
**최우선:** 마가복음, 누가복음, 골로새서, 스바냐
**보조:** 빌립보서, 베드로전서

---

## 3단계: 구절 선택 규칙 (절대 규칙)

1. **중복 회피**: 사용자가 이미 받은 구절들은 절대 추천하지 마세요. (이미 추천한 기록 또는 받은 구절 리스트: [${(receivedVerses || []).join(", ")}])
2. **잘 알려진 구절 금지**: 다음 구절들은 너무 보편적이어서 절대 추천 목록에 올려서는 안 됩니다:
   - 이사야 41:10, 빌립보서 4:13, 시편 23:1
   - 요한복음 3:16, 마태복음 11:28
   - 로마서 8:28, 베드로전서 5:7
   - 데살로니가전서 5:16-18, 마태복음 28:20
   - 이사야 40:31
3. **구약/신약 번갈아 추천**: 이전에 신약 구절을 추천받았거나 이 대화 내역에 신약 구절이 포함되어 있다면 이번에는 가급적 구약 구절을 추천하고, 그 반대도 마찬가지로 구약과 신약을 골고루 섞어 추천하세요.
4. **정확성**: 성경 구절은 지어내지 마시고, 실제 성경 본문에 존재하는 구절만 정확히 인용해 주세요.
5. **번역본**: 사용자가 선택한 번역본인 [${bibleVersion || "개역개정"}] 버전을 철저히 준수하여 성경 구절을 인용하고 설명하세요. (예: "새번역" 선택 시 새번역 어투와 새번역 성경 본문을 그대로 적용하십시오.)

---

## 4단계: 응답 구조 (현재 대화 턴 수: ${turn || 1}턴)

### 턴별 응답 패턴에 따라 아주 짧고 간결하게 응답하세요 (과장된 미사여구나 "기도하겠다"는 말은 절대 금지):

- **첫 번째 답변 (turn = 1):**
  1. 짧은 공감 (1~2줄 이내로 담백하게)
  2. 성경 구절 1개 (HTML verse-card 형식)
  3. 추천 구절에 기반한 은혜롭고 짧은 해설 (2줄 내외) 및 가벼운 질문 (1줄)

- **두 번째 답변 (turn = 2):**
  1. 짧은 연결 공감 (1줄 이내)
  2. 추가 성경 구절 1개 (다른 성경 책에서 선택)
  3. 구절을 바탕으로 한 짧은 위로의 메시지 (2줄 내외) 및 가벼운 질문 (1줄)

- **세 번째 답변 (turn = 3):**
  1. 짧은 핵심 정리 (1줄 이내)
  2. 세 번째 구절 1개 (가장 힘이 되는 메시지)
  3. 구절에 기반한 담백한 권면과 위로 (2줄 내외)

- **네 번째 이후 답변 (turn >= 4):**
  - 대화를 간결하고 깔끔하게 매듭짓는 짧은 인사를 전합니다.
  - 이 턴에는 성경 구절(verse-card)을 추천하지 마십시오.

---

## 5단계: HTML 응답 형식 (매우 중요)
성경 구절을 추천하는 턴(1, 2, 3턴)에서는 반드시 아래의 HTML 구조를 정확하게 포함하여 답변하세요. 마크다운 백틱(\`\`\`) 기호 없이 순수한 HTML 태그 형태로 텍스트를 구성해야 합니다.

<p>담백한 공감 메시지</p>

<div class="verse-card">
  <p class="verse-text">"정확한 구절 내용"</p>
  <p class="verse-ref">책명 장:절</p>
</div>

<p>추천 말씀에 깊이 밀착된 짧고 간결한 메시지 (1-2문장 이내)</p>
<p>가벼운 후속 질문 또는 묵상 적용점</p>

※ 참고: verse-card 안에는 오직 추천하는 성경 구절 본문과 그 출처(책명 장:절)만 넣어야 합니다. 다른 어떠한 해설이나 서술형 문장도 verse-card 안에 삽입하지 마세요.

---

## 6단계: 톤 가이드 및 금지 지침
- **짧고 간결하게**: 모든 응답과 위로는 질질 끌지 않고 매우 짧고 긴장감 있게 씁니다.
- **사람인 척 절대 금지**: "기도하겠습니다", "대신 간구하겠습니다", "예배드리세요", "축복합니다" 와 같이 성도나 인간 목회자처럼 구는 모든 어투와 단어를 일절 제외하십시오. 
- **말씀 기반의 첨언**: 추천된 성경 말씀 자체의 약속과 은혜에만 조용히 포커스하여 담백하게 건네도록 합니다.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini 응답이 비어 있습니다.");
    }

    res.json({ reply: text });
  } catch (error: any) {
    console.error("API error in /api/chat:", error);
    
    const errorStr = String(error?.message || error || "");
    if (errorStr.includes("API key not valid") || errorStr.includes("API_KEY_INVALID") || errorStr.includes("key not valid")) {
      return res.status(401).json({
        error: "입력된 Gemini API 키가 올바르지 않거나 유효하지 않습니다. Google AI Studio 화면 우측 상단의 'Settings' -> 'Environment Variables' 메뉴에서 유효한 'GEMINI_API_KEY'를 등록하셨는지 다시 한번 확인해 주세요."
      });
    }

    // 503 UNAVAILABLE 이나 기타 모델 오버로드, 혹은 모든 API 호출 실패 시
    // 서비스의 영속성을 위해 미리 마련해둔 가장 적절한 채팅 Fallback 데이터를 반환합니다.
    console.log("Gemini API 장애 또는 503 오류 감지: Fallback 채팅 응답을 반환합니다.");
    const { message, turn, bibleVersion } = req.body;
    const fallbackReply = getFallbackChatResponse(message || "", turn || 1, bibleVersion || "개역개정");
    return res.json({ reply: fallbackReply });
  }
});

// 자동매매 대시보드 제공
app.get("/dashboard", (req, res) => {
  const dashboardPath = path.join(process.cwd(), "trading-dashboard.html");
  res.sendFile(dashboardPath);
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
