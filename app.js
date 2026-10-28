(function() {
// ---------------- [폭죽 이펙트] ----------------
function triggerCelebration() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.65 }
    });
  }
}

// ---------------- [Firebase 연동 설정] ----------------
const firebaseConfig = {
  apiKey: "AIzaSyByCtWrayFMS5oAv0dwvaRy0Si_VwllqNw",
  authDomain: "icpa12-japanese-d28dd.firebaseapp.com",
  databaseURL: "https://icpa12-japanese-d28dd-default-rtdb.firebaseio.com",
  projectId: "icpa12-japanese-d28dd",
  storageBucket: "icpa12-japanese-d28dd-firebasestorage.app",
  messagingSenderId: "719966125773",
  appId: "1:719966125773:web:f58b0d62893c7f6d0eb384"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let studentList = [];
let currentRankTab = "weekly-class";

// ---------------- [서버 시간 동기화 (조작 방지)] ----------------
let serverTimeOffset = 0;
db.ref(".info/serverTimeOffset").on("value", function(snap) {
  serverTimeOffset = snap.val() || 0;
});
function getServerTime() {
  return Date.now() + serverTimeOffset;
}

// ---------------- [주간 챌린지: 월요일 0시 기준 주차 계산] ----------------
function getMondayWeekKey(d = new Date()) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);
  const firstThursday = date.getTime();
  date.setMonth(0, 1);
  if (date.getDay() !== 4) {
    date.setMonth(0, 1 + ((4 - date.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - date.getTime()) / 604800000);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getDaysUntilNextMonday() {
  const now = new Date();
  const day = now.getDay();
  return (day === 0 ? 1 : 8 - day);
}

function parseClassName(studentId) {
  if (!studentId || studentId.length < 3) return "기타 학급";
  const clean = studentId.replace(/[^0-9]/g, '');
  if (clean.length === 5) {
    const grade = clean.charAt(0);
    const cls = parseInt(clean.substring(1, 3), 10);
    if (grade === "1") return `1학년 ${cls}반`;
  } else if (clean.length === 4) {
    const grade = clean.charAt(0);
    const cls = clean.charAt(1);
    if (grade === "1") return `1학년 ${cls}반`;
  }
  return "기타 학급";
}

let currentUser = {
  id: "", name: "", nick: "",
  className: "기타 학급",
  title: "🐣 가나 병아리",
  ownedTitles: ["t_chick"],
  progress: { vocab: false, grammar: false, culture: false },
  records: { all: null, hira: null, kata: null },
  points: 0,
  weeklyPoints: 0,
  currentWeekKey: getMondayWeekKey(),
  lastLoginDate: ""
};

db.ref('students').on('value', (snapshot) => {
  const data = snapshot.val();
  studentList = data ? Object.values(data) : [];
  updateWeeklyBanner();

  const rankScreen = document.getElementById('screen-ranking');
  if (rankScreen && rankScreen.classList.contains('active')) {
    renderRankingList();
  }
  const teacherScreen = document.getElementById('screen-teacher');
  if (teacherScreen && teacherScreen.classList.contains('active')) {
    renderTeacherTable();
  }
});

let myDataListener = null;
function attachMyDataListener() {
  if (myDataListener) db.ref('students/' + currentUser.id).off('value', myDataListener);
  myDataListener = db.ref('students/' + currentUser.id).on('value', (snapshot) => {
    const myData = snapshot.val();
    if (myData) {
      currentUser.progress = myData.progress || { vocab: false, grammar: false, culture: false };
      currentUser.records = myData.records || { all: null, hira: null, kata: null };
      currentUser.points = typeof myData.points === 'number' ? myData.points : 0;
      currentUser.weeklyPoints = typeof myData.weeklyPoints === 'number' ? myData.weeklyPoints : 0;
      currentUser.currentWeekKey = myData.currentWeekKey || getMondayWeekKey();
      currentUser.title = myData.title || "🐣 가나 병아리";
      currentUser.ownedTitles = myData.ownedTitles || ["t_chick"];
      currentUser.className = myData.className || parseClassName(currentUser.id);
      currentUser.lastLoginDate = myData.lastLoginDate || "";
      
      localStorage.setItem('ganago_user', JSON.stringify(currentUser));
      updateBadges();
      updatePointUI();
    }
  });
}

function syncWithDB() {
  if (!currentUser.id) return;
  const activeWeek = getMondayWeekKey();
  if (currentUser.currentWeekKey !== activeWeek) {
    currentUser.weeklyPoints = 0;
    currentUser.currentWeekKey = activeWeek;
  }
  db.ref('students/' + currentUser.id).update({
    id: currentUser.id,
    name: currentUser.name,
    nick: currentUser.nick,
    className: currentUser.className,
    title: currentUser.title,
    ownedTitles: currentUser.ownedTitles,
    progress: currentUser.progress,
    currentWeekKey: currentUser.currentWeekKey,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  });
}

function getTodayString() {
  const d = new Date(getServerTime());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkDailyAttendance() {
  const today = getTodayString();
  if (currentUser.lastLoginDate !== today) {
    const activeWeek = getMondayWeekKey();
    db.ref('students/' + currentUser.id).transaction((student) => {
      if (student) {
        if (student.lastLoginDate !== today) {
          student.lastLoginDate = today;
          if (student.currentWeekKey !== activeWeek) {
            student.weeklyPoints = 0;
            student.currentWeekKey = activeWeek;
          }
          student.points = (student.points || 0) + 10;
          student.weeklyPoints = (student.weeklyPoints || 0) + 10;
        }
      }
      return student;
    }, (error, committed) => {
      if (committed) {
        setTimeout(() => {
          logActivity("📅", "오늘 첫 로그인 출석 보너스");
          triggerCelebration();
          alert(`🎉 오늘 첫 로그인! 출석 보너스 +10P (주간 기여도 +10점)`);
        }, 500);
      }
    });
  }
}

function addRewardPoints(amount, reason) {
  const activeWeek = getMondayWeekKey();
  db.ref('students/' + currentUser.id).transaction((student) => {
    if (student) {
      if (student.currentWeekKey !== activeWeek) {
        student.weeklyPoints = 0;
        student.currentWeekKey = activeWeek;
      }
      student.points = (student.points || 0) + amount;
      student.weeklyPoints = (student.weeklyPoints || 0) + amount;
    }
    return student;
  }, (error, committed) => {
    if (committed) {
      logActivity("⭐", `${reason} 클리어`);
      triggerCelebration();
      alert(`⭐ ${reason} 달성!\n+${amount}P 획득 (우리 반 주간 점수 +${amount}점)`);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  applyUserUI();
  const saved = localStorage.getItem('ganago_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if (currentUser.id && currentUser.name) {
        currentUser.className = parseClassName(currentUser.id);
        applyUserUI();
        attachMyDataListener(); 
        checkDailyAttendance();
        goToMain();
      }
    } catch (e) {
      console.error("사용자 로드 에러", e);
    }
  }
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
      setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });
});

function applyUserUI() {
  const badgeText = currentUser.id ? `${currentUser.title} ${currentUser.nick}` : "👤 게스트";
  document.getElementById('user-badge').innerText = badgeText;
  updatePointUI();
  document.getElementById('main-class-tag').innerText = `소속: [${currentUser.className || '기타 학급'}]`;
  updateWeeklyBanner();
}

function updateWeeklyBanner() {
  const ddayEl = document.getElementById('banner-weekly-dday');
  const textEl = document.getElementById('banner-weekly-text');
  if (!ddayEl || !textEl) return;

  ddayEl.innerText = `D-${getDaysUntilNextMonday()}`;
  const activeWeek = getMondayWeekKey();
  const myClass = currentUser.className || parseClassName(currentUser.id);

  let classWeeklyTotal = 0;
  studentList.forEach(s => {
    const cls = s.className || parseClassName(s.id);
    if (cls === myClass && s.currentWeekKey === activeWeek) {
      classWeeklyTotal += (s.weeklyPoints || 0);
    }
  });
  textEl.innerText = `[${myClass}] 이번 주 ${classWeeklyTotal}P 획득 (랭킹 터치)`;
}

function updatePointUI() {
  document.getElementById('user-points').innerText = `💰 ${currentUser.points || 0}P`;
}

function handleLogin() {
  const rawId = document.getElementById('input-student-id').value.trim();
  const name = document.getElementById('input-student-name').value.trim();
  let nick = document.getElementById('input-student-nick').value.trim();
  const cleanId = rawId.replace(/[^0-9]/g, '');

  if (!cleanId || !name) {
    alert("학번과 실명을 정확히 입력해주세요!"); return;
  }
  if (cleanId.length < 3) {
    alert("올바른 학번 형식을 입력해주세요. (예: 10315)"); return;
  }
  if (!cleanId.startsWith('1')) {
    alert("⚠️ 본 앱은 1학년 전용 학습 플랫폼입니다.\n1학년 학번을 정확히 입력해주세요."); return;
  }
  if (!nick) nick = name;

  const activeWeek = getMondayWeekKey();

  db.ref('students/' + cleanId).once('value').then(snapshot => {
    const existing = snapshot.val();
    if (existing && existing.name) {
      if (existing.name !== name) {
        alert(`❌ 로그인 실패!\n\n학번 [${cleanId}]은 이미 [${existing.name}] 학생으로 등록되어 있습니다.`);
        return;
      }
      currentUser = { ...existing };
    } else {
      currentUser.id = cleanId;
      currentUser.name = name;
      currentUser.nick = nick;
      currentUser.className = parseClassName(cleanId);
      currentUser.title = "🐣 가나 병아리";
      currentUser.ownedTitles = ["t_chick"];
      currentUser.progress = { vocab: false, grammar: false, culture: false };
      currentUser.records = { all: null, hira: null, kata: null };
      currentUser.points = 0;
      currentUser.weeklyPoints = 0;
      currentUser.currentWeekKey = activeWeek;
      currentUser.lastLoginDate = "";
      currentUser.dailyPlays = { date: "", speedrun: 0, multi: 0 };
      currentUser.activityLog = [];
    }
    
    if (!existing) syncWithDB();
    
    attachMyDataListener();
    applyUserUI();
    checkDailyAttendance();
    goToMain();
  });
}

function handleLogout() {
  if (confirm("다른 계정으로 변경하시겠습니까?")) {
    leaveMultiRoom();
    if (myDataListener) {
      db.ref('students/' + currentUser.id).off('value', myDataListener);
      myDataListener = null;
    }
    localStorage.removeItem('ganago_user');
    currentUser = { id: "", name: "", nick: "", className: "기타 학급", title: "🐣 가나 병아리", ownedTitles: ["t_chick"], progress: { vocab: false, grammar: false, culture: false }, records: { all: null, hira: null, kata: null }, points: 0, weeklyPoints: 0, currentWeekKey: getMondayWeekKey(), lastLoginDate: "" };
    applyUserUI();
    document.getElementById('input-student-id').value = '';
    document.getElementById('input-student-name').value = '';
    document.getElementById('input-student-nick').value = '';
    switchScreen('screen-login');
  }
}

function buyTitle(titleId, price, titleName) {
  if ((currentUser.points || 0) < price) {
    alert("포인트가 부족합니다! 퀴즈와 스피드런을 클리어해 포인트를 모아보세요."); return;
  }
  if (confirm(`[${titleName}] 칭호를 ${price}P에 구매하시겠습니까?`)) {
    db.ref(`students/${currentUser.id}`).transaction((student) => {
      if (student) {
        if ((student.points || 0) >= price) {
          student.points -= price;
          if (!student.ownedTitles) student.ownedTitles = ["t_chick"];
          if (!student.ownedTitles.includes(titleId)) student.ownedTitles.push(titleId);
          student.title = titleName;
        } else {
          return; 
        }
      }
      return student;
    }, (error, committed, snapshot) => {
      if (committed && snapshot.val().ownedTitles.includes(titleId)) {
        logActivity("🛒", `[${titleName}] 칭호 상점 구매`);
        triggerCelebration();
        alert(`🎉 [${titleName}] 칭호를 구매하고 즉시 장착했습니다!`);
        openShopModal();
      } else {
        alert("구매에 실패했거나 포인트가 부족합니다.");
      }
    });
  }
}

function equipTitle(titleName) {
  db.ref(`students/${currentUser.id}`).update({ title: titleName }).then(() => {
    applyUserUI();
    openShopModal();
  });
}

function openShopModal() {
  document.getElementById('shop-my-points').innerText = `${currentUser.points || 0}P`;
  renderShopItems();
  document.getElementById('shop-modal').style.display = 'flex';
}
function closeShopModal() {
  document.getElementById('shop-modal').style.display = 'none';
}
function renderShopItems() {
  const container = document.getElementById('shop-items-container');
  container.innerHTML = '';
  SHOP_TITLES.forEach(item => {
    const isOwned = currentUser.ownedTitles && currentUser.ownedTitles.includes(item.id);
    const isEquipped = currentUser.title === item.name;
    const div = document.createElement('div');
    div.className = `shop-item ${isEquipped ? 'equipped' : ''}`;
    let btnHtml = isEquipped ? `<button class="shop-btn btn-using">장착 중</button>` : 
                 (isOwned ? `<button class="shop-btn btn-equip" onclick="equipTitle('${item.name}')">장착</button>` : 
                 `<button class="shop-btn btn-buy" onclick="buyTitle('${item.id}',${item.price}, '${item.name}')">${item.price}P 구매</button>`);
    div.innerHTML = `<div><div style="font-size:14px; font-weight:800; color:var(--text);">${item.name}</div><div style="font-size:11px; color:var(--text-muted);">${item.desc}</div></div><div>${btnHtml}</div>`;
    container.appendChild(div);
  });
}

const SECURE_TEACHER_HASH = "026691d5d0ade18d6cfb0f22f502d5acc4b134db82569e64fff41fa27a04c4e7";
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
let teacherTapCount = 0; let teacherTapTimer = null;

function handleSecretTeacherTap() {
  teacherTapCount++;
  clearTimeout(teacherTapTimer);
  teacherTapTimer = setTimeout(() => { teacherTapCount = 0; }, 3000);
  if (teacherTapCount >= 5) { teacherTapCount = 0; openTeacherModal(); }
}
async function openTeacherModal() {
  const pw = prompt("관리자 인증 번호를 입력하세요:");
  if (!pw) return;
  const inputHash = await sha256(pw.trim());
  if (inputHash !== SECURE_TEACHER_HASH) { alert("접근 권한이 없습니다."); return; }
  sessionStorage.setItem('admin_token', inputHash);
  switchScreen('screen-teacher');
  renderTeacherTable();
}

function renderTeacherTable() {
  const tBody = document.getElementById('teacher-data-body');
  tBody.innerHTML = '';
  if (studentList.length === 0) {
    tBody.innerHTML = `<tr><td colspan="9" style="padding: 20px; color: #94A3B8;">등록된 학생 데이터가 없습니다.</td></tr>`; return;
  }
  const activeWeek = getMondayWeekKey();
  studentList.forEach(item => {
    const isCurrentWeek = (item.currentWeekKey === activeWeek);
    const weeklyP = isCurrentWeek ? (item.weeklyPoints || 0) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.className || parseClassName(item.id)}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.nick} <span style="font-size:10px; color:var(--primary);">(${item.title || '기본'})</span></td>
      <td>${item.progress && item.progress.vocab ? '✅' : '❌'}</td>
      <td>${item.progress && item.progress.grammar ? '✅' : '❌'}</td>
      <td>${item.progress && item.progress.culture ? '✅' : '❌'}</td>
      <td><strong style="color:var(--accent);">${weeklyP}P</strong></td>
      <td><strong>${item.points || 0}P</strong></td>
      <td>
        <button class="btn-point-mod" onclick="adminGrantPoint('${item.id}', '${item.name}')">+조정</button>
        <button class="btn-single-reset" onclick="resetSingleStudent('${item.id}', '${item.name}')">초기화</button>
      </td>
    `;
    tBody.appendChild(tr);
  });
}
function adminGrantPoint(studentId, studentName) {
  if (sessionStorage.getItem('admin_token') !== SECURE_TEACHER_HASH) { alert("비정상적인 접근입니다."); return; }
  const input = prompt(`[${studentName}] 학생에게 지급/차감할 포인트를 입력하세요 (예: 50 또는 -20):`, "50");
  if (!input) return;
  const delta = parseInt(input.trim(), 10);
  if (!isNaN(delta)) {
    db.ref(`students/${studentId}`).transaction((student) => {
      if (student) { student.points = (student.points || 0) + delta; student.weeklyPoints = (student.weeklyPoints || 0) + delta; }
      return student;
    });
    alert(`[${studentName}] 학생에게 ${delta}P를 반영했습니다.`);
  }
}
function resetSingleStudent(studentId, studentName) {
  if (sessionStorage.getItem('admin_token') !== SECURE_TEACHER_HASH) { alert("비정상적인 접근입니다."); return; }
  if (confirm(`⚠️ [${studentName}] 학생의 진도, 포인트, 주간 점수, 보유 칭호를 초기화하시겠습니까?`)) {
    const resetData = { progress: { vocab: false, grammar: false, culture: false }, records: { all: null, hira: null, kata: null }, points: 0, weeklyPoints: 0, currentWeekKey: getMondayWeekKey(), title: "🐣 가나 병아리", ownedTitles: ["t_chick"], updatedAt: firebase.database.ServerValue.TIMESTAMP };
    db.ref(`students/${studentId}`).update(resetData).then(() => alert(`[${studentName}] 학생 데이터 초기화됨.`));
  }
}
function resetSpeedrunRanking() {
  if (sessionStorage.getItem('admin_token') !== SECURE_TEACHER_HASH) { alert("비정상적인 접근입니다."); return; }
  if (confirm("⚠️ 모든 학생의 스피드런 기록만 전부 초기화하시겠습니까?")) {
    const updates = {};
    studentList.forEach(item => updates[`students/${item.id}/records`] = { all: null, hira: null, kata: null });
    db.ref().update(updates).then(() => alert("전체 스피드런 랭킹 기록 초기화됨! 🔥"));
  }
}
async function resetAllStudentData() {
  if (sessionStorage.getItem('admin_token') !== SECURE_TEACHER_HASH) { alert("비정상적인 접근입니다."); return; }
  const input = prompt("⚠️ 모든 학생의 일괄 초기화 진행. 관리자 인증 번호를 다시 입력하세요:");
  if (!input) return;
  const trimmedInput = input.trim();
  const inputHash = await sha256(trimmedInput);
  if (inputHash === SECURE_TEACHER_HASH) {
    const updates = {}; const activeWeek = getMondayWeekKey();
    studentList.forEach(s => {
      updates[`students/${s.id}/progress`] = { vocab: false, grammar: false, culture: false };
      updates[`students/${s.id}/records`] = { all: null, hira: null, kata: null };
      updates[`students/${s.id}/points`] = 0;
      updates[`students/${s.id}/weeklyPoints`] = 0;
      updates[`students/${s.id}/currentWeekKey`] = activeWeek;
      updates[`students/${s.id}/title`] = "🐣 가나 병아리";
      updates[`students/${s.id}/ownedTitles`] = ["t_chick"];
      updates[`students/${s.id}/updatedAt`] = firebase.database.ServerValue.TIMESTAMP;
    });
    db.ref().update(updates).then(() => alert("전체 데이터 리셋 완료! ✨"));
  }
}

function speakJapanese(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; utterance.rate = 0.9; window.speechSynthesis.speak(utterance);
  } catch (e) { console.warn("TTS 미지원", e); }
}
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

// ---------------- [오답 노트] ----------------
function saveWrongRecord(category, question, myAnswer, correctAnswer) {
  const note = { date: new Date().toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }), category: category, question: question, myAnswer: myAnswer, correctAnswer: correctAnswer };
  let records = [];
  try { records = JSON.parse(localStorage.getItem('ganago_wrong_notes') || '[]'); } catch (e) { records = []; }
  records.unshift(note);
  if (records.length > 50) records.pop();
  localStorage.setItem('ganago_wrong_notes', JSON.stringify(records));
}
function openWrongNoteScreen() { switchScreen('screen-wrong-note'); renderWrongNotes(); }
function renderWrongNotes() {
  const list = document.getElementById('wrong-note-list'); list.innerHTML = '';
  let records = []; try { records = JSON.parse(localStorage.getItem('ganago_wrong_notes') || '[]'); } catch (e) { records = []; }
  if (records.length === 0) { list.innerHTML = '<div style="text-align:center; padding:40px; color:#94A3B8; font-size:13px;">아직 기록된 오답이 없습니다. ✨</div>'; return; }
  records.forEach(r => {
    const div = document.createElement('div'); div.className = 'wrong-item';
    div.innerHTML = `<div class="wrong-item-top"><span>[${r.category}]</span><span>${r.date}</span></div><div style="font-size:16px; font-weight:800; margin-bottom:6px; color:var(--text);">${r.question}</div><div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--danger);">내가 고른 답: <strong>${r.myAnswer}</strong></span><span style="color:var(--success);">정답: <strong>${r.correctAnswer}</strong></span></div>`;
    list.appendChild(div);
  });
}
function clearWrongNotes() {
  if (confirm("오답 노트를 모두 비우시겠습니까?")) { localStorage.removeItem('ganago_wrong_notes'); renderWrongNotes(); }
}

