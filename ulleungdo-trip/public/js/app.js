let db;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

        initAuth();
        fetchSchedules();
        fetchAccommodations();
        fetchPacking();
        fetchTransport();

        // 달력 컨트롤 (Flatpickr) 초기화
        flatpickr("#date-wrapper", {
            wrap: true,
            allowInput: true,
            locale: "ko",
            dateFormat: "Y-m-d",
            disableMobile: "true"
        });

        // 24시간제 시간 컨트롤 (Flatpickr) 초기화
        flatpickr("#time-wrapper", {
            wrap: true,
            allowInput: true,
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            disableMobile: "true"
        });

    } catch (e) {
        console.error("Failed to initialize Supabase:", e);
        document.getElementById('schedule-container').innerHTML = '<li><p>DB 연결/설정 필요</p></li>';
    }
});

/* ============================
   TOC SIDEBAR LOGIC
============================ */
const tocSidebar = document.getElementById('toc-sidebar');
const tocToggleBtn = document.getElementById('toc-toggle-btn');
const closeTocBtn = document.getElementById('close-toc-btn');
const tocLinks = document.querySelectorAll('.toc-list a');

tocToggleBtn.addEventListener('click', () => {
    tocSidebar.classList.add('open');
});

closeTocBtn.addEventListener('click', () => {
    tocSidebar.classList.remove('open');
});

// Close TOC when clicking a link and smoothly scroll
tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElem = document.getElementById(targetId);
        if (targetElem) {
            window.scrollTo({
                top: targetElem.offsetTop - 80, // Offset for navbar and aesthetics
                behavior: 'smooth'
            });
        }
        tocSidebar.classList.remove('open');
    });
});

/* ============================
   AUTH LOGIC
============================ */
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
let isLoginMode = true;

function initAuth() {
    db.auth.getSession().then(({ data: { session } }) => {
        currentUser = session?.user;
        updateAuthUI();
    });

    db.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user;
        updateAuthUI();
        fetchSchedules();
        fetchAccommodations();
        fetchPacking();
        fetchTransport();
    });

    document.getElementById('nav-login-btn').addEventListener('click', () => {
        if (currentUser) db.auth.signOut();
        else authModal.classList.add('show');
    });

    document.getElementById('close-auth-modal').addEventListener('click', () => {
        authModal.classList.remove('show');
    });

    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        document.getElementById('auth-title').innerText = isLoginMode ? '로그인' : '회원가입';
        document.getElementById('auth-submit-btn').innerText = isLoginMode ? '로그인' : '가입하기';
        e.target.innerText = isLoginMode ? '가입하기' : '로그인으로 돌아가기';

        const nameInput = document.getElementById('auth-name');
        nameInput.style.display = isLoginMode ? 'none' : 'block';
        if (!isLoginMode) nameInput.setAttribute('required', 'true');
        else nameInput.removeAttribute('required');
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const fullName = document.getElementById('auth-name').value;

        if (isLoginMode) {
            const { data: signInData, error } = await db.auth.signInWithPassword({ email, password });
            if (error) alert("로그인 에러: " + error.message);
            else {
                const meta = signInData.user?.user_metadata || {};
                const userName = meta.display_name || meta.full_name || meta.name || email.split('@')[0];
                alert(`${userName}님 반갑습니다! 🐬`);
                authModal.classList.remove('show');
            }
        } else {
            const { error } = await db.auth.signUp({
                email,
                password,
                options: { data: { display_name: fullName, full_name: fullName, name: fullName } }
            });
            if (error) alert("회원가입 에러: " + error.message);
            else { alert('회원가입 신청 완료! 입력하신 이메일에서 승인 후 로그인 가능합니다'); authModal.classList.remove('show'); }
        }
    });
}

function updateAuthUI() {
    const btn = document.getElementById('nav-login-btn');
    const adminElements = document.querySelectorAll('.admin-only');

    if (currentUser) {
        const meta = currentUser.user_metadata || {};
        const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];
        btn.innerText = userName + '님 반갑습니다! (로그아웃)';
        adminElements.forEach(el => el.style.display = 'inline-block');
    } else {
        btn.innerText = '로그인 / 회원가입';
        adminElements.forEach(el => el.style.display = 'none');
    }
}

