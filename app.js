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
  storageBucket: "icpa12-japanese-d28dd.firebasestorage.app",
  messagingSenderId: "719966125773",
  appId: "1:719966125773:web:f58b0d62893c7f6d0eb384"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let studentList = [];
let currentRankTab = "weekly-class";

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
  const day = now.getDay(); // 0(일) ~ 6(토)
  const diff = (day === 0 ? 1 : 8 - day);
  return diff;
}

function parseClassName(studentId) {
  if (!studentId || studentId.length < 3) return "기타 학급";
  const clean = studentId.replace(/[^0-9]/g, '');
  if (clean.length === 5) {
    const grade = clean.charAt(0);
    const cls = parseInt(clean.substring(1, 3), 10);
    return `${grade}학년 ${cls}반`;
  } else if (clean.length === 4) {
    const grade = clean.charAt(0);
    const cls = clean.charAt(1);
    return `${grade}학년 ${cls}반`;
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
  lastLoginDate: "",
  speedrunDate: "",
  speedrunDailyCount: 0
};

// 실시간 DB 데이터 반영 리스너
db.ref('students').on('value', (snapshot) => {
  const data = snapshot.val();
  const activeWeek = getMondayWeekKey();

  if (data) {
    studentList = Object.values(data);
    if (currentUser.id) {
      if (data[currentUser.id]) {
        const myData = data[currentUser.id];
        currentUser.progress = myData.progress || { vocab: false, grammar: false, culture: false };
        currentUser.records = myData.records || { all: null, hira: null, kata: null };
        currentUser.points = typeof myData.points === 'number' ? myData.points : 0;
        
        if (myData.currentWeekKey === activeWeek) {
          currentUser.weeklyPoints = typeof myData.weeklyPoints === 'number' ? myData.weeklyPoints : 0;
        } else {
          currentUser.weeklyPoints = 0;
          currentUser.currentWeekKey = activeWeek;
        }

        if (myData.title) currentUser.title = myData.title;
        if (myData.ownedTitles) currentUser.ownedTitles = myData.ownedTitles;
        if (myData.className) currentUser.className = myData.className;
        if (myData.speedrunDate) currentUser.speedrunDate = myData.speedrunDate;
        if (myData.speedrunDailyCount) currentUser.speedrunDailyCount = myData.speedrunDailyCount;
        
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        updateBadges();
        updatePointUI();
      } else {
        currentUser.points = 0;
        currentUser.weeklyPoints = 0;
        currentUser.currentWeekKey = activeWeek;
        currentUser.progress = { vocab: false, grammar: false, culture: false };
        currentUser.records = { all: null, hira: null, kata: null };
        currentUser.title = "🐣 가나 병아리";
        currentUser.ownedTitles = ["t_chick"];
        currentUser.speedrunDate = "";
        currentUser.speedrunDailyCount = 0;
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        updateBadges();
        updatePointUI();
      }
    }
  } else {
    studentList = [];
    if (currentUser.id) {
      currentUser.points = 0;
      currentUser.weeklyPoints = 0;
      currentUser.currentWeekKey = activeWeek;
      currentUser.progress = { vocab: false, grammar: false, culture: false };
      currentUser.records = { all: null, hira: null, kata: null };
      currentUser.title = "🐣 가나 병아리";
      currentUser.ownedTitles = ["t_chick"];
      currentUser.speedrunDate = "";
      currentUser.speedrunDailyCount = 0;
      localStorage.setItem('ganago_user', JSON.stringify(currentUser));
      updateBadges();
      updatePointUI();
    }
  }

  updateWeeklyBanner();

  if (document.getElementById('screen-ranking').classList.contains('active')) {
    renderRankingList();
  }
  if (document.getElementById('screen-teacher').classList.contains('active')) {
    renderTeacherTable();
  }
});

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
    title: currentUser.title || "🐣 가나 병아리",
    ownedTitles: currentUser.ownedTitles || ["t_chick"],
    progress: currentUser.progress,
    records: currentUser.records || { all: null, hira: null, kata: null },
    points: currentUser.points || 0,
    weeklyPoints: currentUser.weeklyPoints || 0,
    currentWeekKey: currentUser.currentWeekKey,
    lastLoginDate: currentUser.lastLoginDate || "",
    speedrunDate: currentUser.speedrunDate || "",
    speedrunDailyCount: currentUser.speedrunDailyCount || 0,
    updatedAt: Date.now()
  });
  localStorage.setItem('ganago_user', JSON.stringify(currentUser));
  updateWeeklyBanner();
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 출석 체크 (트랜잭션)
function checkDailyAttendance() {
  if (!currentUser.id) return;
  const today = getTodayString();
  const activeWeek = getMondayWeekKey();

  db.ref('students/' + currentUser.id).transaction((userData) => {
    if (!userData) return userData;
    if (userData.lastLoginDate !== today) {
      userData.points = (userData.points || 0) + 10;
      if (userData.currentWeekKey === activeWeek) {
        userData.weeklyPoints = (userData.weeklyPoints || 0) + 10;
      } else {
        userData.weeklyPoints = 10;
        userData.currentWeekKey = activeWeek;
      }
      userData.lastLoginDate = today;
      userData.updatedAt = Date.now();
    }
    return userData;
  }, (error, committed, snapshot) => {
    if (committed && snapshot && snapshot.exists()) {
      const data = snapshot.val();
      if (currentUser.lastLoginDate !== today && data.lastLoginDate === today) {
        currentUser.points = data.points;
        currentUser.weeklyPoints = data.weeklyPoints;
        currentUser.lastLoginDate = today;
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        updatePointUI();
        updateWeeklyBanner();
        setTimeout(() => {
          triggerCelebration();
          alert(`🎉 오늘 첫 로그인! 출석 보너스 +10P (주간 기여도 +10점)\n(현재 보유: ${currentUser.points}P)`);
        }, 500);
      }
    }
  });
}