let currentMode = ""; let speedrunCategory = "all"; let currentUnit = 1; let currentList = []; let currentIdx = 0; let currentAudioText = ""; let assembledTokens = []; let timerInterval = null; let startTime = 0; let isAnswerLock = false; let selectedOxChoice = null;
let currentRoomId = null; let isRoomHost = false; let multiRoomRef = null;

function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId).classList.add('active'); }
function goToMain() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  isAnswerLock = false; selectedOxChoice = null;
  currentMode = ""; // 상태 완전 초기화
  updateBadges(); updatePointUI(); updateWeeklyBanner(); switchScreen('screen-main');
}
function handleGameBack() { if (currentMode === 'multi') { if (confirm("대결 중 나가시겠습니까?")) { leaveMultiRoom(); goToMain(); } } else { goToMain(); } }
function updateBadges() {
  ['vocab', 'grammar', 'culture'].forEach(key => {
    const el = document.getElementById(`badge-${key}`);
    if (el) { if (currentUser.progress && currentUser.progress[key]) { el.innerText = "완료 ✔"; el.classList.add('done'); } else { el.innerText = "미완료"; el.classList.remove('done'); } }
  });
}
function playCurrentAudio() { if (currentAudioText) speakJapanese(currentAudioText); }

// ---------------- [교과서 단원 모드] ----------------
function openUnitSelectMode(mode) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  currentMode = mode; selectedOxChoice = null;
  document.getElementById('multi-race-box').style.display = 'none'; document.getElementById('unit-tabs').style.display = 'grid'; document.getElementById('review-bubble').style.display = 'none';
  if (mode === 'culture') { document.getElementById('builder-container').style.display = 'none'; document.getElementById('options-box-5').style.display = 'none'; document.getElementById('ox-container').style.display = 'block'; }
  else { document.getElementById('builder-container').style.display = 'block'; document.getElementById('options-box-5').style.display = 'none'; document.getElementById('ox-container').style.display = 'none'; }
  switchUnitTab(1); switchScreen('screen-game');
}
function switchUnitTab(unitNum) {
  currentUnit = unitNum; document.querySelectorAll('.unit-btn').forEach((btn, idx) => { btn.classList.toggle('active', idx + 1 === unitNum); });
  if (currentMode === 'vocab') { document.getElementById('quiz-title').innerText = `🅰️ [${unitNum}단원] 어휘 퍼즐`; currentList = shuffleArray(VOCAB_BY_UNIT[unitNum]).slice(0, 10); currentIdx = 0; renderVocabQuestion(); }
  else if (currentMode === 'grammar') { document.getElementById('quiz-title').innerText = `💬 [${unitNum}단원] 문장 배열`; currentList = shuffleArray(GRAMMAR_BY_UNIT[unitNum]).slice(0, 10); currentIdx = 0; renderGrammarQuestion(); }
  else if (currentMode === 'culture') { document.getElementById('quiz-title').innerText = `🏮 [${unitNum}단원] 문화 유퀴즈`; currentList = shuffleArray(CULTURE_BY_UNIT[unitNum]).slice(0, 10); currentIdx = 0; renderCultureQuestion(); }
}
function renderVocabQuestion() {
  const q = currentList[currentIdx]; currentAudioText = q.audio; assembledTokens = [];
  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`; document.getElementById('quiz-main-content').className = "sentence-main"; document.getElementById('quiz-main-content').innerText = q.meaning;
  renderAssembledBox();
  const isKatakanaWord = /[゠-ヿ]/.test(q.word);
  const baseKanaPool = isKatakanaWord ? ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ス", "タ", "ン", "テ", "マ", "リ", "ト", "ラ", "ミ", "ー", "ッ"] : ["あ", "い", "う", "え", "お", "か", "き", "く", "す", "た", "ん", "て", "ま", "り", "と", "ら", "み"];
  const wordChars = q.word.split(''); const pureExtra = baseKanaPool.filter(c => !wordChars.includes(c)); const extraChars = shuffleArray(pureExtra).slice(0, 2);
  const pool = shuffleArray([...wordChars, ...extraChars]);
  const poolBox = document.getElementById('pool-box'); poolBox.innerHTML = '';
  pool.forEach(char => { const b = document.createElement('div'); b.className = 'pool-token'; b.innerText = char; b.onclick = () => { assembledTokens.push(char); speakJapanese(char); renderAssembledBox(); }; poolBox.appendChild(b); });
}
function renderGrammarQuestion() {
  const q = currentList[currentIdx]; currentAudioText = q.audio; assembledTokens = [];
  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`; document.getElementById('quiz-main-content').className = "sentence-main"; document.getElementById('quiz-main-content').innerText = q.meaning;
  renderAssembledBox();
  const pool = shuffleArray([...q.tokens, ...q.dummy]);
  const poolBox = document.getElementById('pool-box'); poolBox.innerHTML = '';
  pool.forEach(token => { const b = document.createElement('div'); b.className = 'pool-token'; b.innerText = token; b.onclick = () => { assembledTokens.push(token); speakJapanese(token); renderAssembledBox(); }; poolBox.appendChild(b); });
}
function renderAssembledBox() {
  const box = document.getElementById('assembled-box'); box.innerHTML = '';
  assembledTokens.forEach((token, idx) => { const b = document.createElement('div'); b.className = 'token-block'; b.innerText = token; b.onclick = () => { assembledTokens.splice(idx, 1); renderAssembledBox(); }; box.appendChild(b); });
}
function submitBuilderAnswer() {
  const q = currentList[currentIdx]; if (assembledTokens.length === 0) { alert("단어/문장 카드를 먼저 조합창에 배치해주세요!"); return; }
  if (currentMode === 'vocab') {
    const myWord = assembledTokens.join('');
    if (myWord === q.word) { playCurrentAudio(); triggerCelebration(); alert(`정답입니다! 👏 [ ${q.word} ]`); currentIdx++;
      if (currentIdx < currentList.length) renderVocabQuestion();
      else { db.ref(`students/${currentUser.id}/progress/vocab`).set(true); addRewardPoints(15, `${currentUnit}단원 어휘 완성`); goToMain(); }
    } else { saveWrongRecord("문자/어휘 영역", q.meaning, myWord, q.word); alert(`❌ 오답입니다!\n(작성: ${myWord})`); }
  } else if (currentMode === 'grammar') {
    const mySentence = assembledTokens.join(''); const targetSentence = q.tokens.join('');
    if (mySentence === targetSentence) { playCurrentAudio(); triggerCelebration(); alert(`정답입니다! 👏`); currentIdx++;
      if (currentIdx < currentList.length) renderGrammarQuestion();
      else { db.ref(`students/${currentUser.id}/progress/grammar`).set(true); addRewardPoints(20, `${currentUnit}단원 문형 완성`); goToMain(); }
    } else { saveWrongRecord("문법/회화 영역", q.meaning, assembledTokens.join(' '), q.tokens.join(' ')); alert(`❌ 순서가 맞지 않습니다!`); }
  }
}
function renderCultureQuestion() {
  const q = currentList[currentIdx]; currentAudioText = ""; selectedOxChoice = null;
  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`; document.getElementById('quiz-main-content').className = "sentence-main"; document.getElementById('quiz-main-content').innerText = q.q;
  const optBox = document.getElementById('options-box-ox'); optBox.innerHTML = '';
  ['O', 'X'].forEach(choice => { const btn = document.createElement('button'); btn.className = `btn-ox ${choice === 'O' ? 'btn-o' : 'btn-x'}`; btn.innerText = choice; btn.onclick = () => { selectedOxChoice = choice; document.querySelectorAll('.btn-ox').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); }; optBox.appendChild(btn); });
}
function submitOxAnswer() {
  if (!selectedOxChoice) { alert("O 또는 X 중 하나를 선택해주세요!"); return; }
  const q = currentList[currentIdx];
  if (selectedOxChoice === q.ans) { triggerCelebration(); alert(`⭕ 정답입니다!\n\n💡 교과서 해설:\n${q.tip}`); } else { saveWrongRecord("문화 유퀴즈", q.q, selectedOxChoice, q.ans); alert(`❌ 틀렸습니다!\n\n💡 교과서 해설:\n${q.tip}`); }
  currentIdx++;
  if (currentIdx < currentList.length) { renderCultureQuestion(); }
  else { db.ref(`students/${currentUser.id}/progress/culture`).set(true); addRewardPoints(15, `${currentUnit}단원 문화 클리어`); goToMain(); }
}

// ---------------- [솔로 스피드런] ----------------
function openSpeedrunModal() { document.getElementById('speedrun-modal').style.display = 'flex'; }
function closeSpeedrunModal() { document.getElementById('speedrun-modal').style.display = 'none'; }
function startSelectedSpeedrun(cat) { 
  closeSpeedrunModal(); 
  speedrunCategory = cat; 
  startSoloSpeedrun(); 
}
function startSoloSpeedrun() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  isAnswerLock = false; currentMode = "speedrun";
  let basePool = speedrunCategory === 'hira' ? SPEEDRUN_HIRA : (speedrunCategory === 'kata' ? SPEEDRUN_KATA : [...SPEEDRUN_HIRA, ...SPEEDRUN_KATA]);
  currentList = shuffleArray(basePool).slice(0, 10); currentIdx = 0;
  
  document.getElementById('unit-tabs').style.display = 'none'; document.getElementById('quiz-title').innerText = "🔥 스피드런";
  document.getElementById('builder-container').style.display = 'none'; document.getElementById('ox-container').style.display = 'none';
  document.getElementById('options-box-5').style.display = 'flex'; document.getElementById('review-bubble').style.display = 'none'; document.getElementById('multi-race-box').style.display = 'none';
  switchScreen('screen-game');
  
  startTime = getServerTime(); 
  timerInterval = setInterval(() => { const elapsed = ((getServerTime() - startTime) / 1000).toFixed(1); document.getElementById('quiz-progress').innerText = `⏱ ${elapsed}s (${currentIdx + 1}/${currentList.length})`; }, 100);
  renderSpeedrunQuestion();
}
function renderSpeedrunQuestion() {
  isAnswerLock = false; const q = currentList[currentIdx]; currentAudioText = "";
  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`; document.getElementById('quiz-main-content').className = "kana-main"; document.getElementById('quiz-main-content').innerText = q.kana;
  const reviewBubble = document.getElementById('review-bubble'); reviewBubble.style.display = 'none';
  const optBox = document.getElementById('options-box-5'); optBox.innerHTML = '';
  
  const questionRenderTime = getServerTime();
  shuffleArray(q.options).slice(0, 10).forEach(opt => {
    const btn = document.createElement('button'); btn.className = 'btn-option-5'; btn.innerText = opt;
    btn.onclick = (e) => {
      if (isAnswerLock || btn.disabled) return;
      if (!e.isTrusted || (getServerTime() - questionRenderTime) < 150) return;

      if (opt === q.ans) {
        isAnswerLock = true; btn.classList.add('btn-correct'); speakJapanese(q.kana);
        reviewBubble.innerText = `✨ 정답! [ ${q.kana} = ${q.ans} ]`; reviewBubble.style.display = 'inline-block'; reviewBubble.style.color = "#047857"; reviewBubble.style.background = "#D1FAE5";
        setTimeout(() => {
          currentIdx++;
          if (currentMode === 'multi' && multiRoomRef) multiRoomRef.child('players/' + currentUser.id).update({ progress: currentIdx });
          if (currentIdx < currentList.length) renderSpeedrunQuestion();
          else currentMode === 'multi' ? finishMultiSpeedrun() : finishSoloSpeedrun();
        }, 450);
      } else {
        btn.classList.add('btn-wrong'); btn.disabled = true; startTime -= 1000;
        reviewBubble.innerText = `⚠️ 오답! 시간 패널티 +1초`; reviewBubble.style.display = 'inline-block'; reviewBubble.style.color = "#B91C1C"; reviewBubble.style.background = "#FEE2E2";
        saveWrongRecord("가나 스피드런", `글자 [ ${q.kana} ]의 발음`, opt, q.ans);
      }
    };
    optBox.appendChild(btn);
  });
}
function finishSoloSpeedrun() {
  clearInterval(timerInterval); timerInterval = null;
  const finalTime = parseFloat(((getServerTime() - startTime) / 1000).toFixed(1));
  const activeWeek = getMondayWeekKey();
  
  db.ref(`students/${currentUser.id}`).transaction((student) => {
    if (student) {
      if (!student.records) student.records = { all: null, hira: null, kata: null };
      const prevBest = student.records[speedrunCategory];
      if (prevBest === null || prevBest === undefined || finalTime < prevBest) {
        student.records[speedrunCategory] = finalTime;
      }
      if (student.currentWeekKey !== activeWeek) {
        student.weeklyPoints = 0; student.currentWeekKey = activeWeek;
      }
      student.points = (student.points || 0) + 10;
      student.weeklyPoints = (student.weeklyPoints || 0) + 10;
    }
    return student;
  }, (error, committed, snapshot) => {
    if (committed) {
      const isBest = snapshot.val().records[speedrunCategory] === finalTime;
      triggerCelebration();
      alert(`🎉 10문항 완주 성공!\n기록: ${finalTime}초${isBest ? ' (⭐ 최고기록 경신!)' : ''}\n완주 보너스 +10P 적립! [우리 반 주간 기여도 +10점]`);
      currentRankTab = "all"; showRanking();
    }
  });
}