/* ============================
   CMS LOGIC: SCHEDULE
============================ */
async function fetchSchedules() {
    if (!db) return;
    const { data: schedules, error } = await db
        .from('schedules')
        .select('*, schedule_histories(id)')
        .order('schedule_date', { ascending: true })
        .order('schedule_time', { ascending: true });

    if (error) {
        if (error.code === '42P01') {
            document.getElementById('schedule-container').innerHTML = `<li><p style="color:#ffb74d">테이블이 없습니다! schema_v3.sql 을 먼저 실행해주세요.</p></li>`;
        }
        return;
    }

    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    if (!schedules || schedules.length === 0) {
        container.innerHTML = `<li><p>등록된 일정이 없습니다.</p></li>`;
        return;
    }

    let currentDate = '';

    schedules.forEach((schedule, index) => {
        const li = document.createElement('li');

        let headerHTML = '';
        if (schedule.schedule_date !== currentDate) {
            headerHTML = `<strong>🌟 ${schedule.schedule_date}</strong>`;
            currentDate = schedule.schedule_date;
        }

        let adminHTML = '';
        if (currentUser) {
            const escapedTitle = schedule.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedContent = schedule.content.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\r?\n/g, '\\n');

            let historyBtn = '';
            // 만약 schedule_histories 가 배열로 존재하고 1개 이상이라면 (수정된 이력이 있다면)
            if (schedule.schedule_histories && schedule.schedule_histories.length > 0) {
                historyBtn = `<button class="btn" style="font-size:0.75rem; padding:0.2rem 0.5rem; background:rgba(255, 193, 7, 0.2); border:1px solid #ffc107; color:#ffc107;" onclick="viewHistory('${schedule.id}')">🕒이력보기</button>`;
            }

            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top: 5px;">
                    ${historyBtn}
                    <button class="btn sm" onclick="openScheduleModal('${schedule.id}', '${schedule.schedule_date}', '${schedule.schedule_time.slice(0, 5)}', '${escapedTitle}', '${escapedContent}')">수정</button>
                    <button class="btn sm" onclick="deleteSchedule('${schedule.id}')">삭제</button>
                </div>
            `;
        }

        li.innerHTML = `
            ${headerHTML}
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid #00bcd4;">
                <p style="color: #fff; font-weight:bold; margin-bottom: 0.3rem;">
                    [${schedule.schedule_time.slice(0, 5)}] ${schedule.title}
                </p>
                <p style="color: #e3f2fd; font-size: 0.9rem; margin-bottom: 0; white-space: pre-wrap; line-height: 1.4;">${schedule.content}</p>
                ${adminHTML}
            </div>
        `;

        if (currentUser) {
            const nextSchedule = schedules[index + 1];
            let defaultDate = schedule.schedule_date;
            let defaultTime = schedule.schedule_time.slice(0, 5);

            if (nextSchedule) {
                defaultDate = nextSchedule.schedule_date;
                defaultTime = '00:00';
            } else {
                let [hr, min] = defaultTime.split(':');
                let newHr = parseInt(hr, 10) + 1;
                if (newHr >= 24) { newHr = 0; }
                defaultTime = `${String(newHr).padStart(2, '0')}:${min}`;
            }

            li.innerHTML += `
               <div class="admin-only" style="text-align:center; padding-top:1rem;">
                   <button class="btn sm" onclick="openScheduleModal(null, '${defaultDate}', '${defaultTime}', '', '')" style="background: transparent; color: rgba(255,255,255,0.7); border: 1px dashed rgba(255,255,255,0.3);">➕ 여기에 일정 추가하기</button>
               </div>
            `;
        }
        container.appendChild(li);
    });
}

// FORMATTING & EVENTS FOR SCHEDULE
const scheduleModal = document.getElementById('schedule-form-modal');
const scheduleForm = document.getElementById('schedule-form');
let oldScheduleData = null;

document.getElementById('add-schedule-btn').addEventListener('click', () => {
    openScheduleModal();
});

window.openScheduleModal = (id = null, date = '', time = '', title = '', content = '') => {
    document.getElementById('schedule-modal-title').innerText = id ? '일정 수정' : '일정 추가';
    document.getElementById('form-schedule-id').value = id || '';

    // Set values into elements so flatpickr wrapper catches them perfectly
    const dateInput = document.getElementById('form-date');
    dateInput.value = date;
    const timeInput = document.getElementById('form-time');
    timeInput.value = time;

    document.getElementById('form-title').value = title;
    document.getElementById('form-content').value = content;

    if (id) oldScheduleData = { date, time, title, content };
    else oldScheduleData = null;

    scheduleModal.classList.add('show');
};

document.getElementById('close-schedule-modal').addEventListener('click', () => scheduleModal.classList.remove('show'));

scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-schedule-id').value;
    const newData = {
        schedule_date: document.getElementById('form-date').value,
        schedule_time: document.getElementById('form-time').value,
        title: document.getElementById('form-title').value,
        content: document.getElementById('form-content').value
    };

    if (id) {
        const { error: updateError } = await db.from('schedules').update(newData).eq('id', id);
        if (updateError) { alert('수정 실패: ' + updateError.message); return; }

        const meta = currentUser.user_metadata || {};
        const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];

        await db.from('schedule_histories').insert([{
            schedule_id: id,
            old_data: oldScheduleData,
            new_data: newData,
            changed_by_email: userName
        }]);
    } else {
        const { error: insertError } = await db.from('schedules').insert([newData]);
        if (insertError) { alert('등록 실패: ' + insertError.message); return; }
    }

    scheduleModal.classList.remove('show');
    fetchSchedules();
});

window.deleteSchedule = async (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        const { error } = await db.from('schedules').delete().eq('id', id);
        if (error) { alert("삭제 실패: " + error.message); return; }
        fetchSchedules();
    }
};

/* ============================
   HISTORY VIEWER LOGIC
============================ */
const historyModal = document.getElementById('history-modal');
document.getElementById('close-history-modal').addEventListener('click', () => {
    historyModal.classList.remove('show');
});

window.viewHistory = async (scheduleId) => {
    const { data: histories, error } = await db
        .from('schedule_histories')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('changed_at', { ascending: false });

    if (error) {
        alert('이력을 불러오는 중 오류가 발생했습니다: ' + error.message);
        return;
    }

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (!histories || histories.length === 0) {
        container.innerHTML = '<p style="color:white; text-align:center;">수정 이력이 없습니다.</p>';
    } else {
        histories.forEach(h => {
            const dateStr = new Date(h.changed_at).toLocaleString('ko-KR');
            // Safely parse old and new objects mapped from history
            const formatData = (data) => data ? `[${data.time || data.schedule_time}] ${data.title} - ${data.content}` : '없음';

            container.innerHTML += `
                <div class="history-item">
                    <p><strong>수정 전:</strong> ${formatData(h.old_data)}</p>
                    <p><strong>수정 후:</strong> ${formatData(h.new_data)}</p>
                    <p class="meta">작성자: ${h.changed_by_email} | 시간: ${dateStr}</p>
                </div>
            `;
        });
    }

    historyModal.classList.add('show');
};

/* ============================
   CMS LOGIC: PACKING LIST
============================ */
async function fetchPacking() {
    if (!db) return;
    const { data: items, error } = await db.from('packing_items').select('*').order('created_at', { ascending: true });

    if (error) {
        if (error.code === '42P01') {
            document.getElementById('packing-container').innerHTML = `<p style="color:#ffb74d">테이블이 없습니다! schema_v4.sql 실행 요망</p>`;
        }
        return;
    }

    const container = document.getElementById('packing-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:white;">등록된 준비물이 없습니다.</p>`;
        return;
    }

    // Sync localStorage Checkboxes cleanly
    items.forEach(item => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.marginBottom = '1rem';

        const isChecked = localStorage.getItem(`packing-${item.id}`) === 'true';

        div.innerHTML = `
            <label class="check-item" style="margin-bottom:0;">
                <input type="checkbox" id="cb-${item.id}" ${isChecked ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span>${item.item_name}</span>
            </label>
        `;

        if (currentUser) {
            const escapedName = item.item_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            div.innerHTML += `
                <div class="action-buttons admin-only">
                    <button class="btn sm" onclick="openPackingModal('${item.id}', '${escapedName}')">수정</button>
                    <button class="btn sm" onclick="deletePacking('${item.id}')">삭제</button>
                </div>
            `;
        }

        container.appendChild(div);

        // Bind Checkbox localstorage state
        const cb = document.getElementById(`cb-${item.id}`);
        cb.addEventListener('change', () => {
            localStorage.setItem(`packing-${item.id}`, cb.checked);
        });
    });
}

