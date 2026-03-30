let db;
let currentUser = null;
let datePicker = null;
let timePicker = null;

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
        if (typeof fetchExpenses === 'function') fetchExpenses();

        // 달력 컨트롤 (Flatpickr) 초기화
        datePicker = flatpickr("#date-wrapper", {
            wrap: true,
            allowInput: true,
            locale: "ko",
            dateFormat: "Y-m-d",
            disableMobile: "true"
        });

        // 24시간제 시간 컨트롤 (Flatpickr) 초기화
        timePicker = flatpickr("#time-wrapper", {
            wrap: true,
            allowInput: true,
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            disableMobile: "true"
        });

        const togglePastBtn = document.getElementById('toggle-past-schedules');
        if (togglePastBtn) {
            togglePastBtn.addEventListener('change', () => {
                const isChecked = togglePastBtn.checked;
                document.querySelectorAll('.past-schedule-li').forEach(el => {
                    el.style.display = isChecked ? 'list-item' : 'none';
                });
                // Toggle headers based on visibility
                document.querySelectorAll('.date-header-li').forEach(headerLi => {
                    const dateMatch = headerLi.className.match(/date-(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        const dateStr = dateMatch[1];
                        const schedulesForDate = document.querySelectorAll(`.past-for-${dateStr}, .future-for-${dateStr}`);
                        let anyVisible = false;
                        schedulesForDate.forEach(el => {
                            if (el.style.display !== 'none') anyVisible = true;
                        });
                        headerLi.style.display = anyVisible ? 'list-item' : 'none';
                    }
                });
            });
        }

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
        if (typeof fetchExpenses === 'function') fetchExpenses();
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

        // Sync profile to public.profiles
        db.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            display_name: userName
        }).then(({ error }) => { if (error) console.error("Profile sync:", error); });

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

        if (schedule.schedule_date !== currentDate) {
            const dateObj = new Date(schedule.schedule_date);
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const dayStr = days[dateObj.getDay()];
            
            const headerLi = document.createElement('li');
            headerLi.className = `date-header-li date-${schedule.schedule_date}`;
            headerLi.innerHTML = `<strong style="display:block; margin-top:1rem; margin-bottom:0.5rem; font-size:1.15rem; color:#fff;">🌟 ${schedule.schedule_date} (${dayStr}요일)</strong>`;
            container.appendChild(headerLi);
            
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

        const authorText = schedule.created_by_name ? `<span style="font-size:0.75rem; color:#aaa; font-weight:normal; margin-left:0.5rem;">(등록: ${schedule.created_by_name})</span>` : '';

        const now = new Date();
        const scheduleDateTime = new Date(`${schedule.schedule_date}T${schedule.schedule_time}`);
        const isPast = scheduleDateTime < now;

        li.className = isPast ? `past-schedule-li past-for-${schedule.schedule_date}` : `future-schedule-li future-for-${schedule.schedule_date}`;
        const isChecked = document.getElementById('toggle-past-schedules') && document.getElementById('toggle-past-schedules').checked;
        li.style.display = (isPast && !isChecked) ? 'none' : 'list-item';

        li.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid #00bcd4;">
                <p style="color: #fff; font-weight:bold; margin-bottom: 0.3rem;">
                    [${schedule.schedule_time.slice(0, 5)}] ${schedule.title} ${authorText}
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

    const togglePastBtn = document.getElementById('toggle-past-schedules');
    if (togglePastBtn) togglePastBtn.dispatchEvent(new Event('change'));
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

    // Set values into elements safely via flatpickr
    if (datePicker && date) datePicker.setDate(date);
    else document.getElementById('form-date').value = date;

    if (timePicker && time) timePicker.setDate(time);
    else document.getElementById('form-time').value = time;

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

    const meta = currentUser.user_metadata || {};
    const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];

    if (id) {
        const { error: updateError } = await db.from('schedules').update(newData).eq('id', id);
        if (updateError) { alert('수정 실패: ' + updateError.message); return; }

        await db.from('schedule_histories').insert([{
            schedule_id: id,
            old_data: oldScheduleData,
            new_data: newData,
            changed_by_email: userName
        }]);
    } else {
        newData.created_by_email = currentUser.email;
        newData.created_by_name = userName;
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

    let userChecks = new Set();
    if (currentUser) {
        const { data: checks } = await db.from('packing_checks').select('packing_item_id').eq('profile_id', currentUser.id);
        if (checks) {
            checks.forEach(c => userChecks.add(c.packing_item_id));
        }
    }

    const container = document.getElementById('packing-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:white;">등록된 준비물이 없습니다.</p>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.style.background = 'rgba(0,0,0,0.2)';
        div.style.padding = '1rem';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '0.5rem';
        div.style.borderLeft = '3px solid #ffca28';

        let adminHTML = '';
        if (currentUser) {
            const escapedName = item.item_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top: 0.5rem;">
                    <button class="btn sm" onclick="openPackingModal('${item.id}', '${escapedName}')">수정</button>
                    <button class="btn sm" onclick="deletePacking('${item.id}', '${escapedName}')">삭제</button>
                </div>
            `;
        }

        const escapedNameForCheck = item.item_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const authorText = item.created_by_name ? `<br><span style="font-size:0.75rem; color:#aaa;">(등록: ${item.created_by_name})</span>` : '';

        const isChecked = userChecks.has(item.id);
        const checkedAttr = isChecked ? 'checked' : '';
        const textClass = isChecked ? 'packed-text' : '';
        const disabledAttr = currentUser ? '' : 'disabled="true"';

        div.innerHTML = `
            <div style="display:flex; align-items:flex-start; gap:0.5rem; color:#fff; font-size:1.05rem;">
                <input type="checkbox" id="pack-${item.id}" ${checkedAttr} ${disabledAttr} onchange="togglePacking('${item.id}', this.checked, '${escapedNameForCheck}')" style="width:18px; height:18px; accent-color:#ffca28; cursor:${currentUser ? 'pointer' : 'not-allowed'}; margin-top:0.25rem;">
                <label for="pack-${item.id}" class="${textClass}" id="label-pack-${item.id}" style="cursor:pointer; margin:0; word-break:break-all; flex:1;">${item.item_name} ${authorText}</label>
            </div>
            ${adminHTML}
        `;
        container.appendChild(div);
    });
}

const packingModal = document.getElementById('packing-form-modal');
const packingForm = document.getElementById('packing-form');

window.openPackingModal = (id = null, name = '') => {
    document.getElementById('form-packing-id').value = id || '';
    const inputField = document.getElementById('form-packing-name');
    inputField.value = name;
    inputField.dataset.oldName = name; // save old name explicitly directly
    document.getElementById('packing-modal-title').innerText = id ? '준비물 수정' : '준비물 추가';
    packingModal.classList.add('show');
};

document.getElementById('add-packing-btn').addEventListener('click', () => { openPackingModal(); });
document.getElementById('close-packing-modal').addEventListener('click', () => { packingModal.classList.remove('show'); });

packingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-packing-id').value;
    const newName = document.getElementById('form-packing-name').value;
    const userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];

    if (id) {
        const oldName = document.getElementById('form-packing-name').dataset.oldName || '';

        await db.from('packing_items').update({ item_name: newName }).eq('id', id);
        await db.from('packing_histories').insert([{
            packing_item_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            old_data: { item_name: oldName },
            new_data: { item_name: newName },
            action: 'UPDATE'
        }]);
    } else {
        const { data: inserted } = await db.from('packing_items').insert([{
            item_name: newName,
            created_by_email: currentUser.email,
            created_by_name: userName
        }]).select();

        if (inserted && inserted.length > 0) {
            await db.from('packing_histories').insert([{
                packing_item_id: inserted[0].id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                new_data: inserted[0],
                action: 'INSERT'
            }]);
        }
    }
    packingModal.classList.remove('show');
    fetchPacking();
});

window.togglePacking = async (id, isChecked, itemName) => {
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        const checkboxElem = document.getElementById(`pack-${id}`);
        if (checkboxElem) checkboxElem.checked = !isChecked; // revert
        return;
    }

    const label = document.getElementById(`label-pack-${id}`);
    if (label) {
        if (isChecked) label.classList.add('packed-text');
        else label.classList.remove('packed-text');
    }

    if (isChecked) {
        await db.from('packing_checks').upsert({
            packing_item_id: id,
            profile_id: currentUser.id
        });
    } else {
        await db.from('packing_checks').delete()
            .eq('packing_item_id', id)
            .eq('profile_id', currentUser.id);
    }
};

window.deletePacking = async (id, oldName) => {
    if (confirm('이 물품을 삭제하시겠습니까?')) {
        const userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];

        await db.from('packing_histories').insert([{
            packing_item_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            old_data: { item_name: oldName },
            action: 'DELETE'
        }]);

        await db.from('packing_items').delete().eq('id', id);
        fetchPacking();
    }
};

window.openPackingHistoryModal = async () => {
    if (!db) return;
    const { data: histories, error } = await db.from('packing_histories').select('*').order('created_at', { ascending: false }).limit(30);

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (error || !histories || histories.length === 0) {
        container.innerHTML = `<p style="color:white; text-align:center;">기록이 없습니다.</p>`;
    } else {
        histories.forEach(h => {
            const timeStr = new Date(h.created_at).toLocaleString('ko-KR');
            let actionText = '';
            if (h.action === 'INSERT') {
                actionText = `<span style="color:#64dd17;">[추가]</span> ${h.new_data?.item_name}`;
            } else if (h.action === 'UPDATE') {
                actionText = `<span style="color:#ffb300;">[수정]</span> ${h.old_data?.item_name} -> ${h.new_data?.item_name}`;
            } else if (h.action === 'DELETE') {
                actionText = `<span style="color:#ff1744;">[삭제]</span> ${h.old_data?.item_name}`;
            } else if (h.action === 'CHECKED') {
                actionText = `<span style="color:#29b6f6;">[체크]</span> ${h.new_data?.item_name}`;
            } else if (h.action === 'UNCHECKED') {
                actionText = `<span style="color:#9e9e9e;">[해제]</span> ${h.new_data?.item_name}`;
            }
            container.innerHTML += `
                <div class="history-item">
                    <p style="margin-bottom:0.3rem;">${actionText}</p>
                    <p class="meta" style="margin-top:0.2rem;">✍️ <b>${h.modified_by_name}</b> <span style="font-size:0.75rem;">(${timeStr})</span></p>
                </div>
            `;
        });
    }
    document.getElementById('history-modal').classList.add('show');
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
            const escapedOldData = encodeURIComponent(JSON.stringify({
                category: item.category, title: item.title, description: item.description
            }));

            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top:0.25rem;">
                    <button class="btn sm" onclick="openTransportModal('${item.id}', '${escapedCat}', '${escapedTitle}', '${escapedDesc}')">수정</button>
                    <button class="btn sm" onclick="deleteTransport('${item.id}', '${escapedOldData}')">삭제</button>
                </div>
            `;
        }

        const authorText = item.created_by_name ? `<span style="font-size:0.75rem; color:#aaa; font-weight:normal; margin-left:0.5rem;">(등록: ${item.created_by_name})</span>` : '';

        div.innerHTML = `
            <p style="margin-bottom:0.2rem;"><strong style="font-size:1.1rem; color:#fff;">${item.title}</strong> ${authorText}</p>
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

    if (id) {
        document.getElementById('form-transport-title').dataset.oldData = JSON.stringify({ category: cat, title, description: desc });
    }
    transportModal.classList.add('show');
};

transportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-transport-id').value;
    const meta = currentUser.user_metadata || {};
    const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];

    const data = {
        category: document.getElementById('form-transport-category').value,
        title: document.getElementById('form-transport-title').value,
        description: document.getElementById('form-transport-description').value
    };

    if (id) {
        const oldDataRaw = document.getElementById('form-transport-title').dataset.oldData;
        const oldData = oldDataRaw ? JSON.parse(oldDataRaw) : {};

        const { error } = await db.from('transportation_items').update(data).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
        else {
            await db.from('transportation_histories').insert([{
                transportation_id: id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                old_data: oldData,
                new_data: data,
                action: 'UPDATE'
            }]);
        }
    } else {
        data.created_by_email = currentUser.email;
        data.created_by_name = userName;
        const { data: inserted, error } = await db.from('transportation_items').insert([data]).select();

        if (error) alert('등록 실패: ' + error.message);
        else if (inserted && inserted.length > 0) {
            await db.from('transportation_histories').insert([{
                transportation_id: inserted[0].id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                new_data: inserted[0],
                action: 'INSERT'
            }]);
        }
    }
    transportModal.classList.remove('show');
    fetchTransport();
});

window.deleteTransport = async (id, oldDataRaw) => {
    if (confirm('삭제하시겠습니까?')) {
        const userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];
        const oldData = oldDataRaw ? JSON.parse(decodeURIComponent(oldDataRaw)) : {};

        await db.from('transportation_histories').insert([{
            transportation_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            old_data: oldData,
            action: 'DELETE'
        }]);

        await db.from('transportation_items').delete().eq('id', id);
        fetchTransport();
    }
};

window.openTransportHistoryModal = async () => {
    if (!db) return;
    const { data: histories, error } = await db.from('transportation_histories').select('*').order('created_at', { ascending: false }).limit(30);

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (error || !histories || histories.length === 0) {
        container.innerHTML = `<p style="color:white; text-align:center;">기록이 없습니다.</p>`;
    } else {
        histories.forEach(h => {
            const timeStr = new Date(h.created_at).toLocaleString('ko-KR');
            let actionText = '';
            if (h.action === 'INSERT') {
                actionText = `<span style="color:#64dd17;">[추가]</span> ${h.new_data?.title}`;
            } else if (h.action === 'UPDATE') {
                actionText = `<span style="color:#ffb300;">[수정]</span> ${h.old_data?.title} -> ${h.new_data?.title}`;
            } else if (h.action === 'DELETE') {
                actionText = `<span style="color:#ff1744;">[삭제]</span> ${h.old_data?.title}`;
            }
            container.innerHTML += `
                <div class="history-item">
                    <p style="margin-bottom:0.3rem;">${actionText}</p>
                    <p class="meta" style="margin-top:0.2rem;">✍️ <b>${h.modified_by_name}</b> <span style="font-size:0.75rem;">(${timeStr})</span></p>
                </div>
            `;
        });
    }
    document.getElementById('history-modal').classList.add('show');
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
            const escapedOldData = encodeURIComponent(JSON.stringify({
                name: item.name, url: item.url, address: item.address, description: item.description
            }));

            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top:0.5rem;">
                    <button class="btn sm" onclick="openAccommodationModal('${item.id}', '${escapedName}', '${escapedUrl}', '${escapedAddr}', '${escapedDesc}')">수정</button>
                    <button class="btn sm" onclick="deleteAccommodation('${item.id}', '${escapedOldData}')">삭제</button>
                </div>
            `;
        }

        let urlHTML = '';
        if (item.url) urlHTML = `<a href="${item.url}" target="_blank" title="숙소 홈페이지 이동" style="text-decoration:none; margin-left:0.5rem; font-size:1.2rem;">🏠</a>`;

        let copyHTML = '';
        if (item.address) copyHTML = `<button class="btn sm" style="margin-left:0.5rem; padding:0.1rem 0.4rem; font-size:0.75rem; background:rgba(0,188,212,0.2); border:1px solid #00bcd4; color:#00bcd4;" onclick="copyAddress('${escapedAddr}')">복사</button>`;

        const authorText = item.created_by_name ? `<span style="font-size:0.8rem; color:#aaa; font-weight:normal; margin-left:1rem;">(등록: ${item.created_by_name})</span>` : '';

        div.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #f48fb1;">
                <h3 style="margin-top:0; margin-bottom:0.2rem; color:#fff; display:flex; align-items:center;">
                    ${item.name} ${urlHTML} ${authorText}
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

    if (id) {
        document.getElementById('form-accommodation-name').dataset.oldData = JSON.stringify({ name, url, address, description: desc });
    }
    accommodationModal.classList.add('show');
};

accommodationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-accommodation-id').value;
    const meta = currentUser.user_metadata || {};
    const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];

    const data = {
        name: document.getElementById('form-accommodation-name').value,
        url: document.getElementById('form-accommodation-url').value,
        address: document.getElementById('form-accommodation-address').value,
        description: document.getElementById('form-accommodation-description').value
    };

    if (id) {
        const oldDataRaw = document.getElementById('form-accommodation-name').dataset.oldData;
        const oldData = oldDataRaw ? JSON.parse(oldDataRaw) : {};

        const { error } = await db.from('accommodations').update(data).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
        else {
            await db.from('accommodation_histories').insert([{
                accommodation_id: id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                old_data: oldData,
                new_data: data,
                action: 'UPDATE'
            }]);
        }
    } else {
        data.created_by_email = currentUser.email;
        data.created_by_name = userName;
        const { data: inserted, error } = await db.from('accommodations').insert([data]).select();

        if (error) alert('등록 실패: ' + error.message);
        else if (inserted && inserted.length > 0) {
            await db.from('accommodation_histories').insert([{
                accommodation_id: inserted[0].id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                new_data: inserted[0],
                action: 'INSERT'
            }]);
        }
    }
    accommodationModal.classList.remove('show');
    fetchAccommodations();
});

window.deleteAccommodation = async (id, oldDataRaw) => {
    if (confirm('이 숙소를 삭제하시겠습니까?')) {
        const userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];
        const oldData = oldDataRaw ? JSON.parse(decodeURIComponent(oldDataRaw)) : {};

        await db.from('accommodation_histories').insert([{
            accommodation_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            old_data: oldData,
            action: 'DELETE'
        }]);

        await db.from('accommodations').delete().eq('id', id);
        fetchAccommodations();
    }
};