// ---------------- [실시간 멀티 배틀] ----------------
function openMultiLobbyModal() { document.getElementById('input-room-code').value = ''; document.getElementById('multi-lobby-modal').style.display = 'flex'; }
function closeMultiLobbyModal() { document.getElementById('multi-lobby-modal').style.display = 'none'; }

function createMultiRoom() {
  closeMultiLobbyModal();
  currentMode = ""; // 상태 완벽 초기화
  const code = String(Math.floor(1000 + Math.random() * 9000));
  currentRoomId = code; isRoomHost = true; multiRoomRef = db.ref('battle_rooms/' + code);
  const roomQuestions = shuffleArray([...SPEEDRUN_HIRA, ...SPEEDRUN_KATA]).slice(0, 10);
  const initialData = { code: code, hostId: currentUser.id, status: 'waiting', questions: roomQuestions, players: {}, createdAt: firebase.database.ServerValue.TIMESTAMP };
  initialData.players[currentUser.id] = { id: currentUser.id, nick: currentUser.nick, title: currentUser.title, progress: 0, finishTime: null, rank: 0 };

  multiRoomRef.set(initialData).then(() => {
    multiRoomRef.onDisconnect().remove();
    enterLobbyScreen(code); listenMultiRoom(code);
  });
}

function joinMultiRoom() {
  const code = document.getElementById('input-room-code').value.trim();
  if (!code || code.length < 4) { alert("4자리 방 코드를 정확히 입력해주세요!"); return; }
  currentMode = ""; // 상태 완벽 초기화
  db.ref('battle_rooms/' + code).once('value', snapshot => {
    const room = snapshot.val();
    if (!room) { alert("존재하지 않는 방 코드입니다!"); return; }
    if (room.status !== 'waiting') { alert("이미 게임이 진행 중인 방입니다!"); return; }
    if (room.players && Object.keys(room.players).length >= 8) { alert("방 정원(8명)이 꽉 찼습니다!"); return; }
    closeMultiLobbyModal(); currentRoomId = code; isRoomHost = (room.hostId === currentUser.id); multiRoomRef = db.ref('battle_rooms/' + code);
    multiRoomRef.child('players/' + currentUser.id).set({ id: currentUser.id, nick: currentUser.nick, title: currentUser.title, progress: 0, finishTime: null, rank: 0 }).then(() => {
      multiRoomRef.child('players/' + currentUser.id).onDisconnect().remove();
      enterLobbyScreen(code); listenMultiRoom(code);
    });
  });
}