const packingModal = document.getElementById('packing-form-modal');
const packingForm = document.getElementById('packing-form');

document.getElementById('add-packing-btn').addEventListener('click', () => { openPackingModal(); });
document.getElementById('close-packing-modal').addEventListener('click', () => { packingModal.classList.remove('show'); });

window.openPackingModal = (id = null, name = '') => {
    document.getElementById('packing-modal-title').innerText = id ? '물품 수정' : '물품 추가';
    document.getElementById('form-packing-id').value = id || '';
    document.getElementById('form-packing-name').value = name;
    packingModal.classList.add('show');
};

packingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-packing-id').value;
    const item_name = document.getElementById('form-packing-name').value;

    if (id) {
        const { error } = await db.from('packing_items').update({ item_name }).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
    } else {
        const { error } = await db.from('packing_items').insert([{ item_name }]);
        if (error) alert('등록 실패: ' + error.message);
    }
    packingModal.classList.remove('show');
    fetchPacking();
});

window.deletePacking = async (id) => {
    if (confirm('이 준비물을 삭제하시겠습니까?')) {
        await db.from('packing_items').delete().eq('id', id);
        localStorage.removeItem(`packing-${id}`); // cleanup local state
        fetchPacking();
    }
};

/* ============================
   CMS LOGIC: TRANSPORTATION
============================ */
async function fetchTransport() {
    if (!db) return;
    const { data: items, error } = await db.from('transportation_items').select('*').order('category', { ascending: true });

    if (error) { return; }

    const container = document.getElementById('transport-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:white;">등록된 이동방법이 없습니다.</p>`;
        return;
    }

    let currentCat = '';

    items.forEach(item => {
        if (item.category !== currentCat) {
            const h3 = document.createElement('h3');
            h3.innerText = item.category;
            h3.style.marginTop = currentCat ? '1.5rem' : '0';
            container.appendChild(h3);
            currentCat = item.category;
        }

        const div = document.createElement('div');
        div.style.marginBottom = '0.75rem';

        let adminHTML = '';
        if (currentUser) {
            const escapedCat = item.category.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedTitle = item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedDesc = (item.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\r?\n/g, '\\n');

            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top:0.25rem;">
                    <button class="btn sm" onclick="openTransportModal('${item.id}', '${escapedCat}', '${escapedTitle}', '${escapedDesc}')">수정</button>
                    <button class="btn sm" onclick="deleteTransport('${item.id}')">삭제</button>
                </div>
            `;
        }

        div.innerHTML = `
            <p style="margin-bottom:0.2rem;"><strong style="font-size:1.1rem; color:#fff;">${item.title}</strong></p>
            <p style="white-space: pre-wrap; font-size:0.95rem; line-height:1.4; color:#e3f2fd; margin-bottom:0.5rem; margin-top:0;">${item.description}</p>
            ${adminHTML}
        `;
        container.appendChild(div);
    });
}

const transportModal = document.getElementById('transport-form-modal');
const transportForm = document.getElementById('transport-form');

document.getElementById('add-transport-btn').addEventListener('click', () => { openTransportModal(); });
document.getElementById('close-transport-modal').addEventListener('click', () => { transportModal.classList.remove('show'); });

window.openTransportModal = (id = null, cat = '', title = '', desc = '') => {
    document.getElementById('transport-modal-title').innerText = id ? '이동방법 수정' : '이동방법 추가';
    document.getElementById('form-transport-id').value = id || '';
    document.getElementById('form-transport-category').value = cat;
    document.getElementById('form-transport-title').value = title;
    document.getElementById('form-transport-description').value = desc;
    transportModal.classList.add('show');
};

transportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-transport-id').value;
    const data = {
        category: document.getElementById('form-transport-category').value,
        title: document.getElementById('form-transport-title').value,
        description: document.getElementById('form-transport-description').value
    };

    if (id) {
        const { error } = await db.from('transportation_items').update(data).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
    } else {
        const { error } = await db.from('transportation_items').insert([data]);
        if (error) alert('등록 실패: ' + error.message);
    }
    transportModal.classList.remove('show');
    fetchTransport();
});

window.deleteTransport = async (id) => {
    if (confirm('삭제하시겠습니까?')) {
        await db.from('transportation_items').delete().eq('id', id);
        fetchTransport();
    }
};

/* ============================
   CMS LOGIC: ACCOMMODATION
============================ */
async function fetchAccommodations() {
    if (!db) return;
    const { data: items, error } = await db.from('accommodations').select('*').order('created_at', { ascending: true });

    if (error) {
        if (error.code === '42P01') {
            document.getElementById('accommodation-container').innerHTML = `<p style="color:#ffb74d">테이블이 없습니다! schema_v5.sql 실행 요망</p>`;
        }
        return;
    }

    const container = document.getElementById('accommodation-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:white;">등록된 숙소가 없습니다.</p>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.style.marginBottom = '1rem';

        const escapedName = item.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedAddr = (item.address || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        let adminHTML = '';
        if (currentUser) {
            const escapedUrl = (item.url || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedDesc = (item.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\r?\n/g, '\\n');

            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top:0.5rem;">
                    <button class="btn sm" onclick="openAccommodationModal('${item.id}', '${escapedName}', '${escapedUrl}', '${escapedAddr}', '${escapedDesc}')">수정</button>
                    <button class="btn sm" onclick="deleteAccommodation('${item.id}')">삭제</button>
                </div>
            `;
        }

        let urlHTML = '';
        if (item.url) urlHTML = `<a href="${item.url}" target="_blank" title="숙소 홈페이지 이동" style="text-decoration:none; margin-left:0.5rem; font-size:1.2rem;">🏠</a>`;

        let copyHTML = '';
        if (item.address) copyHTML = `<button class="btn sm" style="margin-left:0.5rem; padding:0.1rem 0.4rem; font-size:0.75rem; background:rgba(0,188,212,0.2); border:1px solid #00bcd4; color:#00bcd4;" onclick="copyAddress('${escapedAddr}')">복사</button>`;

        div.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #f48fb1;">
                <h3 style="margin-top:0; margin-bottom:0.2rem; color:#fff; display:flex; align-items:center;">
                    ${item.name} ${urlHTML}
                </h3>
                <p style="font-size:0.85rem; color:#b0bec5; margin-top:0; margin-bottom:0.5rem; display:flex; align-items:center;">
                    <span style="flex-shrink:0;">📍&nbsp;</span><span style="word-break:keep-all;">${item.address}</span> ${copyHTML}
                </p>
                <p style="color:#e3f2fd; font-size:0.95rem; margin-bottom: 0; line-height: 1.4; white-space: pre-wrap;">${item.description}</p>
                ${adminHTML}
            </div>
        `;
        container.appendChild(div);
    });
}

const accommodationModal = document.getElementById('accommodation-form-modal');
const accommodationForm = document.getElementById('accommodation-form');

document.getElementById('add-accommodation-btn').addEventListener('click', () => { openAccommodationModal(); });
document.getElementById('close-accommodation-modal').addEventListener('click', () => { accommodationModal.classList.remove('show'); });

window.openAccommodationModal = (id = null, name = '', url = '', address = '', desc = '') => {
    document.getElementById('accommodation-modal-title').innerText = id ? '숙소 수정' : '숙소 추가';
    document.getElementById('form-accommodation-id').value = id || '';
    document.getElementById('form-accommodation-name').value = name;
    document.getElementById('form-accommodation-url').value = url;
    document.getElementById('form-accommodation-address').value = address;
    document.getElementById('form-accommodation-description').value = desc;
    accommodationModal.classList.add('show');
};

accommodationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-accommodation-id').value;
    const data = {
        name: document.getElementById('form-accommodation-name').value,
        url: document.getElementById('form-accommodation-url').value,
        address: document.getElementById('form-accommodation-address').value,
        description: document.getElementById('form-accommodation-description').value
    };

    if (id) {
        const { error } = await db.from('accommodations').update(data).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
    } else {
        const { error } = await db.from('accommodations').insert([data]);
        if (error) alert('등록 실패: ' + error.message);
    }
    accommodationModal.classList.remove('show');
    fetchAccommodations();
});

window.deleteAccommodation = async (id) => {
    if (confirm('이 숙소를 삭제하시겠습니까?')) {
        await db.from('accommodations').delete().eq('id', id);
        fetchAccommodations();
    }
};

window.showToast = (message) => {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
};

window.copyAddress = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showToast('복사되었습니다!');
    }).catch(err => {
        showToast('복사 실패');
    });
};