window.openAccommodationHistoryModal = async () => {
    if (!db) return;
    const { data: histories, error } = await db.from('accommodation_histories').select('*').order('created_at', { ascending: false }).limit(30);

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (error || !histories || histories.length === 0) {
        container.innerHTML = `<p style="color:white; text-align:center;">기록이 없습니다.</p>`;
    } else {
        histories.forEach(h => {
            const timeStr = new Date(h.created_at).toLocaleString('ko-KR');
            let actionText = '';
            if (h.action === 'INSERT') {
                actionText = `<span style="color:#64dd17;">[추가]</span> ${h.new_data?.name}`;
            } else if (h.action === 'UPDATE') {
                actionText = `<span style="color:#ffb300;">[수정]</span> ${h.old_data?.name} -> ${h.new_data?.name}`;
            } else if (h.action === 'DELETE') {
                actionText = `<span style="color:#ff1744;">[삭제]</span> ${h.old_data?.name}`;
            }
            container.innerHTML += `
                <div class="history-item">
                    <p style="margin-bottom:0.3rem;">${actionText}</p>
                    <p class="meta" style="margin-top:0.2rem;">✍️ <b>${h.modified_by_name}</b> <span style="font-size:0.75rem;">(${timeStr})</span></p>
                </div>
            `;
        });
    }
    document.getElementById('history-modal').classList.add('show');
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

/* ============================
   CMS LOGIC: EXPENSES / SETTLEMENT
============================ */
async function fetchExpenses() {
    if (!db) return;

    // 1. Fetch profiles
    const { data: profiles, error: pError } = await db.from('profiles').select('*');
    if (pError) {
        if (pError.code === '42P01') {
            document.getElementById('expense-summary-container').innerHTML = `<p style="color:#ffb74d; text-align:center;">정산 테이블이 없습니다! schema_v9.sql 실행 요망</p>`;
        }
        return;
    }

    // 2. Fetch expenses
    const { data: expenses, error: eError } = await db.from('expenses').select('*').order('created_at', { ascending: true });
    if (eError) return;

    const listContainer = document.getElementById('expense-list-container');
    const summaryContainer = document.getElementById('expense-summary-container');
    listContainer.innerHTML = '';

    let totalExpense = 0;
    expenses.forEach(ex => {
        if (!ex.is_settled) totalExpense += ex.amount;
    });

    const numPeople = profiles.length;
    const perPerson = numPeople > 0 ? Math.floor(totalExpense / numPeople) : 0;

    // Initialize balances
    const balances = {};
    profiles.forEach(p => {
        balances[p.id] = { name: p.display_name || p.email.split('@')[0], paid: 0, delta: 0 };
    });

    expenses.forEach(ex => {
        if (ex.is_settled) return; // Skip settled expenses entirely for N split

        if (ex.payer_id && balances[ex.payer_id]) {
            balances[ex.payer_id].paid += ex.amount;
        } else if (ex.payer_id) {
            balances[ex.payer_id] = { name: ex.created_by_name || '알수없음', paid: ex.amount, delta: 0 };
        }
    });

    // Calculate deltas and Render Summary
    let summaryHTML = `<h3 style="color:#00e676; margin-top:0; margin-bottom:0.5rem; text-align:center; font-size:1.3rem;">총 경비: ${totalExpense.toLocaleString()}원</h3>`;
    if (numPeople > 0) {
        summaryHTML += `<p style="text-align:center; color:#e3f2fd; margin-bottom:1rem; font-size:1rem;">참석 인원: ${numPeople}명 | <strong style="color:#ffca28;">1인당: ${perPerson.toLocaleString()}원</strong></p>`;
        summaryHTML += `<div style="display:flex; flex-direction:column; gap:0.5rem; font-size: 0.95rem;">`;

        Object.values(balances).forEach(b => {
            b.delta = b.paid - perPerson;
            let statusHTML = '';
            if (b.delta > 0) {
                statusHTML = `<strong style="color:#00e676;">+${b.delta.toLocaleString()}원 받기</strong>`;
            } else if (b.delta < 0) {
                statusHTML = `<strong style="color:#ff4081;">${Math.abs(b.delta).toLocaleString()}원 분담하기</strong>`;
            } else {
                statusHTML = `<span style="color:#b0bec5;">정산 완료 (0원)</span>`;
            }

            summaryHTML += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.4rem;">
                <span style="color:#fff;">${b.name} <span style="font-size:0.75rem; color:#aaa; margin-left:0.3rem;">[총 ${b.paid.toLocaleString()}원 지출]</span></span>
                <span>${statusHTML}</span>
            </div>`;
        });
        summaryHTML += `</div>`;
    } else {
        summaryHTML += `<p style="color:#fff; text-align:center;">등록된 로그인 유저 프로필이 없습니다.</p>`;
    }
    summaryContainer.innerHTML = summaryHTML;

    // Render expense list
    if (!expenses || expenses.length === 0) {
        listContainer.innerHTML = `<p style="color:white; text-align:center;">등록된 지출 내역이 없습니다.</p>`;
        return;
    }

    expenses.forEach(item => {
        const div = document.createElement('div');
        div.style.background = 'rgba(0,0,0,0.2)';
        div.style.padding = '1rem';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '0.5rem';
        div.style.borderLeft = '3px solid #00bcd4';

        let adminHTML = '';
        const isOwner = currentUser && (currentUser.email === item.created_by_email || currentUser.id === item.payer_id);

        if (currentUser && isOwner) {
            const escapedTitle = item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const escapedOldData = encodeURIComponent(JSON.stringify({ title: item.title, amount: item.amount }));
            adminHTML = `
                <div class="action-buttons admin-only" style="margin-top: 0.5rem;">
                    <button class="btn sm" onclick="openExpenseModal('${item.id}', '${escapedTitle}', ${item.amount})">수정</button>
                    <button class="btn sm" onclick="deleteExpense('${item.id}', '${escapedOldData}')">삭제</button>
                </div>
            `;
        }

        const authorText = item.created_by_name ? `<br><span style="font-size:0.75rem; color:#aaa;">(결제: ${item.created_by_name})</span>` : '';
        const disabledAttr = isOwner ? '' : 'disabled="true"';
        const checkedAttr = item.is_settled ? 'checked' : '';
        const textClass = item.is_settled ? 'packed-text' : '';
        const escapedTitleForCheck = item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        let checkboxHTML = '';
        if (currentUser) {
            checkboxHTML = `<input type="checkbox" id="expense-chk-${item.id}" ${checkedAttr} ${disabledAttr} onchange="toggleSettlement('${item.id}', this, '${escapedTitleForCheck}')" style="width:18px; height:18px; accent-color:#00e676; cursor:${isOwner ? 'pointer' : 'not-allowed'}; margin-top:0.25rem;">`;
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; gap:0.5rem; align-items:flex-start;">
                    ${checkboxHTML}
                    <p style="margin:0; color:#fff; font-size:1.05rem;" id="label-expense-${item.id}" class="${textClass}">💸 ${item.title} ${authorText}</p>
                </div>
                <strong style="color:#ffca28; font-size:1.1rem; flex-shrink:0; margin-left:0.5rem;">${item.amount.toLocaleString()}원</strong>
            </div>
            ${adminHTML}
        `;
        listContainer.appendChild(div);
    });
}

const expenseModal = document.getElementById('expense-form-modal');
const expenseForm = document.getElementById('expense-form');

window.openExpenseModal = (id = null, title = '', amount = '') => {
    document.getElementById('form-expense-id').value = id || '';
    document.getElementById('form-expense-title').value = title;
    document.getElementById('form-expense-amount').value = amount;

    if (id) {
        document.getElementById('form-expense-title').dataset.oldData = JSON.stringify({ title, amount });
    }

    document.getElementById('expense-modal-title').innerText = id ? '지출 내역 수정' : '지출 내역 추가';
    expenseModal.classList.add('show');
};

document.getElementById('add-expense-btn')?.addEventListener('click', () => openExpenseModal());
document.getElementById('close-expense-modal')?.addEventListener('click', () => expenseModal.classList.remove('show'));

expenseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-expense-id').value;
    const title = document.getElementById('form-expense-title').value;
    const amount = parseInt(document.getElementById('form-expense-amount').value, 10) || 0;

    const meta = currentUser.user_metadata || {};
    const userName = meta.display_name || meta.full_name || meta.name || currentUser.email.split('@')[0];

    const data = {
        title: title,
        amount: amount,
        payer_id: currentUser.id
    };

    if (id) {
        const oldDataRaw = document.getElementById('form-expense-title').dataset.oldData;
        const oldData = oldDataRaw ? JSON.parse(oldDataRaw) : {};

        const { error } = await db.from('expenses').update(data).eq('id', id);
        if (error) alert('수정 실패: ' + error.message);
        else {
            await db.from('expense_histories').insert([{
                expense_id: id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                old_data: oldData,
                new_data: data,
                action: 'UPDATE'
            }]);
        }
    } else {
        data.created_by_email = currentUser.email;
        data.created_by_name = userName;
        const { data: inserted, error } = await db.from('expenses').insert([data]).select();

        if (error) alert('등록 실패: ' + error.message);
        else if (inserted && inserted.length > 0) {
            await db.from('expense_histories').insert([{
                expense_id: inserted[0].id,
                modified_by_email: currentUser.email,
                modified_by_name: userName,
                new_data: inserted[0],
                action: 'INSERT'
            }]);
        }
    }
    expenseModal.classList.remove('show');
    fetchExpenses();
});