// 포인트 보상 트랜잭션
function addRewardPoints(amount, reason) {
  if (!currentUser.id) return;
  const activeWeek = getMondayWeekKey();

  db.ref('students/' + currentUser.id).transaction((userData) => {
    if (!userData) return userData;
    userData.points = (userData.points || 0) + amount;
    if (userData.currentWeekKey === activeWeek) {
      userData.weeklyPoints = (userData.weeklyPoints || 0) + amount;
    } else {
      userData.weeklyPoints = amount;
      userData.currentWeekKey = activeWeek;
    }
    userData.progress = currentUser.progress;
    userData.updatedAt = Date.now();
    return userData;
  }, (error, committed, snapshot) => {
    if (committed && snapshot && snapshot.exists()) {
      const data = snapshot.val();
      currentUser.points = data.points;
      currentUser.weeklyPoints = data.weeklyPoints;
      localStorage.setItem('ganago_user', JSON.stringify(currentUser));
      updatePointUI();
      updateWeeklyBanner();
      triggerCelebration();
      alert(`⭐ ${reason} 달성!\n+${amount}P 획득 (우리 반 주간 점수 +${amount}점)`);
    } else if (error) {
      console.error("포인트 지급 실패:", error);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  applyUserUI();
  const saved = localStorage.getItem('ganago_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      const activeWeek = getMondayWeekKey();
      if (currentUser.currentWeekKey !== activeWeek) {
        currentUser.weeklyPoints = 0;
        currentUser.currentWeekKey = activeWeek;
      }
      if (!currentUser.records) currentUser.records = { all: null, hira: null, kata: null };
      if (!currentUser.ownedTitles) currentUser.ownedTitles = ["t_chick"];
      if (!currentUser.title) currentUser.title = "🐣 가나 병아리";
      if (currentUser.id && currentUser.name) {
        currentUser.className = parseClassName(currentUser.id);
        applyUserUI();
        checkDailyAttendance();
        goToMain();
      }
    } catch (e) {
      console.error("사용자 로드 에러", e);
    }
  }
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
    alert("학번과 실명을 정확히 입력해주세요!");
    return;
  }

  if (cleanId.length < 3) {
    alert("올바른 학번 형식을 입력해주세요. (예: 20315)");
    return;
  }

  // 닉네임 정제: 최대 8자
  if (!nick) {
    nick = name;
  } else if (nick.length > 8) {
    nick = nick.substring(0, 8);
  }

  const activeWeek = getMondayWeekKey();

  db.ref('students/' + cleanId).once('value').then(snapshot => {
    const existing = snapshot.val();

    if (existing && existing.name) {
      if (existing.name !== name) {
        alert(`❌ 로그인 실패!\n\n학번 [${cleanId}]은 이미 [${existing.name}] 학생으로 등록되어 있습니다.\n본인의 학번과 실명을 정확히 입력하세요.`);
        return;
      }
      
      currentUser.id = cleanId;
      currentUser.name = existing.name;
      currentUser.nick = nick;
      currentUser.className = existing.className || parseClassName(cleanId);
      currentUser.title = existing.title || "🐣 가나 병아리";
      currentUser.ownedTitles = existing.ownedTitles || ["t_chick"];
      currentUser.progress = existing.progress || { vocab: false, grammar: false, culture: false };
      currentUser.records = existing.records || { all: null, hira: null, kata: null };
      currentUser.points = typeof existing.points === 'number' ? existing.points : 0;
      currentUser.weeklyPoints = (existing.currentWeekKey === activeWeek && typeof existing.weeklyPoints === 'number') ? existing.weeklyPoints : 0;
      currentUser.currentWeekKey = activeWeek;
      currentUser.lastLoginDate = existing.lastLoginDate || "";
      currentUser.speedrunDate = existing.speedrunDate || "";
      currentUser.speedrunDailyCount = existing.speedrunDailyCount || 0;

      applyUserUI();
      checkDailyAttendance();
      syncWithDB();
      goToMain();
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
      currentUser.speedrunDate = "";
      currentUser.speedrunDailyCount = 0;

      applyUserUI();
      checkDailyAttendance();
      syncWithDB();
      goToMain();
    }
  }).catch(err => {
    alert("로그인 확인 중 통신 오류가 발생했습니다: " + err.message);
  });
}

function handleLogout() {
  if (confirm("다른 계정으로 변경하시겠습니까?")) {
    leaveMultiRoom();
    localStorage.removeItem('ganago_user');
    currentUser = {
      id: "", name: "", nick: "", className: "기타 학급",
      title: "🐣 가나 병아리", ownedTitles: ["t_chick"],
      progress: { vocab: false, grammar: false, culture: false },
      records: { all: null, hira: null, kata: null },
      points: 0, weeklyPoints: 0, currentWeekKey: getMondayWeekKey(), lastLoginDate: "",
      speedrunDate: "", speedrunDailyCount: 0
    };
    applyUserUI();
    document.getElementById('input-student-id').value = '';
    document.getElementById('input-student-name').value = '';
    document.getElementById('input-student-nick').value = '';
    switchScreen('screen-login');
  }
}

// ---------------- [칭호 상점] ----------------
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

    let btnHtml = '';
    if (isEquipped) {
      btnHtml = `<button class="shop-btn btn-using">장착 중</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="shop-btn btn-equip" onclick="equipTitle('${item.name}')">장착</button>`;
    } else {
      btnHtml = `<button class="shop-btn btn-buy" onclick="buyTitle('${item.id}',${item.price}, '${item.name}')">${item.price}P 구매</button>`;
    }

    div.innerHTML = `
      <div>
        <div style="font-size:14px; font-weight:800; color:var(--text);">${item.name}</div>
        <div style="font-size:11px; color:var(--text-muted);">${item.desc}</div>
      </div>
      <div>${btnHtml}</div>
    `;
    container.appendChild(div);
  });
}

function buyTitle(titleId, price, titleName) {
  if (!currentUser.id) return;
  if ((currentUser.points || 0) < price) {
    alert("포인트가 부족합니다! 퀴즈와 스피드런을 클리어해 포인트를 모아보세요.");
    return;
  }
  if (confirm(`[${titleName}] 칭호를 ${price}P에 구매하시겠습니까?`)) {
    db.ref('students/' + currentUser.id).transaction((userData) => {
      if (!userData) return userData;
      if ((userData.points || 0) < price) return;
      userData.points = (userData.points || 0) - price;
      if (!userData.ownedTitles) userData.ownedTitles = ["t_chick"];
      if (!userData.ownedTitles.includes(titleId)) {
        userData.ownedTitles.push(titleId);
      }
      userData.title = titleName;
      userData.updatedAt = Date.now();
      return userData;
    }, (error, committed, snapshot) => {
      if (committed && snapshot && snapshot.exists()) {
        const data = snapshot.val();
        currentUser.points = data.points;
        currentUser.ownedTitles = data.ownedTitles;
        currentUser.title = data.title;
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        applyUserUI();
        openShopModal();
        triggerCelebration();
        alert(`🎉 [${titleName}] 칭호를 구매하고 즉시 장착했습니다!`);
      } else {
        alert("구매 실패: 포인트가 부족하거나 통신 문제가 발생했습니다.");
      }
    });
  }
}