function enterLobbyScreen(code) {
  currentMode = ""; // 상태 완벽 초기화
  document.getElementById('lobby-code-display').innerText = code;
  document.getElementById('host-controls').style.display = isRoomHost ? 'block' : 'none';
  document.getElementById('guest-controls').style.display = isRoomHost ? 'none' : 'block';
  switchScreen('screen-lobby');
}

function listenMultiRoom(code) {
  multiRoomRef.on('value', snapshot => {
    const room = snapshot.val();
    if (!room) { if (currentRoomId) { alert("방장이 퇴장하여 방이 해산되었습니다."); leaveMultiRoom(); goToMain(); } return; }
    if (document.getElementById('screen-lobby').classList.contains('active')) renderLobbyParticipants(room.players || {});
    if (room.status === 'playing' && currentMode !== 'multi') startMultiGameClient(room.questions);
    if (room.status === 'playing' && currentMode === 'multi') renderMultiRaceTracks(room.players || {});
  });
}

function renderLobbyParticipants(players) {
  const list = document.getElementById('lobby-participant-list'); list.innerHTML = '';
  const arr = Object.values(players); document.getElementById('lobby-count-display').innerText = `${arr.length} / 8명`;
  arr.forEach(p => {
    const div = document.createElement('div'); div.className = `participant-item ${p.id === currentUser.id ? 'is-me' : ''}`;
    div.innerHTML = `<span><span style="font-size:11px; color:var(--text-muted);">${p.title || ''}</span> <strong>${p.nick}</strong></span><span>${p.finishTime ? '🏁 ' + p.finishTime + 's' : (p.progress ? p.progress + '/10' : '대기 중')}</span>`;
    list.appendChild(div);
  });
}