window.deleteExpense = async (id, oldDataRaw) => {
    if (confirm('이 지출 내역을 삭제하시겠습니까?')) {
        const userName = currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];
        const oldData = oldDataRaw ? JSON.parse(decodeURIComponent(oldDataRaw)) : {};

        await db.from('expense_histories').insert([{
            expense_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            old_data: oldData,
            action: 'DELETE'
        }]);

        await db.from('expenses').delete().eq('id', id);
        fetchExpenses();
    }
};

window.toggleSettlement = async (id, checkboxElem, title) => {
    const isChecked = checkboxElem.checked;
    const msg = isChecked ? '정산완료 처리하시겠습니까?' : '정산완료를 취소하시겠습니까?';
    if (!confirm(msg)) {
        checkboxElem.checked = !isChecked; // revert
        return;
    }

    const label = document.getElementById(`label-expense-${id}`);
    if (label) {
        if (isChecked) label.classList.add('packed-text');
        else label.classList.remove('packed-text');
    }

    const { error } = await db.from('expenses').update({ is_settled: isChecked }).eq('id', id);
    if (!error && currentUser) {
        const userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];
        const actionStr = isChecked ? 'SETTLED' : 'UNSETTLED';
        await db.from('settlement_histories').insert([{
            expense_id: id,
            modified_by_email: currentUser.email,
            modified_by_name: userName,
            action: actionStr
        }]);
    }

    fetchExpenses();
};

