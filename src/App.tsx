import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Heart,
  Bookmark,
  Share2,
  Send,
  Calendar,
  Award,
  Settings,
  ChevronRight,
  Plus,
  Trash2,
  User,
  BookOpen,
  Compass,
  CheckCircle2,
  ArrowLeft,
  Check,
  Loader2,
  Copy,
  Info,
  ExternalLink,
  Lock,
  Moon,
  Sun,
  Home,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import { WorryResult, HistoryItem, Recommendation } from "./types.ts";
import TradingDashboard from "./TradingDashboard";

// 기본 오늘의 말씀 모음 (바이블 터치 - 성경 말씀 중심의 처방 추천)
const DEFAULT_DAILY_VERSES = [
  {
    quote: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
    citation: "성경 - 마태복음 11장 28절",
    source: "성경 말씀"
  },
  {
    quote: "너의 길을 여호와께 맡기라 그를 의지하면 그가 이루시고",
    citation: "성경 - 시편 37편 5절",
    source: "성경 말씀"
  },
  {
    quote: "아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라",
    citation: "성경 - 빌립보서 4장 6절",
    source: "성경 말씀"
  },
  {
    quote: "여호와는 나의 목자시니 내게 부족함이 없으리로다",
    citation: "성경 - 시편 23편 1절",
    source: "성경 말씀"
  },
  {
    quote: "두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라",
    citation: "성경 - 이사야 41장 10절",
    source: "성경 말씀"
  }
];

// 바이블 터치 로고 컴포넌트
function BibleTouchLogo({ isNightMode, className = "h-8" }: { isNightMode: boolean; className?: string }) {
  const primaryColor = isNightMode ? "text-teal-400" : "text-[#007A87]";
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* squircle logo directly resembling the user's uploaded image */}
      <div className={`w-8.5 h-8.5 rounded-2xl flex items-center justify-center shadow-md transition-all ${
        isNightMode 
          ? "bg-[#007A87] border border-teal-500/20 text-teal-100" 
          : "bg-[#007A87] text-white"
      }`}>
        <BookOpen className="w-5 h-5 stroke-[2.2]" />
      </div>
      <span className={`font-black tracking-wider text-[17px] ${primaryColor} font-sans`}>
        BIBLE TOUCH
      </span>
    </div>
  );
}