function leaveMultiRoom() {
  if (multiRoomRef && currentRoomId && currentUser.id) {
    multiRoomRef.once('value', snapshot => {
      const room = snapshot.val();
      const realIsHost = room && room.hostId === currentUser.id;

      if (realIsHost) {
        multiRoomRef.remove(); 
      } else {
        multiRoomRef.child('players/' + currentUser.id).remove();
      }
      
      multiRoomRef.off(); 
      multiRoomRef = null; 
      currentRoomId = null; 
      isRoomHost = false;
    });
  }
}

function hostStartMultiGame() {
  if (!isRoomHost || !multiRoomRef) return;
  multiRoomRef.update({ status: 'playing', startedAt: firebase.database.ServerValue.TIMESTAMP });
}

function startMultiGameClient(questions) {
  currentMode = 'multi'; currentList = questions; currentIdx = 0; isAnswerLock = false;
  document.getElementById('unit-tabs').style.display = 'none'; document.getElementById('quiz-title').innerText = "⚔️ 실시간 멀티 배틀";
  document.getElementById('builder-container').style.display = 'none'; document.getElementById('ox-container').style.display = 'none';
  document.getElementById('options-box-5').style.display = 'flex'; document.getElementById('review-bubble').style.display = 'none'; document.getElementById('multi-race-box').style.display = 'block';
  switchScreen('screen-game'); startTime = getServerTime(); timerInterval = setInterval(() => { const elapsed = ((getServerTime() - startTime) / 1000).toFixed(1); document.getElementById('quiz-progress').innerText = `⏱ ${elapsed}s (${currentIdx + 1}/${currentList.length})`; }, 100); renderSpeedrunQuestion();
}