function equipTitle(titleName) {
  currentUser.title = titleName;
  syncWithDB();
  applyUserUI();
  openShopModal();
}

// ---------------- [보안: SHA-256 관리자 인증] ----------------
const SECURE_TEACHER_HASH = "026691d5d0ade18d6cfb0f22f502d5acc4b134db82569e64fff41fa27a04c4e7";

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let teacherTapCount = 0;
let teacherTapTimer = null;

function handleSecretTeacherTap() {
  teacherTapCount++;
  clearTimeout(teacherTapTimer);
  teacherTapTimer = setTimeout(() => { teacherTapCount = 0; }, 3000);

  if (teacherTapCount >= 5) {
    teacherTapCount = 0;
    openTeacherModal();
  }
}

async function openTeacherModal() {
  const pw = prompt("관리자 인증 번호를 입력하세요:");
  if (!pw) return;

  const inputHash = await sha256(pw.trim());
  if (inputHash !== SECURE_TEACHER_HASH) {
    alert("접근 권한이 없습니다.");
    return;
  }
  switchScreen('screen-teacher');
  renderTeacherTable();
}

function renderTeacherTable() {
  const tBody = document.getElementById('teacher-data-body');
  tBody.innerHTML = '';

  if (studentList.length === 0) {
    tBody.innerHTML = `<tr><td colspan="9" style="padding: 20px; color: #94A3B8;">등록된 학생 데이터가 없습니다.</td></tr>`;
    return;
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
  const input = prompt(`[${studentName}] 학생에게 지급/차감할 포인트를 입력하세요 (예: 50 또는 -20):`, "50");
  if (!input) return;
  const delta = parseInt(input.trim(), 10);
  if (!isNaN(delta)) {
    db.ref(`students/${studentId}`).transaction((student) => {
      if (student) {
        student.points = (student.points || 0) + delta;
        student.weeklyPoints = (student.weeklyPoints || 0) + delta;
      }
      return student;
    });
    alert(`[${studentName}] 학생에게 ${delta}P를 반영했습니다.`);
  }
}

// 개별 학생 초기화
function resetSingleStudent(studentId, studentName) {
  if (confirm(`⚠️ [${studentName}] 학생의 진도, 포인트, 주간 점수, 보유 칭호를 초기화하시겠습니까?`)) {
    const resetData = {
      progress: { vocab: false, grammar: false, culture: false },
      records: { all: null, hira: null, kata: null },
      points: 0,
      weeklyPoints: 0,
      currentWeekKey: getMondayWeekKey(),
      title: "🐣 가나 병아리",
      ownedTitles: ["t_chick"],
      speedrunDate: "",
      speedrunDailyCount: 0,
      updatedAt: Date.now()
    };

    db.ref(`students/${studentId}`).update(resetData).then(() => {
      if (currentUser.id === studentId) {
        Object.assign(currentUser, resetData);
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        applyUserUI();
        updateBadges();
      }
      alert(`[${studentName}] 학생 데이터가 완전히 초기화되었습니다.`);
    }).catch(err => {
      alert("초기화 실패: " + err.message);
    });
  }
}

function resetSpeedrunRanking() {
  if (confirm("⚠️ 모든 학생의 스피드런 기록만 전부 초기화하시겠습니까?")) {
    const updates = {};
    studentList.forEach(item => {
      updates[`students/${item.id}/records`] = { all: null, hira: null, kata: null };
    });

    db.ref().update(updates).then(() => {
      if (currentUser.id) currentUser.records = { all: null, hira: null, kata: null };
      localStorage.setItem('ganago_user', JSON.stringify(currentUser));
      alert("전체 스피드런 랭킹 기록이 초기화되었습니다! 🔥");
    }).catch(err => {
      alert("초기화 실패: " + err.message);
    });
  }
}

// 전체 학생 일괄 초기화
async function resetAllStudentData() {
  const input = prompt("⚠️ 모든 학생의 진도, 누적 포인트, 주간 점수, 칭호를 일괄 초기화합니다.\n(학번/이름 명단은 유지)\n\n진행하려면 관리자 비밀번호를 입력하세요:");
  if (!input) return;

  const trimmedInput = input.trim();
  const inputHash = await sha256(trimmedInput);
  
  if (inputHash === SECURE_TEACHER_HASH) {
    if (studentList.length === 0) {
      alert("초기화할 등록 학생 데이터가 없습니다.");
      return;
    }

    const updates = {};
    const activeWeek = getMondayWeekKey();
    studentList.forEach(student => {
      updates[`students/${student.id}/progress`] = { vocab: false, grammar: false, culture: false };
      updates[`students/${student.id}/records`] = { all: null, hira: null, kata: null };
      updates[`students/${student.id}/points`] = 0;
      updates[`students/${student.id}/weeklyPoints`] = 0;
      updates[`students/${student.id}/currentWeekKey`] = activeWeek;
      updates[`students/${student.id}/title`] = "🐣 가나 병아리";
      updates[`students/${student.id}/ownedTitles`] = ["t_chick"];
      updates[`students/${student.id}/speedrunDate`] = "";
      updates[`students/${student.id}/speedrunDailyCount`] = 0;
      updates[`students/${student.id}/updatedAt`] = Date.now();
    });

    db.ref().update(updates).then(() => {
      if (currentUser.id) {
        currentUser.progress = { vocab: false, grammar: false, culture: false };
        currentUser.records = { all: null, hira: null, kata: null };
        currentUser.points = 0;
        currentUser.weeklyPoints = 0;
        currentUser.currentWeekKey = activeWeek;
        currentUser.title = "🐣 가나 병아리";
        currentUser.ownedTitles = ["t_chick"];
        currentUser.speedrunDate = "";
        currentUser.speedrunDailyCount = 0;
        localStorage.setItem('ganago_user', JSON.stringify(currentUser));
        applyUserUI();
        updateBadges();
      }
      renderTeacherTable();
      alert("전체 데이터가 0으로 완벽히 리셋되었습니다! ✨");
    }).catch(err => {
      alert("초기화 실패: " + err.message);
    });
  } else {
    alert("❌ 비밀번호가 일치하지 않습니다.");
  }
}

// iOS Safari / 모바일 호환 TTS
function speakJapanese(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith('ja'));
    if (jaVoice) utterance.voice = jaVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("TTS 실행 에러:", e);
  }
}