// HTML에서 성경 구절을 파싱하여 객체로 변환하는 도우미 함수
const extractVerseFromHtml = (htmlText: string) => {
  if (!htmlText) return null;
  // <p class="verse-text">"..."</p> 또는 <p class="verse-text">...</p>
  const textRegex = /<p\s+class=["']verse-text["']>\s*["'“]?(.*?)["'”]?\s*<\/p>/i;
  // <p class="verse-ref">...</p>
  const refRegex = /<p\s+class=["']verse-ref["']>\s*(.*?)\s*<\/p>/i;

  const textMatch = htmlText.match(textRegex);
  const refMatch = htmlText.match(refRegex);

  if (textMatch && refMatch) {
    return {
      quote: textMatch[1].replace(/^["'“]|["'”]$/g, '').trim(),
      citation: refMatch[1].trim(),
      source: "성경 말씀"
    };
  }
  return null;
};

const PRESET_QUESTIONS_POOL = [
  { label: "막막하고 불안해요 🧭", text: "요즘 앞날이 너무 불투명하고 막막해서 자꾸 마음이 불안해집니다. 이겨낼 수 있는 성경 말씀을 추천해 주세요." },
  { label: "인간관계에 상처받았어요 💔", text: "가까운 사람과의 오해와 일로 인해 깊은 상처를 입었습니다. 혼자 있고 싶은 외로운 마음에 힘이 되는 성경 말씀을 원합니다." },
  { label: "무기력하고 무겁습니다 🕯️", text: "끝없는 경쟁과 실패에 지쳐 자꾸만 제 자신이 무기력해지고 힘이 빠집니다. 마음을 추스를 수 있는 위로 말씀을 들려주세요." },
  { label: "마음이 무겁고 슬퍼요 🌧️", text: "상황 때문에 가슴 아픈 슬픔을 마주해 마음이 너무 공허합니다. 저를 깊이 껴안아 줄 성경의 위로 말씀을 주시면 좋겠습니다." },
  { label: "용서하기가 너무 힘듭니다 🕊️", text: "저에게 상처 준 사람을 머리로는 용서해야지 하면서도 마음으로는 도저히 용서가 안 됩니다. 미움을 비우고 주님의 용서하는 법을 깨닫게 해주는 말씀을 찾아주세요." },
  { label: "재정적으로 쪼들려 걱정입니다 💸", text: "물가가 오르고 벌이가 부족해 매달 쓸 것을 걱정해야 하는 상황이 버겁습니다. 통장 잔고의 불안을 떨치고 하나님을 신뢰할 수 있게 돕는 말씀이 있을까요?" },
  { label: "중요한 결정을 앞두고 있어요 🎯", text: "선택의 기로에서 어떤 길이 하나님의 뜻이고 저에게 최선일지 분간하기 어렵습니다. 올바른 지혜와 분별력을 키워줄 성경 말씀을 가르쳐 주세요." },
  { label: "오늘 하루 감사함을 느끼고 싶어요 ☀️", text: "평범하고 지루한 일상 속에서 당연하게 여기던 것들을 다시 감사하게 돌아보고 싶습니다. 감사의 고백을 회복하게 도와줄 은혜로운 구절을 구합니다." },
  { label: "영적으로 침체되어 답답합니다 🕯️", text: "기도도 잘 안 나오고 영적으로 메말라 있는 듯한 느낌입니다. 다시 주님을 향한 첫사랑과 뜨거운 갈망을 회복할 수 있는 생명수 같은 말씀을 찾고 싶어요." },
  { label: "자녀 문제로 마음이 타들어 갑니다 👨‍👩‍👧", text: "자녀의 미래, 학업, 혹은 사춘기 갈등으로 밤잠을 설칠 만큼 염려가 큽니다. 자녀를 온전히 주님께 맡기고 평안을 얻을 수 있는 성경 구절을 추천해 주세요." },
  { label: "몸과 마음이 무척 아픕니다 🩹", text: "건강의 연약함이나 질병의 고통 때문에 지치고 눈물이 납니다. 주님의 신실한 치유의 손길과 치료의 광선을 기대할 수 있는 약속의 구절을 나누어 주세요." },
  { label: "나의 가치와 자존감이 낮아졌어요 🌿", text: "다른 사람들과 나를 비교하며 초라함을 느끼고 자책하게 됩니다. 세상의 눈이 아닌 하나님의 눈으로 나를 귀하게 바라보는 정체성을 일깨워 주는 구절을 듣고 싶습니다." }
];

export default function App() {
  // --- 번역본 선택 상태 ---
  const [bibleVersion, setBibleVersion] = useState<"개역개정" | "새번역">(() => {
    return (localStorage.getItem("mw_bible_version") as "개역개정" | "새번역") || "개역개정";
  });

  useEffect(() => {
    localStorage.setItem("mw_bible_version", bibleVersion);
  }, [bibleVersion]);

  // --- 탭 상태 ---
  const [activeTab, setActiveTab] = useState<"home" | "recommend" | "saved" | "meditation" | "settings" | "trading">("home");

  // --- 핵심 비즈니스 상태 ---
  const [nickname, setNickname] = useState<string>(() => localStorage.getItem("mw_nickname") || "여행자");
  const [savedVerses, setSavedVerses] = useState<HistoryItem[]>(() => {
    const data = localStorage.getItem("mw_saved_verses");
    return data ? JSON.parse(data) : [];
  });
  const [meditationNotes, setMeditationNotes] = useState<{
    id: string;
    verseId: string;
    quote: string;
    citation: string;
    source: string;
    date: string;
    answers: string[];
  }[]>(() => {
    const data = localStorage.getItem("mw_meditation_notes");
    return data ? JSON.parse(data) : [];
  });

  // --- 챌린지 상태 ---
  const [currentChallenge, setCurrentChallenge] = useState<{
    days: number;
    startDate: string;
    checkedDates: string[]; // ['2026-06-30', ...]
    badges: { emoji: string; name: string; date: string }[];
  } | null>(() => {
    const data = localStorage.getItem("mw_current_challenge");
    return data ? JSON.parse(data) : null;
  });

  // --- 획득한 배지 상태 ---
  const [unlockedBadges, setUnlockedBadges] = useState<{ emoji: string; name: string; date: string }[]>(() => {
    const data = localStorage.getItem("mw_unlocked_badges");
    if (data) return JSON.parse(data);
    
    // Fallback: If currentChallenge has badges, use them as initial badges
    const chData = localStorage.getItem("mw_current_challenge");
    if (chData) {
      try {
        const parsed = JSON.parse(chData);
        if (parsed && Array.isArray(parsed.badges)) {
          return parsed.badges;
        }
      } catch (e) {}
    }
    return [];
  });

  // --- 대화/추천 입력 상태 및 말씀채팅 상태 ---
  const [worryInput, setWorryInput] = useState("");
  const [recommendedPresets, setRecommendedPresets] = useState<{ label: string; text: string }[]>(() => {
    const shuffled = [...PRESET_QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  });

  const refreshRecommendedQuestions = () => {
    const shuffled = [...PRESET_QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    setRecommendedPresets(shuffled.slice(0, 4));
  };

  const [selectedSources, setSelectedSources] = useState<string[]>(["성경 말씀"]);
  const [selectedTone, setSelectedTone] = useState<"comfort" | "wise" | "strong">("comfort");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<WorryResult | null>(null);

  const [chatMessages, setChatMessages] = useState<{
    id: string;
    sender: "user" | "bot";
    text?: string;
    timestamp: string;
    result?: WorryResult;
    isLoading?: boolean;
  }[]>(() => {
    const savedChat = localStorage.getItem("mw_chat_messages");
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the first message is the welcome message, update its text to the new one
          if (parsed[0].id === "welcome") {
            parsed[0].text = "당신의 이야기를 나눠주세요!\n성경 말씀으로 함께 대화해 드립니다";
          }
        }
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "welcome",
        sender: "bot",
        text: "당신의 이야기를 나눠주세요!\n성경 말씀으로 함께 대화해 드립니다",
        timestamp: "오전 09:41"
      }
    ];
  });
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 채팅 메시지 로컬 보존
  useEffect(() => {
    localStorage.setItem("mw_chat_messages", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // 새 채팅 수신 시 최하단 부드러운 스크롤
  useEffect(() => {
    if (activeTab === "recommend") {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages, activeTab]);

  // 말씀채팅 탭 방문 시 추천 질문 자동 새로고침
  useEffect(() => {
    if (activeTab === "recommend") {
      refreshRecommendedQuestions();
    }
  }, [activeTab]);

  // --- 묵상 진행 상태 ---
  const [selectedVerseForMed, setSelectedVerseForMed] = useState<Recommendation | null>(null);
  const [medAnswers, setMedAnswers] = useState<string[]>(["", "", ""]);
  const [viewingMedNote, setViewingMedNote] = useState<any | null>(null);

  // --- UI 부가 상태 ---
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedChallengeDays, setSelectedChallengeDays] = useState<number>(3);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    return localStorage.getItem("mw_night_mode") === "true";
  });
  const [simulatedTime, setSimulatedTime] = useState("09:41");

  // Upbit API 설정
  const [upbitApiKey, setUpbitApiKey] = useState<string>(() => localStorage.getItem("mw_upbit_api_key") || "");
  const [upbitApiSecret, setUpbitApiSecret] = useState<string>(() => localStorage.getItem("mw_upbit_api_secret") || "");
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [upbitConnected, setUpbitConnected] = useState<boolean>(() => localStorage.getItem("mw_upbit_connected") === "true");
  const [upbitTestLoading, setUpbitTestLoading] = useState(false);
  const [upbitTestResult, setUpbitTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 모바일 디바이스 상태바 시뮬레이션용 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "오후" : "오전";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0시 -> 12시
      setSimulatedTime(`${ampm} ${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- 알림 가상 상태 ---
  const [allNotifications, setAllNotifications] = useState(true);
  const [morningTime, setMorningTime] = useState("07:00");
  const [comfortTime, setComfortTime] = useState("13:00");
  const [reviewTime, setReviewTime] = useState("20:00");

  // --- 오늘의 말씀 동적 결정 ---
  const [dailyVerse, setDailyVerse] = useState({ quote: "", citation: "", source: "" });
  useEffect(() => {
    const today = new Date();
    const index = (today.getFullYear() * 31 + today.getMonth() * 12 + today.getDate()) % DEFAULT_DAILY_VERSES.length;
    setDailyVerse(DEFAULT_DAILY_VERSES[index]);
  }, []);

  // --- 로컬스토리지 동기화 ---
  useEffect(() => {
    localStorage.setItem("mw_nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem("mw_night_mode", isNightMode ? "true" : "false");
  }, [isNightMode]);

  useEffect(() => {
    localStorage.setItem("mw_saved_verses", JSON.stringify(savedVerses));
  }, [savedVerses]);

  useEffect(() => {
    localStorage.setItem("mw_meditation_notes", JSON.stringify(meditationNotes));
  }, [meditationNotes]);

  useEffect(() => {
    localStorage.setItem("mw_current_challenge", JSON.stringify(currentChallenge));
  }, [currentChallenge]);

  useEffect(() => {
    localStorage.setItem("mw_unlocked_badges", JSON.stringify(unlockedBadges));
  }, [unlockedBadges]);

  // --- 알림 모달 헬퍼 ---
  const triggerAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => {
      setAlertMessage(null);
    }, 2500);
  };

  // --- 오늘의 말씀 저장하기 ---
  const handleSaveDailyVerse = () => {
    // 중복 체크
    const isAlreadySaved = savedVerses.some(item => item.result.recommendations.some(rec => rec.quote === dailyVerse.quote));
    if (isAlreadySaved) {
      triggerAlert("이미 보관함에 저장되어 있는 구절입니다. ✨");
      return;
    }

    const todayStr = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const mockResult: WorryResult = {
      worryAnalysis: "매일 아침 배달되는 평화로운 마음의 말씀 한 구절을 간직합니다.",
      recommendations: [{
        source: dailyVerse.source,
        citation: dailyVerse.citation,
        quote: dailyVerse.quote,
        meaning: "우리의 일상 속에서 가장 단순하지만 깊은 진리를 일깨워주는 위로입니다.",
        application: "오늘 하루, 이 말씀을 마음에 품고 고요히 호흡하며 주위를 둘러보세요."
      }],
      comfortingMessage: "매일 찾아오는 지혜와 위로가 마음 한편의 기댈 기둥이 되길 기원합니다.",
      recommendedActions: ["말씀 구절을 소리내어 천천히 3번 읽기", "눈을 감고 1분간 깊은 호흡에만 집중하기"]
    };

    const newItem: HistoryItem = {
      id: "daily-" + Date.now(),
      timestamp: todayStr,
      worry: "오늘의 말씀",
      tone: "comfort",
      sources: [dailyVerse.source],
      result: mockResult
    };

    setSavedVerses(prev => [newItem, ...prev]);
    triggerAlert("오늘의 말씀을 보관함에 저장했습니다! 📖");
  };

  // --- 말씀채팅 전송 및 추천 API 호출 ---
  const handleSendChatMessage = async (textToSend?: string) => {
    const finalWorry = (textToSend || worryInput).trim();
    if (!finalWorry) {
      triggerAlert("고민 내용을 먼저 입력해 주세요. ✨");
      return;
    }

    // 인풋 지우기
    if (!textToSend) {
      setWorryInput("");
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    // 1. 유저 메시지 추가
    const userMsg = {
      id: "user-" + Date.now(),
      sender: "user" as const,
      text: finalWorry,
      timestamp: timeStr
    };

    // 2. 대기 메시지 추가
    const loadingId = "loading-" + Date.now();
    const loadingMsg = {
      id: loadingId,
      sender: "bot" as const,
      text: "기도하는 마음으로 주님의 은혜로운 성경 구절을 선택하고 있습니다...",
      timestamp: "",
      isLoading: true
    };

    // 현재까지 봇이 추천해 준 구절 목록 추출 (중복 회피용)
    const receivedVerses: string[] = [];
    chatMessages.forEach(m => {
      if (m.sender === "bot" && m.text) {
        const ext = extractVerseFromHtml(m.text);
        if (ext) {
          receivedVerses.push(`${ext.citation} (${ext.quote})`);
        }
      }
    });

    // 현재 턴 수 계산 (기존 유저 메시지 수 + 1)
    const currentTurn = chatMessages.filter(m => m.sender === "user").length + 1;

    setChatMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalWorry,
          turn: currentTurn,
          bibleVersion: bibleVersion,
          receivedVerses: receivedVerses
        })
      });

      if (!response.ok) {
        throw new Error("서버 응답 에러");
      }

      const data = await response.json();
      const replyText = data.reply;

      // 3. 챗봇 응답 메시지로 로딩 메시지 교체
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [
          ...filtered,
          {
            id: "bot-" + Date.now(),
            sender: "bot" as const,
            text: replyText,
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
          }
        ];
      });

      // 4. 자동 보관함 저장 (HTML에서 구절이 성공적으로 추출될 때만)
      const extracted = extractVerseFromHtml(replyText);
      if (extracted) {
        const todayStr = new Date().toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        const isAlreadySaved = savedVerses.some(item => 
          item.result.recommendations.some(rec => rec.quote === extracted.quote)
        );

        if (!isAlreadySaved) {
          const mockResult: WorryResult = {
            worryAnalysis: "말씀채팅을 통해 인도해주신 아름다운 주님의 구절을 마음 깊이 간직합니다.",
            recommendations: [{
              source: extracted.source,
              citation: extracted.citation,
              quote: extracted.quote,
              meaning: "이 성경 구절은 지치고 어려운 순간 우리를 향한 주님의 깊은 자비와 은혜의 조명입니다.",
              application: "이 구절을 지침 삼아 주님께 조용히 기도로 나아가며 마음의 짐을 내려놓아 보시기 바랍니다."
            }],
            comfortingMessage: "주님께서 항상 곁에서 평온과 안식으로 지켜주심을 믿으며 나아갑니다.",
            recommendedActions: ["말씀 구절을 마음에 되새기며 3회 천천히 호흡하기"]
          };

          const newItem: HistoryItem = {
            id: "rec-" + Date.now(),
            timestamp: todayStr,
            worry: finalWorry,
            tone: selectedTone,
            sources: ["성경 말씀"],
            result: mockResult
          };

          setSavedVerses(prev => [newItem, ...prev]);
          triggerAlert("새 말씀 위로가 도착하여 보관함(주신말씀)에 저장되었습니다! 🕊️");
        }
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [
          ...filtered,
          {
            id: "error-" + Date.now(),
            sender: "bot" as const,
            text: "말씀 처방을 생성하는 도중 일시적인 네트워크 오류가 발생했습니다. 잠시 후 다시 조심스레 고민을 보내 주세요.",
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
          }
        ];
      });
      triggerAlert("말씀을 가져오지 못했습니다. 네트워크 상태를 확인 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 텍스트 복사 헬퍼 ---
  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    triggerAlert("클립보드에 아름답게 복사되었습니다. 📋");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- 공유하기 모의 기능 ---
  const handleShareText = (quote: string, citation: string) => {
    const text = `"${quote}"\n— ${citation}\n\n[고민 위로 말씀 추천 앱]에서 선물받은 평온의 구절입니다. ✨`;
    if (navigator.share) {
      navigator.share({
        title: "마음의 말씀 위로 공유",
        text: text
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(text);
      triggerAlert("공유 텍스트가 클립보드에 복사되었습니다! 💌");
    }
  };

  // --- 보관함 개별 삭제 ---
  const handleDeleteSavedItem = (id: string) => {
    if (window.confirm("이 말씀 추천 내역을 보관함에서 삭제하시겠습니까?")) {
      setSavedVerses(prev => prev.filter(item => item.id !== id));
      triggerAlert("보관함에서 삭제되었습니다.");
    }
  };

  // --- 묵상 노트 작성 완료 ---
  const handleSaveMeditation = () => {
    if (!selectedVerseForMed) return;
    if (medAnswers.some(ans => !ans.trim())) {
      if (!window.confirm("아직 답변하지 않은 질문이 있습니다. 이대로 묵상 기록을 완료할까요?")) {
        return;
      }
    }

    const todayStr = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const newNote = {
      id: "med-" + Date.now(),
      verseId: selectedVerseForMed.citation,
      quote: selectedVerseForMed.quote,
      citation: selectedVerseForMed.citation,
      source: selectedVerseForMed.source,
      date: todayStr,
      answers: medAnswers
    };

    setMeditationNotes(prev => [newNote, ...prev]);

    // 챌린지 도장 찍기 처리
    if (currentChallenge) {
      const todayISO = new Date().toISOString().split("T")[0];
      if (!currentChallenge.checkedDates.includes(todayISO)) {
        const updatedChecked = [...currentChallenge.checkedDates, todayISO];
        let updatedBadges = [...currentChallenge.badges];

        // 챌린지 성공 조건 확인
        if (updatedChecked.length === currentChallenge.days) {
          const badgeNames = {
            3: { name: "성실한 새싹 🌱", emoji: "🌱" },
            7: { name: "타오르는 불꽃 🔥", emoji: "🔥" },
            30: { name: "밝게 빛나는 별 ⭐", emoji: "⭐" },
            100: { name: "마음의 현자 왕관 👑", emoji: "👑" }
          } as any;

          const match = badgeNames[currentChallenge.days] || { name: "평온 마스터 🏆", emoji: "🏆" };
          const newBadge = {
            emoji: match.emoji,
            name: match.name,
            date: todayStr
          };
          updatedBadges.push(newBadge);
          setUnlockedBadges(prev => [...prev, newBadge]);
          triggerAlert(`축하합니다! ${currentChallenge.days}일 챌린지를 완수하여 [${match.name}] 배지를 획득했습니다! 🎉`);
        } else {
          triggerAlert(`오늘의 묵상 도장을 찍었습니다! (${updatedChecked.length}/${currentChallenge.days}일 완료) 📅`);
        }

        setCurrentChallenge(prev => prev ? {
          ...prev,
          checkedDates: updatedChecked,
          badges: updatedBadges
        } : null);
      } else {
        triggerAlert("오늘의 묵상이 완료되어 저장되었습니다. (이미 오늘 도장이 찍혀 있습니다.) ✍️");
      }
    } else {
      triggerAlert("오늘의 묵상이 안전하게 보관되었습니다! ✍️");
    }

    // 초기화 및 리셋
    setSelectedVerseForMed(null);
    setMedAnswers(["", "", ""]);
  };

  // --- 챌린지 시작 처리 ---
  const handleStartChallenge = (days: number) => {
    const todayStr = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    setCurrentChallenge({
      days: days,
      startDate: todayStr,
      checkedDates: [],
      badges: currentChallenge ? currentChallenge.badges : []
    });

    setShowChallengeModal(false);
    triggerAlert(`${days}일 성경묵상 챌린지가 시작되었습니다! 매일 꾸준히 묵상해봐요. 🌟`);
  };

  const handleResetChallenge = () => {
    setCurrentChallenge(null);
    setIsResetConfirming(false);
    triggerAlert("챌린지 진행이 완전히 초기화되었습니다. 🌱");
  };

  // --- 데이터 초기화 헬퍼 ---
  const handleClearAllData = () => {
    if (window.confirm("보관함 말씀, 묵상 노트, 챌린지 배지를 포함한 모든 로컬 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.clear();
      setNickname("여행자");
      setSavedVerses([]);
      setMeditationNotes([]);
      setCurrentChallenge(null);
      setUnlockedBadges([]);
      setActiveTab("home");
      triggerAlert("모든 데이터가 안전하게 완전히 삭제되었습니다.");
    }
  };

  // 보관함 필터링 적용
  const filteredSaved = savedVerses;

  return (
    <div 
      id="app-container" 
      className={`min-h-screen w-full flex items-center justify-center font-sans transition-all duration-500 overflow-x-hidden relative ${
        isNightMode 
          ? "bg-[#051116] text-[#cbe6ed]" 
          : "bg-gradient-to-br from-[#e6f4f8] via-[#f0f7fa] to-[#d2eff4] text-[#0d2a35]"
      }`}
    >
      {/* Background organic circles (Figma style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className={`absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full blur-3xl ${isNightMode ? "bg-teal-500/5" : "bg-teal-500/8"}`} />
        <div className={`absolute -bottom-[20%] right-[10%] w-[800px] h-[800px] rounded-full blur-3xl ${isNightMode ? "bg-cyan-500/5" : "bg-cyan-400/8"}`} />
        
        {/* Curved concentric waves */}
        <div className={`absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full border ${isNightMode ? "border-teal-500/5" : "border-teal-500/8"}`} />
        <div className={`absolute -top-20 -left-20 w-[800px] h-[800px] rounded-full border ${isNightMode ? "border-teal-500/5" : "border-teal-500/10"}`} />
        <div className={`absolute -top-0 -left-0 w-[1000px] h-[1000px] rounded-full border ${isNightMode ? "border-teal-500/3" : "border-teal-500/5"}`} />
      </div>

      {/* 알림 배너 */}
      {alertMessage && (
        <div id="toast-alert" className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#007A87] text-white text-xs px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-teal-400/20 font-semibold font-sans">
          <Sparkles className="w-3.5 h-3.5 text-cyan-200 fill-cyan-200" />
          <span>{alertMessage}</span>
        </div>
      )}

      {/* 데스크톱 왼쪽 안내 배너 (sm 이하 모바일일 때는 숨김) */}
      <div className="hidden lg:flex flex-col max-w-sm mr-16 space-y-8 text-left animate-fade-in relative z-10 select-none">
        <div className="space-y-4">
          {/* App Icon Circle */}
          <div className="w-16 h-16 bg-[#007A87] rounded-3xl flex items-center justify-center border border-teal-400/30 shadow-lg relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-300 to-teal-600 rounded-3xl opacity-20" />
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-[#007A87] font-sans">
            BIBLE TOUCH
          </h1>
          <p className={`text-md font-bold tracking-wider uppercase ${isNightMode ? "text-teal-400" : "text-teal-800/80"}`}>
            Bible Wisdom & Comforting App
          </p>
        </div>

        <div className="space-y-4 text-xs font-semibold leading-relaxed">
          <div className={`p-5 rounded-[24px] border shadow-sm space-y-2 ${isNightMode ? "bg-[#091b22]/55 border-[#122a33]" : "bg-white/80 border-[#e2eff3]"}`}>
            <h3 className="font-bold text-[#007A87] flex items-center gap-1.5">📱 설치 가능한 모바일 웹앱</h3>
            <p className={isNightMode ? "text-stone-400" : "text-stone-500"}>스마트폰의 크롬이나 사파리 브라우저에서 '홈 화면에 추가'를 누르시면 완벽한 무설치 독립형 앱으로 매일 평온을 누릴 수 있습니다.</p>
          </div>

          <div className={`p-5 rounded-[24px] border shadow-sm space-y-2 ${isNightMode ? "bg-[#091b22]/55 border-[#122a33]" : "bg-white/80 border-[#e2eff3]"}`}>
            <h3 className="font-bold text-[#007A87] flex items-center gap-1.5">🌙 야간 차분 묵상 모드</h3>
            <p className={isNightMode ? "text-stone-400" : "text-stone-500"}>조용한 밤 시간대에 고민을 기록하거나 묵상하기에 눈이 시리지 않도록 상단의 야간 달빛 스위치를 설계했습니다.</p>
          </div>

          <div className={`p-5 rounded-[24px] border shadow-sm space-y-2 ${isNightMode ? "bg-[#091b22]/55 border-[#122a33]" : "bg-white/80 border-[#e2eff3]"}`}>
            <h3 className="font-bold text-[#007A87] flex items-center gap-1.5">🕊️ 지혜와 평안의 처방</h3>
            <p className={isNightMode ? "text-stone-400" : "text-stone-500"}>성경 속에 가득 담긴 하늘의 위로와 평화로운 지혜의 말씀을 통해 일상 속 무거운 짐을 가볍게 덜어내 보세요.</p>
          </div>
        </div>
      </div>

      {/* 스마트폰 기기 쉘 프레임 */}
      <div 
        className={`w-full sm:max-w-[410px] sm:h-[840px] sm:rounded-[44px] sm:border-[10px] flex flex-col relative overflow-hidden transition-all duration-500 sm:mx-0 z-10 ${
          isNightMode 
            ? "bg-[#091b22] border-[#0c242e] text-[#cbe6ed] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] is-night" 
            : "bg-[#f0f7f9] border-[#0d2a35] text-[#0d2a35] shadow-[0_25px_60px_-15px_rgba(0,122,135,0.18)]"
        }`}
      >
        {/* 모바일 상태바 시뮬레이터 */}
        <div className={`w-full h-11 px-6 pt-3 flex items-center justify-between text-xs select-none font-sans font-semibold sticky top-0 z-50 bg-inherit border-b ${isNightMode ? "border-stone-900/50" : "border-stone-200/10"}`}>
          <span className="text-[11px] tracking-tight">{simulatedTime}</span>
          
          {/* 기기 노치바 (데스크톱 쉘 형태일 때만 보이도록) */}
          <div className="hidden sm:block w-32 h-4.5 bg-stone-900 rounded-full absolute left-1/2 -translate-x-1/2 top-2 z-55 shadow-inner" />
          
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="px-1 py-0.5 rounded border border-current opacity-70 text-[8px] font-bold tracking-widest scale-90">LTE</span>
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L14.35 6.35C13.67 6.13 12.85 6 12 3zm0 18c4.97 0 9-4.03 9-9 0-2.12-.74-4.07-1.97-5.61L9.65 17.65c.68.22 1.5.35 2.35.35z" />
            </svg>
            <div className="w-6 h-3.5 rounded border border-current p-0.5 flex items-center">
              <div className="bg-current h-full w-4 rounded-sm" />
            </div>
          </div>
        </div>

        {/* 헤더 */}
        <header id="main-header" className={`w-full py-4 px-4 sticky top-0 z-40 backdrop-blur-md border-b ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white/80 border-[#e2eff3]"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BibleTouchLogo isNightMode={isNightMode} className="h-8 w-auto" />
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* 야간 묵상 모드 토글 단추 */}
              <button
                onClick={() => {
                  setIsNightMode(!isNightMode);
                  triggerAlert(isNightMode ? "눈부신 일상 모드로 돌아갑니다. ☀️" : "고요하고 아늑한 야간 묵상 모드가 켜졌습니다. 🌙");
                }}
                className={`p-2 rounded-xl border transition-all ${isNightMode ? "bg-[#122a33] border-teal-900/30 text-teal-300 hover:bg-[#122a33]/80" : "bg-white border-[#e2eff3] text-[#007A87] hover:bg-stone-50"}`}
                title={isNightMode ? "일상 모드" : "야간 모드"}
                id="header-night-btn"
              >
                {isNightMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 (스크롤 가능하도록 지정) */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-28 space-y-6">
        
        {/* TAB 1: 홈 (오늘의 말씀) */}
        {activeTab === "home" && (
          <section id="tab-home" className="space-y-6 animate-fade-in max-w-2xl mx-auto py-4">
            {/* 오늘의 말씀 카드 */}
            <div className={`rounded-[32px] p-6 sm:p-8 border shadow-sm space-y-6 transition-all duration-300 relative overflow-hidden ${
              isNightMode 
                ? "bg-[#091b22]/80 border-teal-500/10 text-teal-100 shadow-[0_15px_30px_rgba(0,0,0,0.4)]" 
                : "bg-white border-[#e2eff3] text-[#0d2a35] shadow-[0_15px_30px_rgba(0,122,135,0.04)]"
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 ${isNightMode ? "border-teal-500/10" : "border-[#e2eff3]"}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007A87] animate-pulse" />
                  <span className={`text-xs font-bold uppercase tracking-wider font-sans ${isNightMode ? "text-teal-400" : "text-[#007A87]"}`}>Today's Wisdom</span>
                </div>
                <span className={`text-xs font-semibold ${isNightMode ? "text-[#5e818f]" : "text-stone-400"}`}>
                  {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                </span>
              </div>

              <div className="py-8 text-center space-y-6 relative">
                <span className="text-7xl text-[#007A87]/15 font-serif absolute -top-4 left-1/2 -translate-x-1/2 select-none font-bold">“</span>
                <p className={`text-lg sm:text-xl font-serif leading-relaxed max-w-xl mx-auto px-4 italic font-semibold relative z-10 ${isNightMode ? "text-teal-100" : "text-[#0d2a35]"}`}>
                  {dailyVerse.quote || "고민을 이야기하시면 그에 어울리는 구절을 드립니다."}
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border relative z-10 ${
                  isNightMode 
                    ? "bg-[#122a33]/60 text-teal-300 border-teal-500/10" 
                    : "bg-[#007A87]/5 text-[#007A87] border-[#007A87]/10 font-bold"
                }`}>
                  <BookOpen className="w-3.5 h-3.5 text-[#007A87]" />
                  <span>{dailyVerse.citation || "로딩 중..."}</span>
                </div>
              </div>

              <div className={`pt-4 border-t flex w-full gap-3 ${isNightMode ? "border-teal-500/10" : "border-[#e2eff3]"}`}>
                <button
                  onClick={() => handleShareText(dailyVerse.quote, dailyVerse.citation)}
                  className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 text-sm font-semibold ${
                    isNightMode 
                      ? "border-[#122a33] bg-[#122a33] hover:bg-[#122a33]/85 text-teal-200" 
                      : "border-[#e2eff3] bg-white hover:bg-stone-50 text-stone-600 shadow-sm"
                  }`}
                  title="나누기"
                  id="daily-share-btn"
                >
                  <Share2 className="w-4 h-4" />
                  <span>나누기</span>
                </button>
                <button
                  onClick={handleSaveDailyVerse}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#007A87] hover:bg-[#00616b] text-white transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-teal-500/10"
                  title="주신말씀 저장"
                  id="daily-save-btn"
                >
                  <Bookmark className="w-4 h-4 fill-white" />
                  <span>주신말씀 저장</span>
                </button>
              </div>
            </div>

            {/* 나의 여정 진행 상황 (어플 진행상황 대시보드) */}
            <div className={`rounded-[32px] p-6 border shadow-sm space-y-5 transition-all duration-300 relative overflow-hidden ${
              isNightMode 
                ? "bg-[#091b22]/80 border-teal-500/10 text-teal-100 shadow-[0_15px_30px_rgba(0,0,0,0.4)]" 
                : "bg-white border-[#e2eff3] text-[#0d2a35] shadow-[0_15px_30px_rgba(0,122,135,0.04)]"
            }`}>
              <div className={`flex items-center justify-between border-b pb-3.5 ${isNightMode ? "border-teal-500/10" : "border-[#e2eff3]"}`}>
                <div className="flex items-center gap-2">
                  <Award className={`w-4.5 h-4.5 ${isNightMode ? "text-teal-400" : "text-[#007A87]"}`} />
                  <span className={`text-sm font-bold ${isNightMode ? "text-teal-300" : "text-[#0d2a35]"}`}>나의 말씀 동행 진행 상황</span>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isNightMode ? "bg-teal-500/10 text-teal-300" : "bg-[#007A87]/5 text-[#007A87]"}`}>
                  동행 기록실 🕊️
                </span>
              </div>

              {/* 그리드 대시보드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. 성경묵상 챌린지 */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isNightMode ? "bg-[#122a33]/40 border-teal-900/20" : "bg-[#f4fafb] border-[#e2eff3]"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <span>🔥</span> 성경묵상 챌린지
                    </span>
                    {currentChallenge && (
                      <span className={`text-[10px] font-bold ${isNightMode ? "text-teal-400" : "text-[#007A87]"}`}>
                        진행 중
                      </span>
                    )}
                  </div>
                  {currentChallenge ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] text-stone-500 font-semibold">
                        <span>{currentChallenge.days}일 여정</span>
                        <span>{currentChallenge.checkedDates.length} / {currentChallenge.days}일 ({Math.round((currentChallenge.checkedDates.length / currentChallenge.days) * 100)}%)</span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isNightMode ? "bg-[#051116]" : "bg-stone-200"}`}>
                        <div 
                          className="h-full rounded-full bg-[#007A87] transition-all duration-500"
                          style={{ width: `${Math.min(100, (currentChallenge.checkedDates.length / currentChallenge.days) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[11px] text-stone-400 font-medium">현재 도전 중인 챌린지가 없습니다.</span>
                      <button 
                        onClick={() => setActiveTab("meditation")}
                        className="text-[11px] font-bold text-[#007A87] hover:underline flex items-center gap-0.5"
                      >
                        새 챌린지 시작하기 ➔
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. 말씀 보관함 */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isNightMode ? "bg-[#122a33]/40 border-teal-900/20" : "bg-[#f4fafb] border-[#e2eff3]"
                }`}>
                  <span className="text-xs font-bold block mb-1">📖 저장된 성경 말씀</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className={`text-lg font-extrabold ${isNightMode ? "text-teal-300" : "text-[#007A87]"}`}>
                      {savedVerses.length} <span className="text-xs font-semibold text-stone-500">구절</span>
                    </span>
                    <button 
                      onClick={() => setActiveTab("saved")}
                      className="text-[11px] font-bold text-[#007A87] hover:underline"
                    >
                      보관함 가기 ➔
                    </button>
                  </div>
                </div>

                {/* 3. 나의 묵상 노트 */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isNightMode ? "bg-[#122a33]/40 border-teal-900/20" : "bg-[#f4fafb] border-[#e2eff3]"
                }`}>
                  <span className="text-xs font-bold block mb-1">✍️ 작성된 묵상 노트</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className={`text-lg font-extrabold ${isNightMode ? "text-teal-300" : "text-[#007A87]"}`}>
                      {meditationNotes.length} <span className="text-xs font-semibold text-stone-500">개</span>
                    </span>
                    <button 
                      onClick={() => setActiveTab("meditation")}
                      className="text-[11px] font-bold text-[#007A87] hover:underline"
                    >
                      묵상록 보기 ➔
                    </button>
                  </div>
                </div>

                {/* 4. 해금된 배지 */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isNightMode ? "bg-[#122a33]/40 border-teal-900/20" : "bg-[#f4fafb] border-[#e2eff3]"
                }`}>
                  <span className="text-xs font-bold block mb-1">🏆 획득한 은혜 배지</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className={`text-lg font-extrabold ${isNightMode ? "text-teal-300" : "text-[#007A87]"}`}>
                      {unlockedBadges.length} <span className="text-xs font-semibold text-stone-500">개</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium font-sans">
                      {unlockedBadges.length > 0 ? "성실히 걸어가고 계십니다! 🎉" : "첫 배지에 도전해보세요!"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 이용 정보 및 정책 정보 */}
            <div className="text-center text-[10px] text-stone-400 py-6 mt-4 border-t border-stone-200/20 max-w-xl mx-auto">
              <p className="font-bold">바이블 터치(Bible Touch) v1.0.0</p>
            </div>
          </section>
        )}

        {/* TAB 2: 말씀채팅 (상담방) */}
        {activeTab === "recommend" && (
          <section id="tab-recommend" className="flex flex-col h-[580px] sm:h-[620px] animate-fade-in -mx-4 -my-6">
            {/* 말씀채팅 상태바 및 대화 비우기 단추 */}
            <div className={`p-3 px-4 border-b flex items-center justify-between z-10 sticky top-0 backdrop-blur-md ${isNightMode ? "bg-[#091b22]/95 border-teal-500/10" : "bg-white/95 border-[#e2eff3]"}`}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-sm ${isNightMode ? "bg-[#122a33] border-teal-900/30" : "bg-[#007A87]/10 border-teal-200"}`}>
                    <BookOpen className={`w-4.5 h-4.5 ${isNightMode ? "text-teal-300 fill-[#091b22]" : "text-[#007A87] fill-white"}`} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-inherit rounded-full animate-pulse" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-xs font-bold flex items-center gap-1">
                    <span>말씀채팅</span>
                    <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">온라인</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* 성경 번역본 선택기 */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-850 p-0.5 rounded-xl border border-stone-200/40 dark:border-teal-900/20 mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBibleVersion("개역개정");
                      triggerAlert("성경 번역본을 '개역개정'으로 선택하셨습니다. 📖");
                    }}
                    className={`text-[9px] font-extrabold px-2 py-1 rounded-lg transition-all ${
                      bibleVersion === "개역개정"
                        ? "bg-[#007A87] text-white shadow-sm"
                        : "text-stone-500 dark:text-teal-400 hover:text-stone-800"
                    }`}
                  >
                    개역
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBibleVersion("새번역");
                      triggerAlert("성경 번역본을 '새번역'으로 선택하셨습니다. 📖");
                    }}
                    className={`text-[9px] font-extrabold px-2 py-1 rounded-lg transition-all ${
                      bibleVersion === "새번역"
                        ? "bg-[#007A87] text-white shadow-sm"
                        : "text-stone-500 dark:text-teal-400 hover:text-stone-800"
                    }`}
                  >
                    새번역
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("지금까지의 말씀 채팅 기록을 모두 비우고 새로 시작하시겠습니까?")) {
                      const defaultMsg = [
                        {
                          id: "welcome",
                          sender: "bot" as const,
                          text: "당신의 이야기를 나눠주세요!\n성경 말씀으로 함께 대화해 드립니다",
                          timestamp: "오전 09:41"
                        }
                      ];
                      setChatMessages(defaultMsg);
                      localStorage.setItem("mw_chat_messages", JSON.stringify(defaultMsg));
                      triggerAlert("말씀 채팅방이 깨끗이 청소되었습니다. 🧹");
                    }
                  }}
                  className={`p-2 rounded-xl border transition-all ${isNightMode ? "bg-[#122a33] border-teal-900/30 text-teal-400 hover:bg-[#122a33]/80 hover:text-teal-200" : "bg-white border-[#e2eff3] text-stone-500 hover:bg-stone-50 hover:text-stone-750"}`}
                  title="대화 비우기"
                  id="header-clear-chat-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 대화 스레드 영역 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
              {chatMessages.map((msg) => {
                const isBot = msg.sender === "bot";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isBot ? "items-start" : "items-end"} space-y-1 animate-fade-in`}
                  >
                    {/* 메시지 발신인 */}
                    <span className="text-[8px] text-stone-400 font-medium px-1 select-none">
                      {isBot ? "말씀채팅" : "나의 고민"} • {msg.timestamp || "전송 중"}
                    </span>

                    {/* 메시지 내용 버블 */}
                    <div className="max-w-[90%] space-y-3">
                      {/* 1. 일반 텍스트 메시지 */}
                      {msg.text && (
                        <div
                          className={`p-3.5 rounded-2xl text-[11px] leading-relaxed font-semibold shadow-sm ${
                            isBot
                              ? isNightMode
                                ? "bg-[#122a33] text-teal-100 rounded-tl-none border border-teal-500/10"
                                : "bg-white text-[#0d2a35] rounded-tl-none border border-[#e2eff3]"
                              : isNightMode
                                ? "bg-[#007A87]/20 text-teal-200 rounded-tr-none border border-[#007A87]/30"
                                : "bg-[#007A87] text-white rounded-tr-none shadow-sm whitespace-pre-wrap"
                          }`}
                        >
                          {isBot ? (
                            <div 
                              className="space-y-1 chat-html-content"
                              dangerouslySetInnerHTML={{ __html: msg.text }}
                            />
                          ) : (
                            <div>{msg.text}</div>
                          )}
                          
                          {/* 로딩 인디케이터 */}
                          {msg.isLoading && (
                            <div className="flex items-center gap-1 mt-2 text-[#007A87] font-semibold animate-pulse text-[9px]">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>말씀 보따리를 살펴보고 주님의 구절을 고르고 있습니다...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 봇 메시지에 성경 구절이 포함되어 있는 경우 보조 도구 모음 출력 */}
                      {isBot && msg.text && extractVerseFromHtml(msg.text) && (
                        (() => {
                          const extracted = extractVerseFromHtml(msg.text)!;
                          const isSaved = savedVerses.some(item => 
                            item.result.recommendations.some(rec => rec.quote === extracted.quote)
                          );
                          return (
                            <div className="flex flex-wrap gap-1.5 pt-1 select-none justify-start">
                              <button
                                onClick={() => handleCopyToClipboard(`${extracted.quote} — ${extracted.citation}`, 999)}
                                className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-xl border transition-all ${
                                  isNightMode 
                                    ? "bg-[#122a33] border-teal-900/30 text-teal-300 hover:bg-[#122a33]/80" 
                                    : "bg-white border-[#e2eff3] text-stone-500 hover:bg-stone-50 font-bold shadow-sm"
                                }`}
                                title="구절 복사"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>구절 복사</span>
                              </button>
                              <button
                                onClick={() => handleShareText(extracted.quote, extracted.citation)}
                                className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-xl border transition-all ${
                                  isNightMode 
                                    ? "bg-[#122a33] border-teal-900/30 text-teal-300 hover:bg-[#122a33]/80" 
                                    : "bg-white border-[#e2eff3] text-stone-500 hover:bg-stone-50 font-bold shadow-sm"
                                }`}
                                title="공유"
                              >
                                <Share2 className="w-2.5 h-2.5" />
                                <span>공유</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (isSaved) {
                                    triggerAlert("이미 보관함에 저장되어 있는 구절입니다. ✨");
                                    return;
                                  }
                                  const todayStr = new Date().toLocaleDateString("ko-KR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  });
                                  const mockResult: WorryResult = {
                                    worryAnalysis: "말씀채팅을 통해 인도해주신 아름다운 주님의 구절을 마음 깊이 간직합니다.",
                                    recommendations: [{
                                      source: extracted.source,
                                      citation: extracted.citation,
                                      quote: extracted.quote,
                                      meaning: "이 성경 구절은 지치고 어려운 순간 우리를 향한 주님의 깊은 자비와 은혜의 조명입니다.",
                                      application: "이 구절을 지침 삼아 주님께 조용히 기도로 나아가며 마음의 짐을 내려놓아 보시기 바랍니다."
                                    }],
                                    comfortingMessage: "주님께서 항상 곁에서 평온과 안식으로 지켜주심을 믿으며 나아갑니다.",
                                    recommendedActions: ["말씀 구절을 마음에 되새기며 3회 천천히 호흡하기"]
                                  };
                                  const newItem: HistoryItem = {
                                    id: "rec-" + Date.now(),
                                    timestamp: todayStr,
                                    worry: "말씀채팅 구절",
                                    tone: selectedTone,
                                    sources: ["성경 말씀"],
                                    result: mockResult
                                  };
                                  setSavedVerses(prev => [newItem, ...prev]);
                                  triggerAlert("성경 구절을 보관함(주신말씀)에 저장했습니다! 🕊️");
                                }}
                                className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-xl transition-all font-bold ${
                                  isSaved 
                                    ? "bg-stone-100 dark:bg-stone-850 text-stone-400 cursor-not-allowed border border-stone-200"
                                    : "bg-[#007A87] text-white hover:bg-[#00616b] shadow-sm"
                                }`}
                                title="보관함 저장"
                              >
                                <Bookmark className={`w-2.5 h-2.5 ${isSaved ? "fill-stone-400 text-stone-400" : "fill-white text-white"}`} />
                                <span>{isSaved ? "저장됨" : "보관함 저장"}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVerseForMed({
                                    source: extracted.source,
                                    citation: extracted.citation,
                                    quote: extracted.quote,
                                    meaning: "이 성경 구절은 지치고 어려운 순간 우리를 향한 주님의 깊은 자비와 은혜의 조명입니다.",
                                    application: "이 구절을 지침 삼아 주님께 조용히 기도로 나아가며 마음의 짐을 내려놓아 보시기 바랍니다."
                                  });
                                  setActiveTab("meditation");
                                  triggerAlert(`[${extracted.citation}] 구절로 바로 묵상을 작성해 보세요!`);
                                }}
                                className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all`}
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>묵상하기</span>
                              </button>
                            </div>
                          );
                        })()
                      )}

                      {/* 2. 처방 결과 리치 메시지 카드 */}
                      {msg.result && (
                        <div className="space-y-3">
                          {/* (A) 가슴 따뜻한 공감 분석 */}
                          <div className={`p-3.5 rounded-2xl border text-[11px] leading-relaxed font-semibold shadow-inner ${isNightMode ? "bg-[#007A87]/5 border-teal-500/15 text-teal-200" : "bg-[#e6f4f8] border-[#cbe6ed] text-[#00616b]"}`}>
                            <div className="flex items-center gap-1 mb-1 text-[9px] uppercase tracking-wider font-bold text-[#007A87]">
                              <Heart className="w-3 h-3 fill-current animate-pulse" />
                              <span>바이블 터치</span>
                            </div>
                            "{msg.result.worryAnalysis}"
                          </div>

                          {/* (B) 처방 말씀 구절 목록 */}
                          {msg.result.recommendations.map((rec, rIdx) => (
                            <div
                              key={rIdx}
                              className={`rounded-2xl p-3.5 border shadow-sm space-y-3 transition-all ${
                                isNightMode
                                  ? "bg-[#091b22]/90 border-teal-500/10"
                                  : "bg-white border-[#e2eff3] hover:border-[#007A87]/30"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full border ${isNightMode ? "bg-[#122a33] border-teal-900/30 text-teal-300" : "bg-[#007A87]/10 border-[#007A87]/20 text-[#007A87]"}`}>
                                  {rec.source}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleCopyToClipboard(rec.quote, rIdx)}
                                    className="p-1 rounded hover:bg-stone-100/10 text-stone-400 hover:text-stone-600 transition-all"
                                    title="복사"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleShareText(rec.quote, rec.citation)}
                                    className="p-1 rounded hover:bg-stone-100/10 text-stone-400 hover:text-stone-600 transition-all"
                                    title="공유"
                                  >
                                    <Share2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="text-center py-1">
                                <p className="text-xs sm:text-sm font-serif italic text-[#007A87] font-bold leading-relaxed">
                                  “{rec.quote}”
                                </p>
                                <p className="text-[9px] text-stone-400 text-right mt-1.5">— {rec.citation}</p>
                              </div>

                              {/* 상세 풀이 */}
                              <div className="space-y-1.5 pt-2 border-t border-stone-200/10 text-[10px] leading-relaxed">
                                <div className={`p-2 rounded-xl border border-stone-200/5 ${isNightMode ? "bg-[#122a33]/40" : "bg-[#f0f7f9]"}`}>
                                  <span className="font-bold text-[#007A87] block mb-0.5">📖 말씀 속에 담긴 주님의 위로</span>
                                  <span className={isNightMode ? "text-stone-300" : "text-stone-600 font-medium"}>{rec.meaning}</span>
                                </div>
                                <div className={`p-2 rounded-xl border border-stone-200/5 ${isNightMode ? "bg-[#007A87]/10" : "bg-[#e6f4f8]"}`}>
                                  <span className="font-bold text-[#007A87] block mb-0.5">💡 나의 삶에 이렇게 적용하기</span>
                                  <span className={isNightMode ? "text-stone-300" : "text-stone-600 font-medium"}>{rec.application}</span>
                                </div>
                              </div>

                              {/* 즉시 묵상 작성 단추 */}
                              <div className="text-right pt-0.5">
                                <button
                                  onClick={() => {
                                    setSelectedVerseForMed(rec);
                                    setActiveTab("meditation");
                                    triggerAlert(`[${rec.citation}] 구절로 바로 묵상을 작성해 보세요!`);
                                  }}
                                  className="inline-flex items-center gap-1 bg-[#007A87] hover:bg-[#00616b] text-white text-[9px] px-2.5 py-1 rounded-xl transition-all font-bold shadow-md shadow-teal-500/10"
                                >
                                  <BookOpen className="w-2.5 h-2.5" />
                                  <span>이 말씀으로 묵상하기</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* (C) 정성어린 상담원의 편지 */}
                          <div className={`p-3.5 rounded-2xl shadow-sm text-[11px] border leading-relaxed ${isNightMode ? "bg-[#122a33] border-teal-500/10 text-teal-300" : "bg-stone-800 border-stone-900 text-stone-100"}`}>
                            <span className="text-teal-400 font-serif italic text-sm block mb-0.5">Sincerely,</span>
                            <p className="italic">"{msg.result.comfortingMessage}"</p>
                          </div>

                          {/* (D) 행동 처방 */}
                          <div className={`p-3.5 rounded-2xl border text-[11px] space-y-2 ${isNightMode ? "bg-[#091b22]/30 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
                            <h4 className="text-[9px] font-bold text-[#007A87] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>오늘 당장 실천해볼 가벼운 마음 행동</span>
                            </h4>
                            <ul className="space-y-1">
                              {msg.result.recommendedActions.map((action, actIdx) => (
                                <li key={actIdx} className={`text-[10px] p-1.5 rounded-lg flex items-start gap-1.5 ${isNightMode ? "bg-[#122a33]/40 text-teal-200" : "bg-[#f0f7f9] text-stone-700 font-medium"}`}>
                                  <span className="bg-[#007A87]/15 text-[#007A87] text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black flex-shrink-0">
                                    {actIdx + 1}
                                  </span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* 스크롤 하단 타겟 레프 */}
              <div ref={chatEndRef} />
            </div>

            {/* 빠른 추천 말풍선 프리셋 주입 영역 */}
            <div className={`p-2 overflow-x-auto flex items-center gap-1.5 whitespace-nowrap select-none scrollbar-none ${isNightMode ? "bg-[#051116]/80 border-teal-500/10" : "bg-[#f0f7f9] border-[#e2eff3]"}`}>
              <button
                type="button"
                onClick={refreshRecommendedQuestions}
                className={`p-1.5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                  isNightMode
                    ? "bg-[#122a33] border-teal-900/30 text-teal-300 hover:bg-[#122a33]/80"
                    : "bg-white border-[#e2eff3] text-[#007A87] hover:bg-stone-50 shadow-sm"
                }`}
                title="추천 질문 새로고침"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              {recommendedPresets.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendChatMessage(preset.text)}
                  className={`text-[9px] px-2.5 py-1.5 rounded-xl border transition-all ${
                    isNightMode 
                      ? "bg-[#122a33] border-teal-900/30 text-teal-300 hover:bg-[#122a33]/80" 
                      : "bg-white border-[#e2eff3] text-stone-600 hover:bg-[#007A87]/5 hover:text-[#007A87] font-semibold shadow-sm"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 채팅 전송 입력 폼 핀 고정 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className={`p-2.5 border-t flex gap-1.5 items-center ${isNightMode ? "bg-[#091b22] border-teal-500/10" : "bg-white border-[#e2eff3]"}`}
            >
              <input
                type="text"
                value={worryInput}
                onChange={(e) => setWorryInput(e.target.value)}
                placeholder={isLoading ? "성경 말씀을 고르는 중..." : "고민이나 마음에 고인 생각들을 편하게 말씀해 주세요..."}
                disabled={isLoading}
                className={`flex-1 rounded-2xl px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 transition-all border ${
                  isNightMode 
                    ? "bg-[#122a33] border-teal-900/30 text-teal-100 placeholder-teal-600" 
                    : "bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400"
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !worryInput.trim()}
                className={`p-2 rounded-2xl text-white transition-all shadow-md flex items-center justify-center ${
                  isLoading || !worryInput.trim()
                    ? "bg-stone-200 dark:bg-stone-850 text-stone-500 cursor-not-allowed"
                    : "bg-[#007A87] hover:bg-[#00616b] shadow-teal-500/10"
                }`}
                title="전송"
                id="chat-send-btn"
              >
                <Send className="w-3.5 h-3.5 fill-current" />
              </button>
            </form>
          </section>
        )}

        {/* TAB 3: 보관함 (주신말씀) */}
        {activeTab === "saved" && (
          <section id="tab-saved" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-800">주신말씀 ({savedVerses.length}개)</h2>
              </div>
            </div>

            {savedVerses.length === 0 ? (
              <div className={`text-center py-16 border rounded-3xl space-y-4 ${isNightMode ? "bg-[#091b22]/40 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
                <span className="text-4xl text-stone-300 block animate-bounce">📖</span>
                <p className="text-sm text-stone-500 font-semibold">저장된 말씀이 아직 없습니다.</p>
                <button
                  onClick={() => {
                    setActiveTab("recommend");
                  }}
                  className="bg-[#007A87] hover:bg-[#00616b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-teal-500/10"
                >
                  새 말씀 추천 받으러 가기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4" id="saved-list">
                {savedVerses.map((item) => (
                  <div key={item.id} className={`border rounded-[24px] p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 ${isNightMode ? "bg-[#091b22]/80 border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35] hover:border-[#007A87]/30"}`}>
                    {item.result.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 text-[9px] rounded-full border font-bold ${isNightMode ? "bg-[#122a33] border-teal-900/30 text-teal-300" : "bg-[#007A87]/10 border-[#007A87]/15 text-[#007A87]"}`}>
                            {rec.source}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono font-medium">{item.timestamp}</span>
                        </div>

                        <div className="py-2">
                          <p className="text-base font-serif italic text-[#007A87] leading-relaxed font-bold">
                            “{rec.quote}”
                          </p>
                          <p className="text-xs text-stone-500 text-right mt-1 font-semibold">— {rec.citation}</p>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl border ${isNightMode ? "bg-[#122a33]/20 border-teal-900/20" : "bg-[#f0f7f9] border-[#e2eff3]"}`}>
                          <p className="text-stone-600 leading-relaxed font-medium"><span className="font-bold text-[#007A87]">해설:</span> {rec.meaning}</p>
                          <p className="text-stone-600 leading-relaxed font-medium"><span className="font-bold text-[#007A87]">실천:</span> {rec.application}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-xs border-t border-stone-200/5">
                          <button
                            onClick={() => {
                              setSelectedVerseForMed(rec);
                              setActiveTab("meditation");
                              triggerAlert(`[${rec.citation}] 구절로 묵상을 작성합니다.`);
                            }}
                            className="text-[#007A87] hover:text-[#00616b] font-bold flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>이 말씀 묵상일기 쓰기</span>
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleShareText(rec.quote, rec.citation)}
                              className="text-stone-500 hover:text-stone-800 px-2.5 py-1 hover:bg-stone-100/50 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>나누기</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSavedItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 px-2.5 py-1 hover:bg-rose-50/50 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: 묵상 & 챌린지 (🌱) */}
        {activeTab === "meditation" && (
          <section id="tab-meditation" className="space-y-6 animate-fade-in">
            {/* 챌린지 성공 현황 대시보드 */}
            <div className={`rounded-[32px] p-6 shadow-lg space-y-4 relative overflow-hidden transition-all ${isNightMode ? "bg-[#091b22] border border-teal-500/10 text-teal-100" : "bg-[#007A87] text-white shadow-teal-500/10"}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isNightMode ? "border-teal-500/10" : "border-white/10"}`}>
                <div>
                  <h3 className={`text-base font-serif font-bold flex items-center gap-1.5 ${isNightMode ? "text-teal-300" : "text-white"}`}>
                    <Award className={`w-5 h-5 ${isNightMode ? "text-teal-400 fill-teal-400/20" : "text-white fill-white/20"}`} />
                    <span>성경묵상 챌린지 여정</span>
                  </h3>
                </div>
                {!currentChallenge ? (
                  <button
                    onClick={() => setShowChallengeModal(true)}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all ${isNightMode ? "bg-[#007A87] hover:bg-[#00616b] text-white" : "bg-white hover:bg-teal-50 text-[#007A87]"}`}
                    id="challenge-start-btn"
                  >
                    🔥 챌린지 시작하기
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {isResetConfirming ? (
                      <>
                        <button
                          onClick={handleResetChallenge}
                          className="text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm"
                        >
                          정말 초기화
                        </button>
                        <button
                          onClick={() => setIsResetConfirming(false)}
                          className={`text-[11px] font-medium px-2 py-1.5 rounded-xl transition-all ${isNightMode ? "text-stone-300 hover:text-white hover:bg-white/5" : "text-teal-100 hover:text-white hover:bg-white/10"}`}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsResetConfirming(true)}
                        className={`text-xs flex items-center gap-1 ${isNightMode ? "text-[#5e818f] hover:text-stone-200" : "text-teal-100 hover:text-white"}`}
                        id="challenge-reset-btn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>진행 초기화</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {currentChallenge ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🗓️</span>
                      <span>{currentChallenge.days}일 여정 ({currentChallenge.startDate} 시작)</span>
                    </div>
                    <span className={isNightMode ? "text-teal-300" : "text-teal-100"}>
                      진행도: {currentChallenge.checkedDates.length} / {currentChallenge.days}일 
                      ({Math.round((currentChallenge.checkedDates.length / currentChallenge.days) * 100)}%)
                    </span>
                  </div>

                  {/* 게이지 바 */}
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${isNightMode ? "bg-[#122a33]" : "bg-[#00616b]"}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isNightMode ? "bg-[#007A87]" : "bg-white"}`}
                      style={{ width: `${Math.min(100, (currentChallenge.checkedDates.length / currentChallenge.days) * 100)}%` }}
                    />
                  </div>

                  {/* 가상 캘린더 스탬프 */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Array.from({ length: currentChallenge.days }).map((_, idx) => {
                      const isStamped = idx < currentChallenge.checkedDates.length;
                      return (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-mono font-bold ${
                            isStamped 
                              ? isNightMode 
                                ? "bg-[#007A87] border-[#007A87] text-white shadow-sm" 
                                : "bg-white border-white text-[#007A87] shadow-md" 
                              : isNightMode 
                                ? "border-teal-850 bg-[#122a33]/40 text-[#5e818f]" 
                                : "border-teal-400/50 bg-[#00616b]/40 text-teal-100"
                          }`}
                          title={isStamped ? "묵상 완수" : "대기 중"}
                        >
                          {isStamped ? "✓" : idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`py-2 text-center text-xs leading-relaxed ${isNightMode ? "text-[#5e818f]" : "text-teal-100/70"}`}>
                  현재 진행 중인 연속 챌린지가 없습니다. 꾸준한 마음 정진을 위해 연속 챌린지를 시작해 보세요. 🌱
                </div>
              )}

              {/* 획득한 배지 목록 */}
              <div className={`pt-3 border-t ${isNightMode ? "border-teal-500/10" : "border-white/10"}`}>
                <span className={`text-xs font-bold block mb-2 ${isNightMode ? "text-teal-400" : "text-teal-100"}`}>🏆 해금된 나의 배지 함</span>
                {unlockedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {unlockedBadges.map((badge, bIdx) => (
                      <div key={bIdx} className={`rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs border ${isNightMode ? "bg-[#122a33]/60 border-teal-900/30 text-teal-200" : "bg-white/10 border-white/15 text-white"}`}>
                        <span className="text-base">{badge.emoji}</span>
                        <div>
                          <p className="font-bold text-[11px]">{badge.name}</p>
                          <p className={`text-[9px] ${isNightMode ? "text-[#5e818f]" : "text-teal-100"}`}>{badge.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-[10px] ${isNightMode ? "text-[#5e818f]" : "text-teal-100/60"}`}>아직 달성한 챌린지 배지가 없습니다. 오늘부터 첫걸음을 떼어 보세요!</p>
                )}
              </div>
            </div>

            {/* 묵상 작성 / 조회 컨트롤 */}
            {selectedVerseForMed ? (
              // 묵상 작성 양식
              <div id="med-form" className={`border rounded-[32px] p-5 sm:p-6 space-y-5 animate-fade-in ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35] shadow-[0_15px_30px_rgba(0,122,135,0.03)]"}`}>
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#007A87]" />
                    <span>말씀과 대화하는 묵상 기록방</span>
                  </h3>
                  <button 
                    onClick={() => {
                      setSelectedVerseForMed(null);
                      setMedAnswers(["", "", ""]);
                    }}
                    className="text-stone-400 hover:text-stone-600 text-xs"
                    id="med-form-cancel"
                  >
                    취소
                  </button>
                </div>

                {/* 선택된 구절 정보 */}
                <div className={`rounded-2xl p-4 text-center space-y-2 border ${isNightMode ? "bg-[#122a33]/40 border-teal-900/30" : "bg-[#f0f7f9] border-[#e2eff3]"}`}>
                  <p className="text-base font-serif italic text-[#007A87] font-bold leading-relaxed">
                    “{selectedVerseForMed.quote}”
                  </p>
                  <p className="text-xs text-stone-500">— {selectedVerseForMed.citation} ({selectedVerseForMed.source})</p>
                </div>

                {/* 📝 묵상 질문 헤더 */}
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="text-xs font-bold text-[#007A87] flex items-center gap-1">
                    <span>📝</span> <span>묵상 질문</span>
                  </span>
                </div>

                {/* 질문 목록 */}
                <div className="space-y-4">
                  {[
                    "Q1. 이 말씀에서 하나님은 나에게 무엇을 말씀하시나요?",
                    "Q2. 오늘 나의 상황에 이 말씀을 어떻게 적용할 수 있을까요?",
                    "Q3. 이 말씀대로 살기 위해 오늘 한 가지 실천할 것은 무엇인가요?"
                  ].map((q, idx) => (
                    <div 
                      key={idx} 
                      className={`rounded-2xl border p-5 shadow-sm space-y-3 ${
                        isNightMode 
                          ? "bg-[#122a33]/40 border-teal-900/20" 
                          : "bg-white border-[#e2eff3]"
                      }`}
                    >
                      <label className={`block text-xs font-bold leading-relaxed ${isNightMode ? "text-teal-300" : "text-[#007A87]"}`}>
                        {q}
                      </label>
                      <textarea
                        value={medAnswers[idx]}
                        onChange={(e) => {
                          const updated = [...medAnswers];
                          updated[idx] = e.target.value;
                          setMedAnswers(updated);
                        }}
                        placeholder="여기에 묵상 내용을 적어주세요..."
                        rows={3}
                        className={`w-full rounded-xl p-3 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 focus:border-[#007A87] transition-all border ${
                          isNightMode
                            ? "bg-[#051116] border-teal-900/30 text-teal-100 placeholder-teal-600"
                            : "bg-stone-50 border-stone-200 text-[#0d2a35]"
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedVerseForMed(null);
                      setMedAnswers(["", "", ""]);
                    }}
                    className="flex-1 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold py-3 rounded-xl transition-all"
                  >
                    다음에 쓰기
                  </button>
                  <button
                    onClick={handleSaveMeditation}
                    className="flex-1 bg-[#007A87] hover:bg-[#00616b] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-1.5"
                    id="med-save-submit"
                  >
                    <Check className="w-4 h-4" />
                    <span>오늘의 묵상 저장완료</span>
                  </button>
                </div>
              </div>
            ) : viewingMedNote ? (
              // 묵상 노트 상세 조회
              <div id="med-viewer" className={`border rounded-[32px] p-5 sm:p-6 space-y-5 animate-fade-in ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35] shadow-[0_15px_30px_rgba(0,122,135,0.03)]"}`}>
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewingMedNote(null)} className="p-1 hover:bg-stone-100 rounded-lg text-stone-500">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-[#007A87]">묵상 기록장</span>
                  </div>
                  <span className="text-xs text-stone-400 font-mono font-medium">{viewingMedNote.date}</span>
                </div>

                <div className={`rounded-2xl p-4 text-center space-y-2 border ${isNightMode ? "bg-[#122a33]/40 border-teal-900/30" : "bg-[#f0f7f9] border-[#e2eff3]"}`}>
                  <p className="text-base font-serif italic text-[#007A87] leading-relaxed font-bold">
                    “{viewingMedNote.quote}”
                  </p>
                  <p className="text-xs text-stone-500">— {viewingMedNote.citation} ({viewingMedNote.source})</p>
                </div>

                <div className="space-y-4">
                  {[
                    "Q1. 이 말씀에서 하나님은 나에게 무엇을 말씀하시나요?",
                    "Q2. 오늘 나의 상황에 이 말씀을 어떻게 적용할 수 있을까요?",
                    "Q3. 이 말씀대로 살기 위해 오늘 한 가지 실천할 것은 무엇인가요?"
                  ].map((q, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border text-xs space-y-1.5 ${isNightMode ? "bg-[#122a33]/30 border-teal-900/20" : "bg-[#f0f7f9] border-[#e2eff3]/60"}`}>
                      <span className="font-bold text-[#007A87] block leading-relaxed">{q}</span>
                      <p className="text-[#0d2a35] dark:text-teal-100 whitespace-pre-wrap leading-relaxed font-semibold">
                        {viewingMedNote.answers[idx] || "(답변을 남기지 않았습니다)"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const text = `[바이블 터치 묵상기록 - ${viewingMedNote.date}]\n\n"${viewingMedNote.quote}"\n— ${viewingMedNote.citation}\n\n● 생각과 성찰:\n${viewingMedNote.answers[0]}\n\n● 다짐 실천:\n${viewingMedNote.answers[2]}`;
                      navigator.clipboard.writeText(text);
                      triggerAlert("묵상 공유 텍스트가 클립보드에 깔끔하게 보관되었습니다! 📋");
                    }}
                    className="flex-1 bg-[#007A87] hover:bg-[#00616b] text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>묵상 내용 복사하여 공유하기</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("이 묵상 기록을 정말 영구 삭제하시겠습니까?")) {
                        setMeditationNotes(prev => prev.filter(n => n.id !== viewingMedNote.id));
                        setViewingMedNote(null);
                        triggerAlert("기록이 삭제되었습니다.");
                      }
                    }}
                    className="border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-semibold px-4 rounded-xl transition-all flex items-center justify-center"
                    title="기록 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // 묵상 리스트 화면
              <div className="space-y-6">
                {/* 묵상 가이드라인 */}
                <div className={`border rounded-[32px] p-5 shadow-sm space-y-4 ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
                  <div>
                    <h3 className="text-sm font-bold text-[#007A87]">📖 어떻게 묵상하나요?</h3>
                    <p className="text-xs text-stone-500 leading-relaxed mt-1 font-semibold">
                      보관해둔 소중한 구절 중 하나를 골라 아래의 '묵상하기'를 눌러 일기를 쓰듯 차분히 질문에 답해 보세요.
                    </p>
                  </div>

                  <div className="border-t border-stone-100 pt-3 space-y-2">
                    <span className="text-xs font-bold text-stone-600 block">묵상할 말씀 구절 선택</span>
                    {savedVerses.length === 0 ? (
                      <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                        저장된 말씀이 아직 없습니다. <br />
                        <button onClick={() => setActiveTab("recommend")} className="text-[#007A87] font-bold underline mt-1.5">
                          고민 말씀 처방방에서 말씀 처방받기
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2 border border-stone-100 p-2 rounded-xl bg-stone-50/50">
                        {savedVerses.map(item => {
                          const rec = item.result.recommendations[0];
                          const hasDone = meditationNotes.some(note => note.citation === rec.citation);
                          return (
                            <div 
                              key={item.id} 
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${isNightMode ? "bg-[#122a33] border-teal-900/30" : "bg-white border-[#e2eff3]"}`}
                            >
                              <div className="truncate flex-1">
                                <p className="font-serif italic text-stone-800 truncate">“{rec.quote}”</p>
                                <span className="text-[10px] text-stone-400 font-sans">— {rec.citation}</span>
                              </div>
                              <button
                                onClick={() => setSelectedVerseForMed(rec)}
                                className={`flex-shrink-0 px-3 py-1 rounded-xl text-[10px] font-bold ${hasDone ? "bg-stone-100 text-stone-400" : "bg-[#007A87] text-white shadow-sm"}`}
                              >
                                {hasDone ? "다시 묵상" : "묵상 쓰기"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 지난 나의 묵상 노트 리스트 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">나의 묵상 기록 보관소 ({meditationNotes.length}개)</h3>
                  {meditationNotes.length === 0 ? (
                    <div className={`border rounded-[32px] p-8 text-center text-xs text-stone-400 ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
                      아직 작성한 묵상 노트가 없습니다. <br />
                      위 구절을 선택하여 첫 묵상 일기를 채워보세요. 🕊️
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="meditation-notes-grid">
                      {meditationNotes.map(note => (
                        <div 
                          key={note.id} 
                          onClick={() => setViewingMedNote(note)}
                          className={`p-5 border rounded-[24px] cursor-pointer transition-all shadow-sm flex flex-col justify-between hover:scale-[1.01] duration-150 ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35] hover:border-[#007A87]/30"}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={`px-2 py-0.5 rounded-md border font-bold ${isNightMode ? "bg-[#122a33] border-teal-950/30 text-teal-300" : "bg-[#007A87]/10 border-[#007A87]/15 text-[#007A87]"}`}>
                                {note.source}
                              </span>
                              <span className="text-stone-400 font-mono font-medium">{note.date}</span>
                            </div>
                            <p className="text-sm font-serif italic text-[#007A87] font-bold line-clamp-2 leading-relaxed">
                              “{note.quote}”
                            </p>
                            <p className="text-[11px] text-stone-500 text-right font-medium">— {note.citation}</p>
                            
                            <p className={`text-xs line-clamp-2 p-2.5 rounded-xl border ${isNightMode ? "bg-[#122a33]/20 border-teal-900/10 text-[#5e818f]" : "bg-[#f0f7f9] border-[#e2eff3] text-stone-600"}`}>
                              {note.answers[0] || "작성된 성찰이 없습니다."}
                            </p>
                          </div>
                          
                          <div className={`mt-4 pt-2.5 border-t text-right text-[10px] font-bold flex items-center justify-end gap-1 ${isNightMode ? "border-teal-500/10 text-teal-300" : "border-stone-100 text-[#007A87]"}`}>
                            <span>자세히 보기</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: 설정 (settings) */}
        {activeTab === "settings" && (
          <section id="tab-settings" className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-800">설정</h2>
                <p className={`text-xs mt-1 ${isNightMode ? "text-[#5e818f]" : "text-stone-500"}`}>
                  바이블 터치와 마음 수련 환경을 나에게 맞춤화합니다.
                </p>
              </div>
            </div>

            {/* 👤 프로필/닉네임 설정 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <User className="w-4 h-4 text-[#007A87]" />
                <span>내 프로필 설정</span>
              </h3>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-500">묵상 기록 시 사용할 닉네임</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="닉네임을 입력하세요..."
                    maxLength={10}
                    className={`flex-1 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 focus:border-[#007A87] transition-all border ${
                      isNightMode
                        ? "bg-[#051116] border-teal-900/30 text-teal-100 placeholder-teal-600"
                        : "bg-stone-50 border-stone-200 text-[#0d2a35]"
                    }`}
                  />
                  <button
                    onClick={() => triggerAlert("닉네임이 성공적으로 변경되었습니다! 👤")}
                    className="px-4 py-2 bg-[#007A87] hover:bg-[#00616b] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 📖 성경 번역본 설정 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#007A87]" />
                <span>성경 번역본 선택</span>
              </h3>
              <p className="text-[11px] text-stone-500 leading-relaxed font-semibold">
                기본 성경 묵상 구절 및 대화에서 인용되는 하나님의 말씀 번역본을 선택합니다.
              </p>
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                {[
                  { id: "개역개정", label: "개역개정 (전통적 번역)", desc: "친숙하고 경건함이 묻어나는 장중한 번역" },
                  { id: "새번역", label: "새번역 (현대적 구어체)", desc: "이해하기 쉽고 직관적인 현대적 번역" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setBibleVersion(opt.id as "개역개정" | "새번역");
                      triggerAlert(`성경 번역본이 '${opt.id}'으로 변경되었습니다! 📖`);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all space-y-1.5 ${
                      bibleVersion === opt.id
                        ? "bg-[#007A87]/10 border-[#007A87] text-[#007A87] font-bold"
                        : isNightMode
                          ? "bg-[#122a33]/40 border-teal-900/30 text-teal-200 hover:bg-[#122a33]"
                          : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {bibleVersion === opt.id && <Check className="w-3.5 h-3.5 text-[#007A87]" />}
                    </div>
                    <span className="text-[9px] opacity-70 font-semibold leading-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 🌙 테마 설정 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#007A87]" />
                <span>야간 묵상 모드 설정</span>
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-stone-500 leading-relaxed font-semibold">
                    눈부심을 억제하고 고요하게 성찰할 수 있는 야간 모드입니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsNightMode(!isNightMode);
                    triggerAlert(isNightMode ? "눈부신 일상 모드로 돌아갑니다. ☀️" : "고요하고 아늑한 야간 묵상 모드가 켜졌습니다. 🌙");
                  }}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 relative focus:outline-none ${
                    isNightMode ? "bg-[#007A87]" : "bg-stone-300"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                      isNightMode ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  >
                    {isNightMode ? <Moon className="w-2.5 h-2.5 text-[#007A87]" /> : <Sun className="w-2.5 h-2.5 text-stone-400" />}
                  </div>
                </button>
              </div>
            </div>

            {/* ⚡ Upbit API 연동 설정 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#007A87]" />
                <span>Upbit 자동매매 연동</span>
              </h3>
              {upbitConnected ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold text-green-700">Upbit API 연동됨</span>
                    </div>
                    <button
                      onClick={() => {
                        setUpbitApiKey("");
                        setUpbitApiSecret("");
                        setUpbitConnected(false);
                        setUpbitTestResult(null);
                        localStorage.removeItem("mw_upbit_api_key");
                        localStorage.removeItem("mw_upbit_api_secret");
                        localStorage.removeItem("mw_upbit_connected");
                        triggerAlert("Upbit API 연동이 해제되었습니다. 🔌");
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      연동 해제
                    </button>
                  </div>
                  <p className="text-xs text-stone-500">자동매매 탭에서 설정을 완료한 후 거래를 시작할 수 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">API Key</label>
                    <input
                      type="password"
                      value={upbitApiKey}
                      onChange={(e) => setUpbitApiKey(e.target.value)}
                      placeholder="Upbit API Key를 입력하세요..."
                      className={`w-full rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 focus:border-[#007A87] transition-all border ${
                        isNightMode
                          ? "bg-[#051116] border-teal-900/30 text-teal-100 placeholder-teal-600"
                          : "bg-stone-50 border-stone-200 text-[#0d2a35]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">API Secret</label>
                    <div className="flex gap-2">
                      <input
                        type={showApiSecret ? "text" : "password"}
                        value={upbitApiSecret}
                        onChange={(e) => setUpbitApiSecret(e.target.value)}
                        placeholder="Upbit API Secret을 입력하세요..."
                        className={`flex-1 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 focus:border-[#007A87] transition-all border ${
                          isNightMode
                            ? "bg-[#051116] border-teal-900/30 text-teal-100 placeholder-teal-600"
                            : "bg-stone-50 border-stone-200 text-[#0d2a35]"
                        }`}
                      />
                      <button
                        onClick={() => setShowApiSecret(!showApiSecret)}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-all"
                      >
                        {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setUpbitTestLoading(true);
                        try {
                          // API 테스트
                          const res = await fetch("/api/trading/init", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              apiKey: upbitApiKey,
                              apiSecret: upbitApiSecret,
                              coins: ["BTC"],
                              positionSizePercent: 5,
                              stopLossPercent: 2,
                              takeProfitPercent: 5,
                              maxDailyLoss: 500000,
                            }),
                          });

                          if (res.ok) {
                            setUpbitConnected(true);
                            localStorage.setItem("mw_upbit_api_key", upbitApiKey);
                            localStorage.setItem("mw_upbit_api_secret", upbitApiSecret);
                            localStorage.setItem("mw_upbit_connected", "true");
                            setUpbitTestResult({ success: true, message: "API 연동에 성공했습니다! ✅" });
                            triggerAlert("Upbit API 연동이 완료되었습니다! 🎉");
                          } else {
                            const data = await res.json();
                            setUpbitTestResult({ success: false, message: data.error || "API 연동 실패" });
                          }
                        } catch (err: any) {
                          setUpbitTestResult({ success: false, message: err.message });
                        } finally {
                          setUpbitTestLoading(false);
                        }
                      }}
                      disabled={upbitTestLoading || !upbitApiKey || !upbitApiSecret}
                      className="flex-1 px-4 py-2 bg-[#007A87] hover:bg-[#00616b] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {upbitTestLoading ? "테스트 중..." : "연동하기"}
                    </button>
                  </div>
                  {upbitTestResult && (
                    <div className={`p-3 rounded-xl border text-xs font-bold ${
                      upbitTestResult.success
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      {upbitTestResult.message}
                    </div>
                  )}
                  <p className="text-xs text-stone-500">
                    💡 Upbit 거래소에서 API 키를 생성하세요.
                    <a href="https://upbit.com/service_center/open_api_guide" target="_blank" rel="noopener noreferrer" className="text-[#007A87] font-bold ml-1 inline-block">
                      가이드 보기 →
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* 🔔 알림 설정 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#007A87]" />
                <span>매일 묵상 리마인더</span>
              </h3>
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-600">리마인더 알림 활성화</span>
                <button
                  onClick={() => {
                    setAllNotifications(!allNotifications);
                    triggerAlert(allNotifications ? "리마인더 알림이 무음 처리되었습니다. 🔕" : "매일 평화로운 말씀 리마인더 알림이 활성화되었습니다. 🔔");
                  }}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 relative focus:outline-none ${
                    allNotifications ? "bg-[#007A87]" : "bg-stone-300"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      allNotifications ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {allNotifications && (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  {[
                    { id: "morning", label: "🌱 아침 말씀 소리 (새벽 기도)", val: morningTime, setVal: setMorningTime },
                    { id: "comfort", label: "☀️ 낮 지혜의 속삭임 (바쁜 일상)", val: comfortTime, setVal: setComfortTime },
                    { id: "review", label: "🌙 밤 하루 성찰 일기 (잠들기 전)", val: reviewTime, setVal: setReviewTime }
                  ].map((noti) => (
                    <div key={noti.id} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-500">{noti.label}</span>
                      <select
                        value={noti.val}
                        onChange={(e) => {
                          noti.setVal(e.target.value);
                          triggerAlert("알림 배송 예정 시간이 예약되었습니다. ⏰");
                        }}
                        className={`rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#007A87] border ${
                          isNightMode
                            ? "bg-[#122a33] border-teal-900/30 text-teal-100"
                            : "bg-white border-stone-200 text-[#0d2a35]"
                        }`}
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hourStr = String(h).padStart(2, "0");
                          return ["00", "30"].map((m) => {
                            const timeStr = `${hourStr}:${m}`;
                            return (
                              <option key={timeStr} value={timeStr}>
                                {timeStr}
                              </option>
                            );
                          });
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ⚙️ 시스템 및 앱 관리 */}
            <div className={`border rounded-[32px] p-5 sm:p-6 space-y-4 shadow-sm ${isNightMode ? "bg-[#091b22]/90 border-teal-500/10" : "bg-white border-[#e2eff3]"}`}>
              <h3 className="text-sm font-bold text-[#007A87] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#007A87]" />
                <span>데이터 및 의견 관리</span>
              </h3>
              <div className="space-y-3 pt-1">
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    isNightMode
                      ? "border-teal-900/40 bg-[#122a33] hover:bg-[#122a33]/80 text-teal-200"
                      : "border-[#e2eff3] bg-[#f0f7f9] hover:bg-[#e2eff3] text-[#007A87]"
                  }`}
                >
                  <span>📝 피드백 및 새로운 건의사항 전송</span>
                </button>
                <button
                  onClick={handleClearAllData}
                  className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-rose-200/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>⚠️ 내 데이터 초기화 (완전 삭제)</span>
                </button>
              </div>

              <div className="text-center pt-3 border-t border-stone-100 text-[10px] text-stone-400 font-mono font-bold leading-normal">
                BIBLE TOUCH v1.2.0 • 평온의 동반자 <br />
                <span className="opacity-70">© 2026 Bible Touch. All rights reserved.</span>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: 자동매매 (trading) */}
        {activeTab === "trading" && (
          <section id="tab-trading" className="animate-fade-in -mx-4 -my-6 p-4">
            <TradingDashboard />
          </section>
        )}

      </main>

      {/* 챌린지 시작 모달 오버레이 (스마트폰 내부에 absolute로 렌더링되게 하여 모바일 피트감 향상) */}
      {showChallengeModal && (
        <div id="challenge-select-modal" className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl border animate-fade-in ${isNightMode ? "bg-[#091b22] border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35]"}`}>
            <div className="text-center space-y-1.5">
              <span className="text-3xl block">🌱</span>
              <h4 className="text-sm font-serif font-bold">새 챌린지 선택하기</h4>
              <p className={`text-[11px] leading-relaxed ${isNightMode ? "text-[#5e818f]" : "text-stone-500"}`}>
                도달하고 싶은 목표 기간을 선택해 주세요. <br />
                매일 한 구절씩 정성껏 읽고 성찰을 채워나가며 배지를 모아보세요.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { days: 3, label: "첫걸음 챌린지 🌿", desc: "3일 연속 묵상 (새싹 배지)" },
                { days: 7, label: "일주일 챌린지 🔥", desc: "7일 연속 묵상 (불꽃 배지)" },
                { days: 30, label: "한달 여정 챌린지 ⭐", desc: "30일 연속 묵상 (별 배지)" },
                { days: 100, label: "마음의 거울 챌린지 👑", desc: "100일 연속 묵상 (왕관 배지)" }
              ].map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setSelectedChallengeDays(opt.days)}
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all text-xs ${
                    selectedChallengeDays === opt.days 
                      ? "bg-[#007A87]/10 border-[#007A87] text-[#007A87] font-bold" 
                      : isNightMode 
                        ? "bg-[#122a33]/40 border-teal-900/30 text-teal-200 hover:bg-[#122a33]" 
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100/50"
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{opt.desc}</p>
                  </div>
                  {selectedChallengeDays === opt.days && <Check className="w-3.5 h-3.5 text-[#007A87]" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowChallengeModal(false)}
                className={`flex-1 border text-xs py-2 rounded-xl font-medium ${isNightMode ? "border-[#122a33] text-[#5e818f] hover:bg-[#122a33]" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
              >
                닫기
              </button>
              <button
                onClick={() => handleStartChallenge(selectedChallengeDays)}
                className="flex-1 bg-[#007A87] text-white text-xs py-2 rounded-xl hover:bg-[#00616b] font-semibold shadow-md shadow-teal-500/10"
                id="challenge-start-confirm"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 피드백 전송 모달 */}
      {showFeedbackModal && (
        <div id="feedback-modal" className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl border animate-fade-in ${isNightMode ? "bg-[#091b22] border-teal-500/10 text-teal-100" : "bg-white border-[#e2eff3] text-[#0d2a35]"}`}>
            <div className="text-center space-y-1.5">
              <span className="text-3xl block">📝</span>
              <h4 className="text-sm font-serif font-bold">의견 감사히 받겠습니다</h4>
              <p className={`text-[11px] leading-relaxed ${isNightMode ? "text-[#5e818f]" : "text-stone-500"}`}>
                불편하신 점이나 추천받고 싶은 분류 및 좋은 제안을 들려주세요.
              </p>
            </div>

            <textarea
              placeholder="예) 성경 구절 외에도 장자나 노자의 어록도 같이 있으면 좋겠어요..."
              rows={4}
              className={`w-full rounded-2xl p-3 text-xs placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#007A87]/20 resize-none leading-relaxed border ${isNightMode ? "bg-[#122a33] border-teal-900/30 text-teal-100" : "bg-stone-50 border-stone-200 text-stone-800"}`}
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className={`flex-1 border text-xs py-2 rounded-xl font-medium ${isNightMode ? "border-[#122a33] text-[#5e818f] hover:bg-[#122a33]" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  triggerAlert("의견 감사드립니다! 더 아름다운 성찰의 숲을 가꾸어가겠습니다. 🕊️");
                }}
                className="flex-1 bg-[#007A87] text-white text-xs py-2 rounded-xl hover:bg-[#00616b] font-semibold shadow-md shadow-teal-500/10"
                id="feedback-submit-btn"
              >
                의견 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 모바일 내비게이션 탭 바 (스마트폰 쉘 내부에 absolute 고정하여 완벽하게 디바이스 감각 제공) */}
      <nav 
        id="bottom-nav-bar" 
        className={`absolute bottom-0 left-0 right-0 py-3 px-2 flex justify-around z-40 select-none border-t backdrop-blur-md shadow-lg ${
          isNightMode 
            ? "bg-[#091b22]/95 border-[#122a33] text-[#cbe6ed]/60" 
            : "bg-white/95 border-[#e2eff3] text-[#0d2a35]/60"
        }`}
      >
        {[
          { id: "home", label: "홈", icon: Home },
          { id: "recommend", label: "말씀채팅", icon: MessageSquare },
          { id: "saved", label: "주신말씀", icon: Bookmark },
          { id: "meditation", label: "묵상", icon: Award },
          { id: "trading", label: "자동매매", icon: TrendingUp },
          { id: "settings", label: "설정", icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? "text-[#007A87] bg-[#007A87]/8 scale-105" 
                  : isNightMode 
                    ? "text-[#547b8a] hover:text-[#cbe6ed]" 
                    : "text-[#5e818f] hover:text-[#007A87]"
              }`}
              id={`nav-tab-${tab.id}`}
            >
              <Icon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? "text-[#007A87] scale-110" : "text-current"}`} />
              <span className="text-[9px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      </div>
    </div>
  );
}