function renderMultiRaceTracks(players) {
  const trackBox = document.getElementById('multi-race-track-list'); trackBox.innerHTML = '';
  
  const sortedPlayers = Object.values(players).sort((a, b) => {
    if (a.progress === 10 && b.progress === 10) {
      if (a.finishTime === b.finishTime) return a.id.localeCompare(b.id);
      return a.finishTime - b.finishTime;
    }
    if (a.progress === 10) return -1;
    if (b.progress === 10) return 1;
    return (b.progress || 0) - (a.progress || 0);
  });

  sortedPlayers.forEach((p, idx) => {
    const row = document.createElement('div'); row.className = 'multi-track-row';
    
    let rankStr = '';
    if (p.progress === 10) {
      if (idx === 0) rankStr = '🥇';
      else if (idx === 1) rankStr = '🥈';
      else if (idx === 2) rankStr = '🥉';
      else rankStr = `${idx + 1}위`;
    }

    row.innerHTML = `
      <div style="display:flex; flex-direction:column; width: 100px; flex-shrink:0;">
        <span style="font-size:9px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title || '🐣 가나 병아리'}</span>
        <span class="multi-track-name" style="width:100%; font-size:13px; font-weight:800;">
          <span style="color:var(--danger); font-size:11px;">${rankStr}</span> ${p.nick}
        </span>
      </div>
      <div class="multi-track-bar-bg"><div class="multi-track-bar-fill ${p.id === currentUser.id ? 'me' : ''}" style="width: ${((p.progress || 0) / 10) * 100}%;"></div></div>
      <span style="width: 45px; text-align: right; font-weight:800; color:${p.progress===10 ? 'var(--danger)' : 'var(--text-muted)'};">${p.finishTime ? p.finishTime + 's' : (p.progress || 0) + '/10'}</span>
    `;
    trackBox.appendChild(row);
  });
}