window.openExpenseHistoryModal = async () => {
    if (!db) return;
    const { data: histories, error } = await db.from('expense_histories').select('*').order('created_at', { ascending: false }).limit(30);

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (error || !histories || histories.length === 0) {
        container.innerHTML = `<p style="color:white; text-align:center;">기록이 없습니다.</p>`;
    } else {
        histories.forEach(h => {
            const timeStr = new Date(h.created_at).toLocaleString('ko-KR');
            let actionText = '';
            if (h.action === 'INSERT') {
                actionText = `<span style="color:#64dd17;">[추가]</span> ${h.new_data?.title} - ${Number(h.new_data?.amount).toLocaleString()}원`;
            } else if (h.action === 'UPDATE') {
                actionText = `<span style="color:#ffb300;">[수정]</span> ${h.old_data?.title} -> ${h.new_data?.title} (${Number(h.new_data?.amount).toLocaleString()}원)`;
            } else if (h.action === 'DELETE') {
                actionText = `<span style="color:#ff1744;">[삭제]</span> ${h.old_data?.title}`;
            }
            container.innerHTML += `
                <div class="history-item">
                    <p style="margin-bottom:0.3rem;">${actionText}</p>
                    <p class="meta" style="margin-top:0.2rem;">✍️ <b>${h.modified_by_name}</b> <span style="font-size:0.75rem;">(${timeStr})</span></p>
                </div>
            `;
        });
    }
    document.getElementById('history-modal').classList.add('show');
};