function shuffleArray(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------- [오답 노트] ----------------
function saveWrongRecord(category, question, myAnswer, correctAnswer) {
  const note = {
    date: new Date().toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    category: category,
    question: question,
    myAnswer: myAnswer,
    correctAnswer: correctAnswer
  };
  let records = [];
  try {
    records = JSON.parse(localStorage.getItem('ganago_wrong_notes') || '[]');
  } catch (e) { records = []; }
  records.unshift(note);
  if (records.length > 50) records.pop();
  localStorage.setItem('ganago_wrong_notes', JSON.stringify(records));
}

function openWrongNoteScreen() {
  switchScreen('screen-wrong-note');
  renderWrongNotes();
}

function renderWrongNotes() {
  const list = document.getElementById('wrong-note-list');
  list.innerHTML = '';
  let records = [];
  try {
    records = JSON.parse(localStorage.getItem('ganago_wrong_notes') || '[]');
  } catch (e) { records = []; }

  if (records.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:40px; color:#94A3B8; font-size:13px;">아직 기록된 오답이 없습니다. ✨</div>';
    return;
  }

  records.forEach(r => {
    const div = document.createElement('div');
    div.className = 'wrong-item';
    div.innerHTML = `
      <div class="wrong-item-top">
        <span>[${r.category}]</span>
        <span>${r.date}</span>
      </div>
      <div style="font-size:16px; font-weight:800; margin-bottom:6px; color:var(--text);">${r.question}</div>
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span style="color:var(--danger);">내가 고른 답: <strong>${r.myAnswer}</strong></span>
        <span style="color:var(--success);">정답: <strong>${r.correctAnswer}</strong></span>
      </div>
    `;
    list.appendChild(div);
  });
}

function clearWrongNotes() {
  if (confirm("오답 노트를 모두 비우시겠습니까?")) {
    localStorage.removeItem('ganago_wrong_notes');
    renderWrongNotes();
  }
}

let currentMode = "";
let speedrunCategory = "all";
let currentUnit = 1;
let currentList = [];
let currentIdx = 0;
let currentAudioText = "";
let assembledTokens = [];
let timerInterval = null;
let startTime = 0;
let isAnswerLock = false;
let selectedOxChoice = null;

let currentRoomId = null;
let isRoomHost = false;
let multiRoomRef = null;

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function goToMain() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isAnswerLock = false;
  selectedOxChoice = null;
  updateBadges();
  updatePointUI();
  updateWeeklyBanner();
  switchScreen('screen-main');
}

function handleGameBack() {
  if (currentMode === 'multi') {
    if (confirm("대결 중 나가시겠습니까?")) {
      leaveMultiRoom();
      goToMain();
    }
  } else {
    goToMain();
  }
}

function updateBadges() {
  ['vocab', 'grammar', 'culture'].forEach(key => {
    const el = document.getElementById(`badge-${key}`);
    if (currentUser.progress && currentUser.progress[key]) {
      el.innerText = "완료 ✔";
      el.classList.add('done');
    } else {
      el.innerText = "미완료";
      el.classList.remove('done');
    }
  });
}

function playCurrentAudio() {
  if (currentAudioText) speakJapanese(currentAudioText);
}

/* ---------------- [교과서 단원 모드] ---------------- */
function openUnitSelectMode(mode) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  currentMode = mode;
  selectedOxChoice = null;
  document.getElementById('audio-btn').style.display = 'flex';
  document.getElementById('multi-race-box').style.display = 'none';
  document.getElementById('unit-tabs').style.display = 'grid';
  document.getElementById('review-bubble').style.display = 'none';
  
  if (mode === 'culture') {
    document.getElementById('builder-container').style.display = 'none';
    document.getElementById('options-box-5').style.display = 'none';
    document.getElementById('ox-container').style.display = 'block';
  } else {
    document.getElementById('builder-container').style.display = 'block';
    document.getElementById('options-box-5').style.display = 'none';
    document.getElementById('ox-container').style.display = 'none';
  }

  switchUnitTab(1);
  switchScreen('screen-game');
}

function switchUnitTab(unitNum) {
  currentUnit = unitNum;
  document.querySelectorAll('.unit-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === unitNum);
  });

  if (currentMode === 'vocab') {
    document.getElementById('quiz-title').innerText = `🅰️ [${unitNum}단원] 어휘 퍼즐 (10문항)`;
    currentList = shuffleArray(VOCAB_BY_UNIT[unitNum]).slice(0, 10);
    currentIdx = 0;
    renderVocabQuestion();
  } else if (currentMode === 'grammar') {
    document.getElementById('quiz-title').innerText = `💬 [${unitNum}단원] 문장 배열 (10문항)`;
    currentList = shuffleArray(GRAMMAR_BY_UNIT[unitNum]).slice(0, 10);
    currentIdx = 0;
    renderGrammarQuestion();
  } else if (currentMode === 'culture') {
    document.getElementById('quiz-title').innerText = `🏮 [${unitNum}단원] 문화 유퀴즈 (10문항)`;
    currentList = shuffleArray(CULTURE_BY_UNIT[unitNum]).slice(0, 10);
    currentIdx = 0;
    renderCultureQuestion();
  }
}