function finishMultiSpeedrun() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  const finalTime = parseFloat(((getServerTime() - startTime) / 1000).toFixed(1));
  if (multiRoomRef && currentUser.id) {
    multiRoomRef.child('players/' + currentUser.id).update({ progress: 10, finishTime: finalTime });
  }
  
  document.getElementById('quiz-progress').innerText = `⏱ ${finalTime}s (10/10)`;
  
  const mainContent = document.getElementById('quiz-main-content');
  if (mainContent) mainContent.innerText = "🏁 레이스 완주!";
  const subContent = document.getElementById('quiz-sub-content');
  if (subContent) subContent.innerText = "다른 플레이어들이 완료할 때까지 기다려주세요.";
  
  const optionsBox = document.getElementById('options-box-5');
  if (optionsBox) optionsBox.style.display = 'none';
  
  const reviewBubble = document.getElementById('review-bubble');
  if (reviewBubble) {
    reviewBubble.innerText = `내 기록: ${finalTime}초! 👏`;
    reviewBubble.style.display = 'inline-block';
    reviewBubble.style.background = '#FEF2F2';
    reviewBubble.style.color = '#991B1B';
  }

  addRewardPoints(15, '멀티 배틀 완주 완료');
}

// ---------------- [랭킹 및 학급 대항전] ----------------
function showRanking() { switchScreen('screen-ranking'); renderRankingList(); }
function switchRankingTab(tabKey) {
  currentRankTab = tabKey; document.querySelectorAll('.rank-tab-btn').forEach(btn => btn.classList.remove('active'));
  const target = document.getElementById(`tab-rank-${tabKey}`); if (target) target.classList.add('active');
  renderRankingList();
}
function renderRankingList() {
  const list = document.getElementById('ranking-list'); const myRankBox = document.getElementById('my-ranking-box');
  list.innerHTML = ''; myRankBox.innerHTML = ''; const activeWeek = getMondayWeekKey();

  if (currentRankTab === 'weekly-class') {
    const classScores = {};
    studentList.forEach(s => { const cls = s.className || parseClassName(s.id); if (cls.startsWith('1학년') && s.currentWeekKey === activeWeek) classScores[cls] = (classScores[cls] || 0) + (s.weeklyPoints || 0); });
    const sorted = Object.entries(classScores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) { list.innerHTML = `<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">이번 주 집계 점수가 없습니다.</div>`; return; }
    sorted.forEach(([clsName, pts], idx) => {
      const div = document.createElement('div'); div.className = `rank-item ${currentUser.className === clsName ? 'my-rank' : ''}`;
      div.innerHTML = `<span><strong>${idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}위`))}</strong> ${clsName}</span><span style="color:var(--accent); font-weight:800;">이번 주 ${pts}P</span>`;
      list.appendChild(div);
    });
  } else if (currentRankTab === 'weekly-user') {
    const validUsers = studentList.filter(s => (s.className || parseClassName(s.id)).startsWith('1학년') && s.currentWeekKey === activeWeek && s.weeklyPoints > 0).sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    if (validUsers.length === 0) { list.innerHTML = `<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">이번 주 획득 포인트가 아직 없습니다.</div>`; return; }
    validUsers.slice(0, 20).forEach((s, idx) => {
      const div = document.createElement('div'); div.className = `rank-item ${s.id === currentUser.id ? 'my-rank' : ''}`;
      div.innerHTML = `<span><strong>${idx === 0 ? "👑" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}위`))}</strong> [${s.className || '기타'}] <span style="font-size:10px; color:var(--primary); margin:0 4px;">${s.title || ''}</span>${s.nick}</span><span style="font-weight:bold; color:var(--primary);">${s.weeklyPoints}P</span>`;
      list.appendChild(div);
    });
  } else if (currentRankTab === 'class') {
    const classScores = {};
    studentList.forEach(s => { const cls = s.className || parseClassName(s.id); if (cls.startsWith('1학년')) classScores[cls] = (classScores[cls] || 0) + (s.points || 0); });
    const sorted = Object.entries(classScores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) { list.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">집계된 점수가 없습니다.</div>'; return; }
    sorted.forEach(([clsName, pts], idx) => {
      const div = document.createElement('div'); div.className = `rank-item ${currentUser.className === clsName ? 'my-rank' : ''}`;
      div.innerHTML = `<span><strong>${idx + 1}위</strong> ${clsName}</span><span style="color:var(--accent); font-weight:800;">총 ${pts}P</span>`;
      list.appendChild(div);
    });
  } else {
    const validStudents = studentList.filter(s => (s.className || parseClassName(s.id)).startsWith('1학년') && s.records && typeof s.records.all === 'number').sort((a, b) => a.records.all - b.records.all);
    if (validStudents.length === 0) { list.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">아직 완주 기록이 없습니다.</div>'; return; }
    validStudents.slice(0, 15).forEach((s, idx) => {
      const div = document.createElement('div'); div.className = `rank-item ${s.id === currentUser.id ? 'my-rank' : ''}`;
      div.innerHTML = `<span><strong>${idx + 1}위</strong> [${s.className || '기타'}] <span style="font-size:10px; color:var(--primary); margin:0 4px;">${s.title || ''}</span>${s.nick}</span><span style="font-weight:bold; color:var(--primary);">${s.records.all}초</span>`;
      list.appendChild(div);
    });
  }
}

// ---------------- [학습 기록 (Activity Log)] ----------------
function logActivity(icon, desc) {
  if (!currentUser.activityLog) currentUser.activityLog = [];
  const now = new Date();
  const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  currentUser.activityLog.unshift({ time: timeStr, icon: icon, desc: desc });
  if (currentUser.activityLog.length > 50) currentUser.activityLog.pop(); 
  
  if (currentUser.id) {
    db.ref(`students/${currentUser.id}/activityLog`).set(currentUser.activityLog);
  }
}

function openActivityLog() {
  switchScreen('screen-activity-log');
  renderActivityLog();
}

function renderActivityLog() {
  const list = document.getElementById('activity-log-list');
  list.innerHTML = '';
  const logs = currentUser.activityLog || [];
  if (logs.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">아직 학습 기록이 없습니다.✨</div>';
    return;
  }
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = 'wrong-item'; 
    div.innerHTML = `
      <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">${log.time}</div>
      <div style="font-size:14px; font-weight:800; color:var(--text);"><span style="margin-right:6px;">${log.icon}</span>${log.desc}</div>
    `;
    list.appendChild(div);
  });
}

  window.openShopModal = openShopModal;
  window.closeShopModal = closeShopModal;
  window.handleLogout = handleLogout;
  window.handleSecretTeacherTap = handleSecretTeacherTap;
  window.handleLogin = handleLogin;
  window.showRanking = showRanking;
  window.openSpeedrunModal = openSpeedrunModal;
  window.closeSpeedrunModal = closeSpeedrunModal;
  window.openMultiLobbyModal = openMultiLobbyModal;
  window.closeMultiLobbyModal = closeMultiLobbyModal;
  window.openUnitSelectMode = openUnitSelectMode;
  window.openWrongNoteScreen = openWrongNoteScreen;
  window.openActivityLog = openActivityLog;
  window.leaveMultiRoom = leaveMultiRoom;
  window.goToMain = goToMain;
  window.hostStartMultiGame = hostStartMultiGame;
  window.handleGameBack = handleGameBack;
  window.switchUnitTab = switchUnitTab;
  window.playCurrentAudio = playCurrentAudio;
  window.submitBuilderAnswer = submitBuilderAnswer;
  window.submitOxAnswer = submitOxAnswer;
  window.switchRankingTab = switchRankingTab;
  window.clearWrongNotes = clearWrongNotes;
  window.resetSpeedrunRanking = resetSpeedrunRanking;
  window.resetAllStudentData = resetAllStudentData;
  window.startSelectedSpeedrun = startSelectedSpeedrun;
  window.createMultiRoom = createMultiRoom;
  window.joinMultiRoom = joinMultiRoom;
  window.adminGrantPoint = adminGrantPoint;
  window.resetSingleStudent = resetSingleStudent;
  window.equipTitle = equipTitle;
  window.buyTitle = buyTitle;

})();