window.openSettlementHistoryModal = async () => {
    if (!db) return;
    const { data: histories, error } = await db.from('settlement_histories').select('*, expenses(title)').order('created_at', { ascending: false }).limit(30);

    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (error || !histories || histories.length === 0) {
        container.innerHTML = `<p style="color:white; text-align:center;">기록이 없습니다.</p>`;
    } else {
        histories.forEach(h => {
            const timeStr = new Date(h.created_at).toLocaleString('ko-KR');
            let actionText = '';
            const expenseTitle = h.expenses?.title || '알 수 없는 지출';
            if (h.action === 'SETTLED') {
                actionText = `<span style="color:#00e676;">[정산완료 처리]</span> ${expenseTitle}`;
            } else if (h.action === 'UNSETTLED') {
                actionText = `<span style="color:#ff4081;">[정산완료 취소]</span> ${expenseTitle}`;
            }
            container.innerHTML += `
                <div class="history-item">
                    <p style="margin-bottom:0.3rem;">${actionText}</p>
                    <p class="meta" style="margin-top:0.2rem;">✍️ <b>${h.modified_by_name}</b> <span style="font-size:0.75rem;">(${timeStr})</span></p>
                </div>
            `;
        });
    }
    document.getElementById('history-modal').classList.add('show');
};