function renderVocabQuestion() {
  const q = currentList[currentIdx];
  currentAudioText = q.audio;
  assembledTokens = [];

  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`;
  document.getElementById('quiz-main-content').className = "sentence-main";
  document.getElementById('quiz-main-content').innerText = q.meaning;
  document.getElementById('quiz-sub-content').innerText = "글자 카드를 터치해 조합창에 올린 후 [정답 확인 및 제출]을 누르세요";

  renderAssembledBox();

  const baseKanaPool = ["あ", "い", "う", "え", "お", "か", "き", "く", "す", "た", "ん", "て", "ま", "り", "と", "ら", "み"];
  const wordChars = q.word.split('');
  const pureExtra = baseKanaPool.filter(c => !wordChars.includes(c));
  const extraChars = shuffleArray(pureExtra).slice(0, 2);

  const pool = shuffleArray([...wordChars, ...extraChars]);
  
  const poolBox = document.getElementById('pool-box');
  poolBox.innerHTML = '';
  pool.forEach(char => {
    const b = document.createElement('div');
    b.className = 'pool-token';
    b.innerText = char;
    b.onclick = () => {
      assembledTokens.push(char);
      speakJapanese(char);
      renderAssembledBox();
    };
    poolBox.appendChild(b);
  });
}

function renderGrammarQuestion() {
  const q = currentList[currentIdx];
  currentAudioText = q.audio;
  assembledTokens = [];

  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`;
  document.getElementById('quiz-main-content').className = "sentence-main";
  document.getElementById('quiz-main-content').innerText = q.meaning;
  document.getElementById('quiz-sub-content').innerText = "단어 카드를 알맞은 순서대로 배열한 후 [정답 확인 및 제출]을 누르세요";

  renderAssembledBox();

  const pool = shuffleArray([...q.tokens, ...q.dummy]);
  const poolBox = document.getElementById('pool-box');
  poolBox.innerHTML = '';
  
  pool.forEach(token => {
    const b = document.createElement('div');
    b.className = 'pool-token';
    b.innerText = token;
    b.onclick = () => {
      assembledTokens.push(token);
      speakJapanese(token);
      renderAssembledBox();
    };
    poolBox.appendChild(b);
  });
}

function renderAssembledBox() {
  const box = document.getElementById('assembled-box');
  box.innerHTML = '';
  assembledTokens.forEach((token, idx) => {
    const b = document.createElement('div');
    b.className = 'token-block';
    b.innerText = token;
    b.title = "누르면 취소됩니다";
    b.onclick = () => {
      assembledTokens.splice(idx, 1);
      renderAssembledBox();
    };
    box.appendChild(b);
  });
}

function submitBuilderAnswer() {
  const q = currentList[currentIdx];
  if (assembledTokens.length === 0) {
    alert("단어/문장 카드를 먼저 조합창에 배치해주세요!");
    return;
  }

  if (currentMode === 'vocab') {
    const myWord = assembledTokens.join('');
    if (myWord === q.word) {
      playCurrentAudio();
      triggerCelebration();
      alert(`정답입니다! 👏 [ ${q.word} ]`);
      currentIdx++;
      if (currentIdx < currentList.length) {
        renderVocabQuestion();
      } else {
        currentUser.progress.vocab = true;
        addRewardPoints(15, `${currentUnit}단원 어휘 퍼즐 완성`);
        goToMain();
      }
    } else {
      saveWrongRecord("문자/어휘 영역", q.meaning, myWord, q.word);
      alert(`❌ 아쉽습니다! 다시 맞춰보세요.\n(작성한 내용: ${myWord})`);
    }
  } else if (currentMode === 'grammar') {
    const mySentence = assembledTokens.join('');
    const targetSentence = q.tokens.join('');
    const isCorrect = (mySentence === targetSentence);

    if (isCorrect) {
      playCurrentAudio();
      triggerCelebration();
      alert(`정답입니다! 👏\n[ ${q.tokens.join(' ')} ]`);
      currentIdx++;
      if (currentIdx < currentList.length) {
        renderGrammarQuestion();
      } else {
        currentUser.progress.grammar = true;
        addRewardPoints(20, `${currentUnit}단원 핵심 문형 완성`);
        goToMain();
      }
    } else {
      saveWrongRecord("문법/회화 영역", q.meaning, assembledTokens.join(' '), q.tokens.join(' '));
      alert(`❌ 순서가 맞지 않습니다! 조합창 카드를 눌러 취소하고 다시 배열해보세요.`);
    }
  }
}

