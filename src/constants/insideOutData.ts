import { MovieSettings, Sentence } from '../types';

export const MOVIE_SETTINGS: MovieSettings = {
  titleEn: 'INSIDE OUT',
  titleKo: '인사이드아웃',
  releaseYear: '2015',
  director: 'Pete Docter',
  screenplay: 'Pete Docter, Meg LeFauve, Josh Cooley',
  production: 'Pixar Animation Studios',
  distribution: 'Walt Disney Studios Motion Pictures',
  sceneDescription: '주인공 가족의 저녁 식사',
  youtubeTitle: 'INSIDE OUT | Trailer 2 - UK | Official Disney UK',
  youtubeChannel: 'Disney UK',
  youtubeUrl: 'https://www.youtube.com/watch?v=_MC3XuMvsDI',
  videoId: '_MC3XuMvsDI',
  startSeconds: 55, // 0:55
  endSeconds: 113, // 1:53
  madeBy: '정윤호',
  noticeEn:
    'This app was made only for non-commercial English learning in the university course AI and English Language Education (ENG3088, Sungkyunkwan University). The film clip is used only to practice listening and speaking (shadowing). It is not sold, shared for profit, downloaded, or edited. All rights to the film belong to its copyright holders.',
  noticeKo:
    '이 앱은 성균관대학교 「인공지능과 영어교육」(ENG3088) 수업의 비영리 영어 학습 목적으로만 제작되었습니다. 영화 장면은 듣기·말하기(쉐도잉) 연습에만 사용하며, 판매·영리적 배포·다운로드·편집을 하지 않습니다. 영화의 모든 권리는 저작권자에게 있습니다.',
  oneLineCredit:
    'Clip: INSIDE OUT (2015), Walt Disney Studios Motion Pictures / Pixar Animation Studios · via YouTube · For educational use only',
};

// 10 Practice sentences from Section 7 of PRD (fine-tuned per user instructions v5)
export const INITIAL_SENTENCES: Sentence[] = [
  {
    id: 1,
    speaker: 'Riley',
    text: 'School was great, all right?',
    korean: '학교 좋았다고요, 됐죠?',
    stress: ['school', 'great'],
    start: 57.5, // 0.2s later (was 57.3)
    end: 59.5,
  },
  {
    id: 2,
    speaker: 'Mom',
    text: 'Riley, is everything okay?',
    korean: '라일리, 괜찮은 거니?',
    stress: ['everything', 'okay'],
    start: 62.3,
    end: 64.3,
  },
  {
    id: 3,
    speaker: "Dad's Anger",
    text: "All right, make a show of force. I don't want to have to put the foot down.",
    korean: '좋아, 강하게 나가자. 강경하게 나서야 하는 상황까지는 만들고 싶지 않아.',
    stress: ['force', 'foot', 'down'],
    start: 66.8,
    end: 70.0,
  },
  {
    id: 4,
    speaker: 'Dad',
    text: 'Riley, I do not like this new attitude.',
    korean: '라일리, 난 네가 요즘 보이는 이런 태도가 마음에 들지 않아.',
    stress: ['like', 'attitude'],
    start: 72.0,
    end: 74.5,
  },
  {
    id: 5,
    speaker: 'Riley',
    text: 'What is your problem? Just leave me alone!',
    korean: '대체 뭐가 문제인데요? 그냥 저 좀 내버려 두세요!',
    stress: ['problem', 'alone'],
    start: 78.0,
    end: 80.2,
  },
  {
    id: 6,
    speaker: 'Dad',
    text: "I don't know where this disrespectful attitude came from.",
    korean: '도대체 어디서 이런 무례한 태도를 배워 온 건지 모르겠구나.',
    stress: ['disrespectful', 'attitude'],
    start: 84.5,
    end: 87.7,
  },
  {
    id: 7,
    speaker: "Riley's Anger",
    text: 'You want a piece of this, Pops?',
    korean: '한판 붙어 보자는 거야, 아빠?',
    stress: ['piece', 'this', 'pops'],
    start: 87.7,
    end: 89.2,
  },
  {
    id: 8,
    speaker: 'Riley',
    text: 'Just shut up!',
    korean: '그냥 입 다물어요!',
    stress: ['shut', 'up'],
    start: 99.6, // 0.1s later start (was 99.5)
    end: 100.5,
  },
  {
    id: 9,
    speaker: 'Dad',
    text: "That's it! Go to your room!",
    korean: '이제 그만! 네 방으로 가.',
    stress: ["that's", 'it', 'room'],
    start: 102.1,
    end: 104.0,
  },
  {
    id: 10,
    speaker: "Dad's Anger",
    text: 'Good job, gentlemen. That could have been a disaster.',
    korean: '잘했어, 제군들. 하마터면 큰일 날 뻔했군.',
    stress: ['good', 'job', 'disaster'],
    start: 108.3, // 0.2s later start (was 108.1)
    end: 112.0,
  },
];