function renderCultureQuestion() {
  const q = currentList[currentIdx];
  currentAudioText = "";
  selectedOxChoice = null;

  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`;
  document.getElementById('quiz-main-content').className = "sentence-main";
  document.getElementById('quiz-main-content').innerText = q.q;
  document.getElementById('quiz-sub-content').innerText = "맞으면 O, 틀리면 X를 선택한 후 [답안 제출]을 누르세요";

  const optBox = document.getElementById('options-box-ox');
  optBox.innerHTML = '';

  ['O', 'X'].forEach(choice => {
    const btn = document.createElement('button');
    btn.className = `btn-ox ${choice === 'O' ? 'btn-o' : 'btn-x'}`;
    btn.id = `btn-ox-${choice}`;
    btn.innerText = choice;
    btn.onclick = () => {
      selectedOxChoice = choice;
      document.querySelectorAll('.btn-ox').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    optBox.appendChild(btn);
  });
}

function submitOxAnswer() {
  if (!selectedOxChoice) {
    alert("O 또는 X 중 하나를 먼저 선택해주세요!");
    return;
  }

  const q = currentList[currentIdx];
  if (selectedOxChoice === q.ans) {
    triggerCelebration();
    alert(`⭕ 정답입니다!\n\n💡 교과서 해설:\n${q.tip}`);
  } else {
    saveWrongRecord("문화 유퀴즈", q.q, selectedOxChoice, q.ans);
    alert(`❌ 틀렸습니다!\n\n💡 교과서 해설:\n${q.tip}`);
  }
  
  currentIdx++;
  if (currentIdx < currentList.length) {
    renderCultureQuestion();
  } else {
    currentUser.progress.culture = true;
    addRewardPoints(15, `${currentUnit}단원 문화 유퀴즈 클리어`);
    goToMain();
  }
}

/* ---------------- [솔로 스피드런 (10문제 / 독립 랜덤)] ---------------- */
function openSpeedrunModal() {
  document.getElementById('speedrun-modal').style.display = 'flex';
}
function closeSpeedrunModal() {
  document.getElementById('speedrun-modal').style.display = 'none';
}
function startSelectedSpeedrun(cat) {
  closeSpeedrunModal();
  speedrunCategory = cat;
  startSoloSpeedrun();
}

function startSoloSpeedrun() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isAnswerLock = false;
  currentMode = "speedrun";
  
  let basePool = [];
  let modeTitle = "";
  if (speedrunCategory === 'hira') {
    basePool = SPEEDRUN_HIRA;
    modeTitle = "🇯🇵 히라가나 (10문항)";
  } else if (speedrunCategory === 'kata') {
    basePool = SPEEDRUN_KATA;
    modeTitle = "🔤 가타카나 (10문항)";
  } else {
    basePool = [...SPEEDRUN_HIRA, ...SPEEDRUN_KATA];
    modeTitle = "🔥 통합 가나 (10문항)";
  }

  currentList = shuffleArray(basePool).slice(0, 10);
  currentIdx = 0;
  
  document.getElementById('unit-tabs').style.display = 'none';
  document.getElementById('quiz-title').innerText = modeTitle;
  document.getElementById('builder-container').style.display = 'none';
  document.getElementById('ox-container').style.display = 'none';
  document.getElementById('options-box-5').style.display = 'flex';
  document.getElementById('review-bubble').style.display = 'none';
  document.getElementById('multi-race-box').style.display = 'none';
  document.getElementById('audio-btn').style.display = 'none';

  switchScreen('screen-game');
  
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    document.getElementById('quiz-progress').innerText = `⏱ ${elapsed}s`;
  }, 100);

  renderSpeedrunQuestion();
}

function renderSpeedrunQuestion() {
  isAnswerLock = false;
  const q = currentList[currentIdx];
  if (!q) return;

  currentAudioText = "";

  document.getElementById('quiz-progress').innerText = `${currentIdx + 1} / ${currentList.length}`;
  document.getElementById('quiz-main-content').className = "kana-main";
  document.getElementById('quiz-main-content').innerText = q.kana;
  document.getElementById('quiz-sub-content').innerText = "글자를 보고 정확한 한국어 발음을 고르세요";
  
  const reviewBubble = document.getElementById('review-bubble');
  reviewBubble.style.display = 'none';

  const optBox = document.getElementById('options-box-5');
  optBox.innerHTML = '';
  
  // 전체 발음 풀에서 정답 제외 4개 무작위 추출하여 5지선다 생성
  const allPronunciations = [
    "아","이","우","에","오","카","키","쿠","케","코",
    "사","시","스","세","소","타","치","츠","테","토",
    "나","니","누","네","노","하","히","후","헤","호",
    "마","미","무","메","모","야","유","요","라","리",
    "루","레","로","와","응","가","기","구","게","고",
    "자","지","즈","제","조","다","데","도","바","비",
    "부","베","보","파","피","푸","페","포"
  ];

  const wrongOptions = shuffleArray(allPronunciations.filter(p => p !== q.ans)).slice(0, 4);
  const finalOptions = shuffleArray([q.ans, ...wrongOptions]);

  finalOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn-option-5';
    btn.innerText = opt;
    btn.onclick = () => {
      if (isAnswerLock || btn.disabled) return;

      if (opt === q.ans) {
        isAnswerLock = true;
        btn.classList.add('btn-correct');
        
        reviewBubble.innerText = `✨ 정답! [ ${q.kana} = ${q.ans} ]`;
        reviewBubble.style.display = 'inline-block';

        setTimeout(() => {
          currentIdx++;
          if (currentMode === 'multi' && multiRoomRef && currentUser.id) {
            multiRoomRef.child('players/' + currentUser.id).update({
              progress: currentIdx
            });
          }

          if (currentIdx < currentList.length) {
            renderSpeedrunQuestion();
          } else {
            if (currentMode === 'multi') {
              finishMultiSpeedrun();
            } else {
              finishSoloSpeedrun();
            }
          }
        }, 400);
      } else {
        btn.classList.add('btn-wrong');
        btn.disabled = true;
        saveWrongRecord("가나 스피드런", `글자 [ ${q.kana} ]의 발음`, opt, q.ans);
      }
    };
    optBox.appendChild(btn);
  });
}

function finishSoloSpeedrun() {
  clearInterval(timerInterval);
  timerInterval = null;

  const finalTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
  
  if (!currentUser.records) currentUser.records = { all: null, hira: null, kata: null };
  const prevBest = currentUser.records[speedrunCategory];
  let isBest = false;

  if (prevBest === null || prevBest === undefined || finalTime < prevBest) {
    currentUser.records[speedrunCategory] = finalTime;
    isBest = true;
  }
  
  db.ref('students/' + currentUser.id + '/records').set(currentUser.records);

  // [치팅 방지] 스피드런 하루 포인트 지급 상한선 (하루 최대 5회)
  const today = getTodayString();
  if (currentUser.speedrunDate !== today) {
    currentUser.speedrunDate = today;
    currentUser.speedrunDailyCount = 0;
  }

  if ((currentUser.speedrunDailyCount || 0) < 5) {
    currentUser.speedrunDailyCount = (currentUser.speedrunDailyCount || 0) + 1;
    db.ref('students/' + currentUser.id).update({
      speedrunDate: today,
      speedrunDailyCount: currentUser.speedrunDailyCount
    });
    addRewardPoints(10, `스피드런 완주 (${currentUser.speedrunDailyCount}/5회)`);
    triggerCelebration();
    alert(`🎉 10문항 완주 성공!\n기록: ${finalTime}초${isBest ? ' (⭐ 최고기록 경신!)' : ''}\n완주 보너스 +10P 적립! (오늘 획득: ${currentUser.speedrunDailyCount}/5회)`);
  } else {
    triggerCelebration();
    alert(`🎉 10문항 완주 성공!\n기록: ${finalTime}초${isBest ? ' (⭐ 최고기록 경신!)' : ''}\n(오늘 스피드런 포인트 획득 한도 5회를 달성하여 기록만 갱신됩니다! 🚀)`);
  }

  currentRankTab = "all";
  showRanking();
}

/* ---------------- [실시간 멀티 배틀] ---------------- */
function openMultiLobbyModal() {
  if (!currentUser.id) {
    alert("로그인 후 멀티 배틀을 이용하실 수 있습니다!");
    return;
  }
  document.getElementById('input-room-code').value = '';
  document.getElementById('multi-lobby-modal').style.display = 'flex';
}

function closeMultiLobbyModal() {
  document.getElementById('multi-lobby-modal').style.display = 'none';
}

function createMultiRoom() {
  if (!currentUser.id) {
    alert("로그인 후 방을 만들어주세요!");
    return;
  }

  currentMode = "";

  closeMultiLobbyModal();
  const code = String(Math.floor(1000 + Math.random() * 9000));
  currentRoomId = code;
  isRoomHost = true;
  multiRoomRef = db.ref('battle_rooms/' + code);

  const combined = [...SPEEDRUN_HIRA, ...SPEEDRUN_KATA];
  const roomQuestions = shuffleArray(combined).slice(0, 10);

  const initialData = {
    code: code,
    hostId: currentUser.id,
    status: 'waiting',
    questions: roomQuestions,
    players: {},
    createdAt: Date.now()
  };
  initialData.players[currentUser.id] = {
    id: currentUser.id,
    nick: currentUser.nick || currentUser.name,
    title: currentUser.title || "🐣 가나 병아리",
    progress: 0,
    finishTime: null,
    rank: 0
  };

  multiRoomRef.set(initialData).then(() => {
    multiRoomRef.onDisconnect().remove();
    enterLobbyScreen(code);
    listenMultiRoom(code);
  }).catch(err => {
    alert("방 생성 실패 (Firebase 통신 오류): " + err.message);
  });
}

function joinMultiRoom() {
  if (!currentUser.id) {
    alert("로그인 후 참여해주세요!");
    return;
  }

  currentMode = "";

  const code = document.getElementById('input-room-code').value.trim();
  if (!code || code.length < 4) {
    alert("4자리 방 코드를 정확히 입력해주세요!");
    return;
  }

  db.ref('battle_rooms/' + code).once('value', snapshot => {
    const room = snapshot.val();
    if (!room) {
      alert("존재하지 않는 방 코드입니다!");
      return;
    }
    if (room.status !== 'waiting') {
      alert("이미 게임이 진행 중이거나 종료된 방입니다!");
      return;
    }
    const pCount = room.players ? Object.keys(room.players).length : 0;
    if (pCount >= 8) {
      alert("방 정원(8명)이 꽉 찼습니다!");
      return;
    }

    closeMultiLobbyModal();
    currentRoomId = code;
    isRoomHost = (room.hostId === currentUser.id);
    multiRoomRef = db.ref('battle_rooms/' + code);

    multiRoomRef.child('players/' + currentUser.id).set({
      id: currentUser.id,
      nick: currentUser.nick || currentUser.name,
      title: currentUser.title || "🐣 가나 병아리",
      progress: 0,
      finishTime: null,
      rank: 0
    }).then(() => {
      multiRoomRef.child('players/' + currentUser.id).onDisconnect().remove();
      enterLobbyScreen(code);
      listenMultiRoom(code);
    }).catch(err => {
      alert("방 입장 실패: " + err.message);
    });
  });
}

function enterLobbyScreen(code) {
  document.getElementById('lobby-code-display').innerText = code;
  document.getElementById('host-controls').style.display = isRoomHost ? 'block' : 'none';
  document.getElementById('guest-controls').style.display = isRoomHost ? 'none' : 'block';
  switchScreen('screen-lobby');
}

function listenMultiRoom(code) {
  multiRoomRef.on('value', snapshot => {
    const room = snapshot.val();
    if (!room || room.status === 'closed') {
      if (currentRoomId) {
        alert("방장이 퇴장했거나 방이 종료되었습니다.");
        leaveMultiRoom();
        goToMain();
      }
      return;
    }

    if (document.getElementById('screen-lobby').classList.contains('active')) {
      renderLobbyParticipants(room.players || {});
    }

    const isLobbyActive = document.getElementById('screen-lobby').classList.contains('active');
    if (room.status === 'playing' && (isLobbyActive || currentMode !== 'multi')) {
      startMultiGameClient(room.questions);
    }

    if (room.status === 'playing' && currentMode === 'multi') {
      renderMultiRaceTracks(room.players || {});
    }
  });
}

function renderLobbyParticipants(players) {
  const list = document.getElementById('lobby-participant-list');
  list.innerHTML = '';
  const arr = Object.values(players);
  document.getElementById('lobby-count-display').innerText = `${arr.length} / 8명`;

  arr.forEach(p => {
    const div = document.createElement('div');
    const isMe = p.id === currentUser.id;
    div.className = `participant-item ${isMe ? 'is-me' : ''}`;
    div.innerHTML = `
      <span><span style="font-size:11px; color:var(--text-muted);">${p.title || ''}</span> <strong>${p.nick}</strong></span>
      <span>${p.finishTime ? '🏁 ' + p.finishTime + 's' : (p.progress ? p.progress + '/10' : '대기 중')}</span>
    `;
    list.appendChild(div);
  });
}

function leaveMultiRoom() {
  if (multiRoomRef && currentRoomId && currentUser.id) {
    if (isRoomHost) {
      multiRoomRef.update({ status: 'closed' }).then(() => {
        multiRoomRef.remove();
      });
    } else {
      multiRoomRef.child('players/' + currentUser.id).remove();
    }
    multiRoomRef.off();
    multiRoomRef = null;
    currentRoomId = null;
    isRoomHost = false;
  }
}

function hostStartMultiGame() {
  if (!isRoomHost || !multiRoomRef) return;

  multiRoomRef.update({
    status: 'playing',
    startedAt: Date.now()
  }).catch(err => {
    alert("게임 시작 실패: " + err.message);
  });
}

function startMultiGameClient(questions) {
  currentMode = 'multi';
  currentList = questions;
  currentIdx = 0;
  isAnswerLock = false;

  document.getElementById('unit-tabs').style.display = 'none';
  document.getElementById('quiz-title').innerText = "⚔️ 실시간 멀티 배틀 (10문항)";
  document.getElementById('builder-container').style.display = 'none';
  document.getElementById('ox-container').style.display = 'none';
  document.getElementById('options-box-5').style.display = 'flex';
  document.getElementById('review-bubble').style.display = 'none';
  document.getElementById('multi-race-box').style.display = 'block';
  document.getElementById('audio-btn').style.display = 'none';

  switchScreen('screen-game');
  startTime = Date.now();
  renderSpeedrunQuestion();
}

function renderMultiRaceTracks(players) {
  const trackBox = document.getElementById('multi-race-track-list');
  trackBox.innerHTML = '';
  Object.values(players).forEach(p => {
    const isMe = p.id === currentUser.id;
    const pct = ((p.progress || 0) / 10) * 100;
    const row = document.createElement('div');
    row.className = 'multi-track-row';
    row.innerHTML = `
      <span class="multi-track-name">${p.nick}</span>
      <div class="multi-track-bar-bg">
        <div class="multi-track-bar-fill ${isMe ? 'me' : ''}" style="width: ${pct}%;"></div>
      </div>
      <span style="width: 44px; text-align: right;">${p.finishTime ? p.finishTime + 's' : (p.progress || 0) + '/10'}</span>
    `;
    trackBox.appendChild(row);
  });
}

function finishMultiSpeedrun() {
  const finalTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
  if (multiRoomRef && currentUser.id) {
    multiRoomRef.child('players/' + currentUser.id).update({
      progress: 10,
      finishTime: finalTime
    });
  }

  addRewardPoints(15, `멀티 배틀 완주 (${finalTime}초)`);
  triggerCelebration();
  alert(`🏁 멀티 배틀 10문항 완주 완료!\n기록: ${finalTime}초 (+15P / 주간 반 기여도 +15점)`);
}

// ---------------- [주간 랭킹 및 학급 대항전] ----------------
function showRanking() {
  switchScreen('screen-ranking');
  renderRankingList();
}

function switchRankingTab(tabKey) {
  currentRankTab = tabKey;
  document.querySelectorAll('.rank-tab-btn').forEach(btn => btn.classList.remove('active'));
  const target = document.getElementById(`tab-rank-${tabKey}`);
  if (target) target.classList.add('active');
  renderRankingList();
}

function renderRankingList() {
  const list = document.getElementById('ranking-list');
  const myRankBox = document.getElementById('my-ranking-box');
  list.innerHTML = '';
  myRankBox.innerHTML = '';

  const activeWeek = getMondayWeekKey();

  // 1. 주간 학급 대항전
  if (currentRankTab === 'weekly-class') {
    const classScores = {};
    studentList.forEach(s => {
      const cls = s.className || parseClassName(s.id);
      if (!cls || cls === '기타 학급' || cls.startsWith('0학년')) return;
      if (s.currentWeekKey === activeWeek) {
        classScores[cls] = (classScores[cls] || 0) + (s.weeklyPoints || 0);
      }
    });

    const sortedClasses = Object.entries(classScores).sort((a, b) => b[1] - a[1]);

    if (sortedClasses.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">이번 주 집계된 학급 점수가 아직 없습니다.<br>문제를 풀어 1등 반이 되어보세요! 🔥</div>`;
      return;
    }

    sortedClasses.forEach(([clsName, pts], idx) => {
      const isMyClass = (currentUser.className === clsName);
      const icon = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}위`));
      const div = document.createElement('div');
      div.className = `rank-item ${isMyClass ? 'my-rank' : ''}`;
      div.innerHTML = `
        <span><strong>${icon}</strong> ${clsName}</span>
        <span style="color:var(--accent); font-weight:800;">이번 주 ${pts}P</span>
      `;
      list.appendChild(div);
    });
    return;
  }

  // 2. 주간 개인 랭킹
  if (currentRankTab === 'weekly-user') {
    const validUsers = studentList
      .filter(s => s.currentWeekKey === activeWeek && typeof s.weeklyPoints === 'number' && s.weeklyPoints > 0)
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    if (validUsers.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">이번 주 획득 포인트가 아직 없습니다.<br>오늘 첫 문제를 풀어보세요! 🚀</div>`;
      return;
    }

    validUsers.slice(0, 20).forEach((s, idx) => {
      const isMe = s.id === currentUser.id;
      const icon = idx === 0 ? "👑" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}위`));
      const div = document.createElement('div');
      div.className = `rank-item ${isMe ? 'my-rank' : ''}`;
      div.innerHTML = `
        <span><strong>${icon}</strong> [${s.className || '기타'}] ${s.nick}</span>
        <span style="font-weight:bold; color:var(--primary);">${s.weeklyPoints}P</span>
      `;
      list.appendChild(div);
    });
    return;
  }

  // 3. 누적 학급 대항전
  if (currentRankTab === 'class') {
    const classScores = {};
    studentList.forEach(s => {
      const cls = s.className || parseClassName(s.id);
      if (!cls || cls === '기타 학급' || cls.startsWith('0학년')) return;
      classScores[cls] = (classScores[cls] || 0) + (s.points || 0);
    });

    const sortedClasses = Object.entries(classScores).sort((a, b) => b[1] - a[1]);

    if (sortedClasses.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">집계된 누적 학급 점수가 없습니다.</div>';
      return;
    }

    sortedClasses.forEach(([clsName, pts], idx) => {
      const isMyClass = currentUser.className === clsName;
      const div = document.createElement('div');
      div.className = `rank-item ${isMyClass ? 'my-rank' : ''}`;
      div.innerHTML = `
        <span><strong>${idx + 1}위</strong> ${clsName}</span>
        <span style="color:var(--accent); font-weight:800;">총 ${pts}P</span>
      `;
      list.appendChild(div);
    });
    return;
  }

  // 4. 스피드런 랭킹 (통합)
  const validStudents = studentList
    .filter(s => s.records && typeof s.records.all === 'number')
    .sort((a, b) => a.records.all - b.records.all);

  if (validStudents.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; font-size:13px;">아직 스피드런 완주 기록이 없습니다.</div>';
    return;
  }

  validStudents.slice(0, 15).forEach((s, idx) => {
    const isMe = s.id === currentUser.id;
    const div = document.createElement('div');
    div.className = `rank-item ${isMe ? 'my-rank' : ''}`;
    div.innerHTML = `
      <span><strong>${idx + 1}위</strong> [${s.className || '기타'}] ${s.nick}</span>
      <span style="font-weight:bold; color:var(--primary);">${s.records.all}초</span>
    `;
    list.appendChild(div);
  });
}
