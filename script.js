const editIconSVG = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const deleteIconSVG = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

let notifCountNum = 0;
let currentUser = null; 
let attendanceChartInstance = null;

let undoStack = [];
let redoStack = [];

function recordAction(actionType, description, undoData, redoData) {
    undoStack.push({ type: actionType, desc: description, undo: undoData, redo: redoData });
    redoStack = [];
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function triggerUndo() {
    if (undoStack.length === 0) return;
    let action = undoStack.pop();
    redoStack.push(action);
    if (action.undo && typeof action.undo === 'function') {
        action.undo();
    }
    updateUndoRedoButtons();
    window.showToast(`گەڕانەوە (Undo): ${action.desc}`, 'warning', 'مێژوو');
}

function triggerRedo() {
    if (redoStack.length === 0) return;
    let action = redoStack.pop();
    undoStack.push(action);
    if (action.redo && typeof action.redo === 'function') {
        action.redo();
    }
    updateUndoRedoButtons();
    window.showToast(`پێشڕەوی (Redo): ${action.desc}`, 'success', 'مێژوو');
}

window.toggleForm = function(formId) {
    let form = document.getElementById(formId);
    if (form) {
        form.classList.toggle('show');
    }
};

// فەنکشنی چاپکردنی ڕاپۆرت (Print / PDF)
window.printCurrentReport = function() {
    window.print();
};

// فەنکشنی داگرتنی کۆپی یەدەگ (Backup)
window.exportDataBackup = function() {
    let backupData = {
        students: globalStudentsData,
        subjects: globalSubjectsData,
        teachers: globalTeachersData,
        studentSchedules: globalStudentSchedulesData,
        teacherSchedules: globalTeacherSchedulesData,
        tuition: globalTuitionData,
        backupDate: new Date().toISOString()
    };
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "student_system_backup_" + new Date().toISOString().slice(0,10) + ".json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.showToast('کۆپی یەدەگ بە سەرکەوتوویی دابەزێنرا', 'success', 'یەدەگ');
};

// فەنکشنی گەڕانەوەی داتا لە فایلی یەدەگ (Restore)
window.importDataRestore = async function(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = async function(e) {
        try {
            let jsonContent = JSON.parse(e.target.result);
            if (confirm("ئایا دڵنیایت لە بارکردنەوەی ئەم فایلە یەدەگە؟ تکایە دڵنیا ببەوە کە فایلەکە ڕاستە.")) {
                showLoading();
                setTimeout(() => {
                    hideLoading();
                    window.showToast('فایلی یەدەگ بە سەرکەوتوویی خوێنرایەوە!', 'success', 'یەدەگ');
                }, 1000);
            }
        } catch(err) {
            hideLoading();
            window.showToast('فایلەکە هەڵەیە یان ناخوێنرێتەوە!', 'error', 'یەدەگ');
        }
    };
    reader.readAsText(file);
};

let inactivityTime = function () {
    let time;
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    function logoutDueToInactivity() {
        if (currentUser) {
            handleLogout();
            alert("بەکارهێنەر بە خودکار دەرچوو بەهۆی نەبوونی هیچ جووڵەیەک (Session Timeout)!");
        }
    }
    function resetTimer() {
        clearTimeout(time);
        time = setTimeout(logoutDueToInactivity, 15 * 60 * 1000);
    }
};
inactivityTime();

function showLoading() { document.getElementById('loadingSpinner').style.display = 'flex'; }
function hideLoading() { document.getElementById('loadingSpinner').style.display = 'none'; }

window.switchAuthCard = function(cardId) {
    document.querySelectorAll('.login-card').forEach(card => card.classList.remove('active'));
    document.getElementById(cardId).classList.add('active');
};

window.showToast = function(message, type = 'success', sectionName = '', actionBy = '') {
    let toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = 'toast-notification show ' + type;
    setTimeout(() => { toast.className = 'toast-notification'; }, 2500);

    let list = document.getElementById('notifList');
    let item = document.createElement('div');
    item.className = 'notif-item ' + type;
    let timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let byUser = actionBy || (currentUser ? currentUser.name : 'سیستەم');
    let sectionText = sectionName ? ` [بەشی: ${sectionName}]` : '';

    item.innerHTML = `
        <div>${message} <span class="notif-section-span">${sectionText}</span></div>
        <span class="notif-by">ئەنجامدەر: ${byUser}</span>
        <span class="notif-time">${timeNow}</span>
    `;
    list.prepend(item);
    notifCountNum++;
    document.getElementById('notifCount').innerText = notifCountNum;
};

window.toggleNotifPanel = function() {
    let panel = document.getElementById('notifPanel');
    if (panel.style.display === 'flex') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'flex';
        notifCountNum = 0;
        document.getElementById('notifCount').innerText = '0';
    }
};

window.clearNotifLogs = function() {
    document.getElementById('notifList').innerHTML = '';
};

function updateInternetSpeed() {
    let speedText = document.getElementById('speedValue');
    let dot = document.getElementById('speedDot');
    if (!navigator.onLine) {
        speedText.innerText = "پچڕاوە";
        dot.className = "speed-indicator offline";
        return;
    }
    let startTime = new Date().getTime();
    let image = new Image();
    image.onload = function () {
        let endTime = new Date().getTime();
        let pingTime = endTime - startTime; 
        speedText.innerText = pingTime + " ms";
        if (pingTime < 200) {
            dot.className = "speed-indicator"; 
        } else {
            dot.className = "speed-indicator offline"; 
        }
    };
    image.onerror = function () {
        speedText.innerText = "پچڕاوە";
        dot.className = "speed-indicator offline";
    };
    image.src = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png?t=" + startTime;
}

setInterval(updateInternetSpeed, 4000);
window.addEventListener('online', updateInternetSpeed);
window.addEventListener('offline', updateInternetSpeed);

window.exportTableToExcel = function(tableId, filename = 'report.xlsx') {
    let table = document.getElementById(tableId);
    if (!table) return;
    let wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(wb, filename);
    window.showToast('ڕاپۆرتەکە بە سەرکەوتوویی دابەزێنرا بۆ ئێکسڵ', 'success', 'داگرتنی ئێکسڵ');
};

function updateDashboardStats() {
    let totalStudents = globalStudentsData.length;
    let totalTeachers = globalTeachersData.length;
    let totalSubjects = globalSubjectsData.length;
    
    document.getElementById('statStudentsCount').innerText = totalStudents;
    document.getElementById('statTeachersCount').innerText = totalTeachers;
    document.getElementById('statSubjectsCount').innerText = totalSubjects;

    let presentCount = 0, absentCount = 0;
    globalStudentsData.forEach(st => {
        if (st.attendanceStatus === 'present') presentCount++;
        else if (st.attendanceStatus === 'absent') absentCount++;
    });
    let totalRecorded = presentCount + absentCount;
    let rate = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;
    document.getElementById('statAttendanceRate').innerText = rate + "%";

    let ctx = document.getElementById('attendanceChart').getContext('2d');
    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }
    let presentText = currentLang === 'en' ? 'Present' : (currentLang === 'ar' ? 'حاضر' : 'ئامادە');
    let absentText = currentLang === 'en' ? 'Absent' : (currentLang === 'ar' ? 'غائب' : 'غائیب');
    
    attendanceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [presentText, absentText],
            datasets: [{
                data: [presentCount, absentCount],
                backgroundColor: ['#2ecc71', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

const translations = {
    ku: {
        pageTitle: "سیستەمی بەڕێوەبردنی قوتابیان",
        menuBtnText: "بەڕێوەبردن",
        sidebarTitle: "بەڕێوەبردن",
        navDashboard: "داشبۆرد و ئامارەکان",
        navStudents: "تۆمارکردنی قوتابیان",
        navViewStudents: "پشکنینی بەش و قۆناغەکان",
        navSubjects: "تۆمارکردنی بابەتەکان",
        navGrades: "نەتیجە و نمرەکان",
        navStudentSchedule: "خشتەی قوتابیان",
        navTeacherSchedule: "خشتەی مامۆستایان",
        navTeachers: "مامۆستایان",
        navTuition: "پارەی خوێندن و قیستەکان",
        navProfile: "پڕۆفایلی من",
        navAttendance: "ئامادەبوون",
        themeBtnText: "دۆخی تاریک",
        lblNotifTitle: "تۆماری ئاگادارییەکان",
        lblCurrentUser: "بەکارهێنەری ئێستا: ",
        btnLogoutText: "دەربازبوون (Logout)"
    },
    ar: {
        pageTitle: "نظام إدارة الطلاب",
        menuBtnText: "الإدارة",
        sidebarTitle: "الإدارة",
        navDashboard: "لوحة القيادة والإحصائيات",
        navStudents: "تسجيل الطلاب",
        navViewStudents: "فحص الأقسام والمراحل",
        navSubjects: "تسجيل المواد",
        navGrades: "النتائج والدرجات",
        navStudentSchedule: "جدول الطلاب",
        navTeacherSchedule: "جدول الأساتذة",
        navTeachers: "الأساتذة",
        navTuition: "الأقساط والرسوم",
        navProfile: "ملفي الشخصي",
        navAttendance: "الحضور والغياب",
        themeBtnText: "الوضع الليلي",
        lblNotifTitle: "سجل الإشعارات",
        lblCurrentUser: "المستخدم الحالي: ",
        btnLogoutText: "تسجيل الخروج (Logout)"
    },
    en: {
        pageTitle: "Student Management System",
        menuBtnText: "Management",
        sidebarTitle: "Management",
        navDashboard: "Dashboard & Stats",
        navStudents: "Student Registration",
        navViewStudents: "View Dept & Grades",
        navSubjects: "Subject Registration",
        navGrades: "Results & Grades",
        navStudentSchedule: "Student Schedule",
        navTeacherSchedule: "Teacher Schedule",
        navTeachers: "Teachers",
        navTuition: "Tuition & Fees",
        navProfile: "My Profile",
        navAttendance: "Attendance",
        themeBtnText: "Dark Mode",
        lblNotifTitle: "Notifications Log",
        lblCurrentUser: "Current User: ",
        btnLogoutText: "Logout"
    }
};

window.changeLanguage = function(lang) {
    currentLang = lang;
    let html = document.getElementById('htmlTag');
    if (lang === 'en') {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
    } else if (lang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
    } else {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ku');
    }
    let t = translations[lang];
    for (let key in t) {
        let el = document.getElementById(key);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.innerText = t[key];
            }
        }
    }
    localStorage.setItem('siteLang', lang);
    updateDashboardStats();
};

window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('active');
};

window.openTab = function(tabId, element, closeMenu = false) {
    let contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    let buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    let targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    if (element) {
        element.classList.add('active');
    } else if (tabId !== 'profile') {
        let btn = document.querySelector(`.tab-btn[onclick*="'${tabId}'"]`);
        if (btn) btn.classList.add('active');
    }
    
    if (tabId === 'profile') { loadProfileData(); }
    else if (tabId === 'dashboard') { updateDashboardStats(); }
    else if (tabId === 'viewStudents' && window.filterStudentsTable) { window.filterStudentsTable(); }
    else if (tabId === 'grades' && window.updateGradeSubjectsDropdown) { window.updateGradeSubjectsDropdown(); }
    else if (tabId === 'attendance' && window.filterAttendanceTable) { window.filterAttendanceTable(); }
    else if (tabId === 'subjects' && window.filterSubjectsTable) { window.filterSubjectsTable(); }
    else if (tabId === 'tuition' && window.renderTuitionTable) { window.renderTuitionTable(); }

    localStorage.setItem('activeTab', tabId);
    if (closeMenu) { document.getElementById('sidebar').classList.remove('active'); }
};

window.toggleTheme = function() {
    let body = document.body;
    body.classList.toggle('dark-mode');
    let isDark = body.classList.contains('dark-mode');
    let t = translations[currentLang];
    document.getElementById('themeBtnText').innerText = isDark ? (currentLang === 'en' ? 'Light Mode' : (currentLang === 'ar' ? 'الوضع المضيء' : 'دۆخی ڕووناکی')) : t.themeBtnText;
};

window.checkSpecialization = function() {
    let dept = document.getElementById('studentDept').value;
    let grade = parseInt(document.getElementById('studentGrade').value);
    let specSelect = document.getElementById('specializationGroup');
    if (dept === "زانستی کۆمپیوتەر" && (grade === 4 || grade === 5)) {
        specSelect.style.display = "block";
    } else {
        specSelect.style.display = "none";
        specSelect.value = "";
    }
};

window.checkSubjectSpecialization = function() {
    let dept = document.getElementById('subjectDept').value;
    let grade = parseInt(document.getElementById('subjectGrade').value);
    let specSelect = document.getElementById('subjectSpecializationGroup');
    if (dept === "زانستی کۆمپیوتەر" && (grade === 4 || grade === 5)) {
        specSelect.style.display = "block";
    } else {
        specSelect.style.display = "none";
        specSelect.value = "";
    }
};

window.checkFilterSpecialization = function() {
    let dept = document.getElementById('filterDept').value;
    let gradeVal = document.getElementById('filterGrade').value;
    let grade = parseInt(gradeVal);
    let filterSpecGroup = document.getElementById('filterSpecGroup');
    if (dept === "زانستی کۆمپیوتەر" && (grade === 4 || grade === 5)) {
        filterSpecGroup.style.display = "block";
    } else {
        filterSpecGroup.style.display = "none";
        document.getElementById('filterSpec').value = "";
    }
    if (window.filterStudentsTable) window.filterStudentsTable();
};

window.checkAttFilterSpecialization = function() {
    let dept = document.getElementById('attFilterDept').value;
    let gradeVal = document.getElementById('attFilterGrade').value;
    let grade = parseInt(gradeVal);
    let attFilterSpecGroup = document.getElementById('attFilterSpecGroup');
    if (dept === "زانستی کۆمپیوتەر" && (grade === 4 || grade === 5)) {
        attFilterSpecGroup.style.display = "block";
    } else {
        attFilterSpecGroup.style.display = "none";
        document.getElementById('attFilterSpec').value = "";
    }
    if (window.filterAttendanceTable) window.filterAttendanceTable();
};

window.checkGradeFilterSpecialization = function() {
    let dept = document.getElementById('gradeFilterDept').value;
    let gradeVal = document.getElementById('gradeFilterGrade').value;
    let grade = parseInt(gradeVal);
    let gradeFilterSpecGroup = document.getElementById('gradeFilterSpecGroup');
    if (dept === "زانستی کۆمپیوتەر" && (grade === 4 || grade === 5)) {
        gradeFilterSpecGroup.style.display = "block";
    } else {
        gradeFilterSpecGroup.style.display = "none";
        document.getElementById('gradeFilterSpec').value = "";
    }
    if (window.updateGradeSubjectsDropdown) window.updateGradeSubjectsDropdown();
};

let itemToDeleteId = null;
let deleteCollectionName = '';
window.openDeleteModal = function(id, collectionName) {
    itemToDeleteId = id;
    deleteCollectionName = collectionName;
    document.getElementById('deleteModal').style.display = 'flex';
};
window.closeDeleteModal = function() {
    itemToDeleteId = null;
    deleteCollectionName = '';
    document.getElementById('deleteModal').style.display = 'none';
};
window.closeAttendanceHistoryModal = function() { document.getElementById('attendanceHistoryModal').style.display = 'none'; };
window.closeAvgModal = function() { document.getElementById('avgModal').style.display = 'none'; };
window.closeAllGradesModal = function() { document.getElementById('allGradesModal').style.display = 'none'; };

function applyUserPermissions() {
    if (!currentUser) return;
    document.getElementById('currentUserName').innerText = currentUser.name;
    let isUserAdmin = (currentUser.role === 'admin');
    document.getElementById('currentUserRole').innerText = isUserAdmin ? 'بەڕێوەبەر' : 'مامۆستا';
    document.getElementById('sidebarUserName').innerText = currentUser.name;
    document.getElementById('sidebarUserRoleText').innerText = isUserAdmin ? 'بەڕێوەبەر (Admin)' : 'مامۆستا (Teacher)';
    if (currentUser.avatar) {
        document.getElementById('sidebarUserAvatar').src = currentUser.avatar;
    } else {
        document.getElementById('sidebarUserAvatar').src = "https://via.placeholder.com/35";
    }
    let navStudents = document.getElementById('navStudents');
    let navSubjects = document.getElementById('navSubjects');
    let navTeachers = document.getElementById('navTeachers');
    let navStudentSchedule = document.getElementById('navStudentSchedule');
    let navTeacherSchedule = document.getElementById('navTeacherSchedule');
    
    if (!isUserAdmin) {
        navStudents.style.display = 'none';
        navSubjects.style.display = 'none';
        navTeachers.style.display = 'none';
        navStudentSchedule.style.display = 'none';
        navTeacherSchedule.style.display = 'none';
    } else {
        navStudents.style.display = 'block';
        navSubjects.style.display = 'block';
        navTeachers.style.display = 'block';
        navStudentSchedule.style.display = 'block';
        navTeacherSchedule.style.display = 'block';
    }
}

window.handleLogout = function() {
    currentUser = null;
    sessionStorage.removeItem('appUser');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    window.switchAuthCard('cardSignIn');
};

let currentLang = 'ku';
window.addEventListener('DOMContentLoaded', () => {
    let savedLang = localStorage.getItem('siteLang') || 'ku';
    document.getElementById('langSelect').value = savedLang;
    window.changeLanguage(savedLang);
    updateInternetSpeed();
    
    let savedUser = sessionStorage.getItem('appUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('loginScreen').style.display = 'none';
        applyUserPermissions();
        
        let initialTab = localStorage.getItem('activeTab') || 'dashboard';
        let btn = document.querySelector(`.tab-btn[onclick*="'${initialTab}'"]`);
        window.openTab(initialTab, btn, false);
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

// Firebase & Module Logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, arrayUnion, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBftSnUkGn_N8vpgHspICH4kU54eamgXz0",
    authDomain: "student-admin-d3c1c.firebaseapp.com",
    projectId: "student-admin-d3c1c",
    storageBucket: "student-admin-d3c1c.firebasestorage.app",
    messagingSenderId: "871463920181",
    appId: "1:871463920181:web:33488c0f0ee2fa2d07877c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let globalStudentsData = [];
let globalSubjectsData = [];
let globalTeachersData = [];
let globalStudentSchedulesData = [];
let globalTeacherSchedulesData = [];
let globalTuitionData = [];
let generatedVerificationCode = "";
let targetResetUser = null;
let isResetUserAdmin = false;
let regVerificationCode = "";
let pendingRegData = null;
let matchedTeacherDocId = null;

window.handleLogin = async function() {
    let username = document.getElementById('loginUsername').value.trim();
    let password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
        window.showToast('تکایە ناوی بەکارهێنەر و وشەی نهێنی پڕبکەرەوە!', 'warning', 'چوونەژوورەوە');
        return;
    }
    showLoading();
    try {
        let adminDoc = await getDoc(doc(db, "settings", "adminAccount"));
        let adminData = adminDoc.exists() ? adminDoc.data() : { username: 'admin', password: 'admin123', name: 'بەڕێوەبەر', email: 'admin@system.com', teacherId: 'admin' };
        if (username === adminData.username && password === adminData.password) {
            currentUser = { role: 'admin', username: adminData.username, name: adminData.name, email: adminData.email || '', avatar: adminData.avatar || '', password: adminData.password, teacherId: adminData.teacherId || 'admin' };
            sessionStorage.setItem('appUser', JSON.stringify(currentUser));
            document.getElementById('loginScreen').style.display = 'none';
            applyUserPermissions();
            window.showToast('بە سەرکەوتوویی چوویە ژوورەوە وەک بەڕێوەبەر', 'success', 'چوونەژوورەوە');
            let initialTab = localStorage.getItem('activeTab') || 'dashboard';
            let btn = document.querySelector(`.tab-btn[onclick*="'${initialTab}'"]`);
            window.openTab(initialTab, btn, false);
            hideLoading();
            return;
        }
        let teacher = globalTeachersData.find(t => String(t.username) === String(username) && String(t.password) === String(password));
        if (teacher) {
            let userRole = teacher.role || 'teacher';
            currentUser = { role: userRole, username: teacher.username, name: teacher.name, id: teacher.id, teacherId: teacher.teacherId, phone: teacher.phone, email: teacher.email, avatar: teacher.avatar, password: teacher.password };
            sessionStorage.setItem('appUser', JSON.stringify(currentUser));
            document.getElementById('loginScreen').style.display = 'none';
            applyUserPermissions();
            window.showToast(`بە سەرکەوتوویی چوویە ژوورەوە وەک ${teacher.name}`, 'success', 'چوونەژوورەوە');
            let initialTab = localStorage.getItem('activeTab') || (userRole === 'admin' ? 'dashboard' : 'grades');
            let btn = document.querySelector(`.tab-btn[onclick*="'${initialTab}'"]`);
            window.openTab(initialTab, btn, false);
        } else {
            window.showToast('ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە!', 'error', 'چوونەژوورەوە');
        }
    } finally {
        hideLoading();
    }
};

window.handleSendRegCode = function() {
    let teacherId = document.getElementById('regTeacherId').value.trim();
    let name = document.getElementById('regName').value.trim();
    let username = document.getElementById('regUsername').value.trim();
    let password = document.getElementById('regPassword').value.trim();
    let phone = document.getElementById('regPhone').value.trim();
    let email = document.getElementById('regEmail').value.trim();
    if (!teacherId || !name || !username || !password || !email) {
        window.showToast('تکایە هەموو خانەکان بە تەواوی پڕبکەرەوە!', 'warning', 'خۆتۆمارکردن');
        return;
    }
    let existingTeacher = globalTeachersData.find(t => String(t.teacherId) === String(teacherId));
    if (!existingTeacher) {
        window.showToast('ئەم ئایدییە (Teacher ID) لە سیستەمەکەدا بوونی نییە!', 'error', 'خۆتۆمارکردن');
        return;
    }
    if (existingTeacher.password && existingTeacher.username) {
        window.showToast('ئەم ئایدییە پێشتر هەژماری بۆ دروستکراوە!', 'warning', 'خۆتۆمارکردن');
        return;
    }
    matchedTeacherDocId = existingTeacher.id;
    pendingRegData = { name, teacherId, username, password, phone, email, role: existingTeacher.role || 'teacher', avatar: "" };
    regVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    showLoading();
    emailjs.send('service_ok3752i', 'template_jc7u3du', { email: email, passcode: regVerificationCode })
    .then(function(response) {
        hideLoading();
        window.showToast('کۆدی دڵنیایی بە سەرکەوتوویی نێردرا بۆ ئیمەیلەکەت!', 'success', 'خۆتۆمارکردن');
        document.getElementById('regStepData').style.display = 'none';
        document.getElementById('regStepVerify').style.display = 'block';
    }, function(error) {
        hideLoading();
        window.showToast('هەڵەیەک ڕوویدا لە ناردنی ئیمەیلەکە!', 'error', 'خۆتۆمارکردن');
    });
};

window.handleVerifyAndCompleteSignUp = async function() {
    let enteredCode = document.getElementById('regEnteredCode').value.trim();
    if (!enteredCode || enteredCode !== regVerificationCode) {
        window.showToast('کۆدی دڵنیایی هەڵەیە!', 'error', 'خۆتۆمارکردن');
        return;
    }
    showLoading();
    try {
        await updateDoc(doc(db, "teachers", matchedTeacherDocId), { ...pendingRegData, updatedAt: serverTimestamp() });
        window.showToast('هەژمارەکەت بە سەرکەوتوویی فعال کرا!', 'success', 'خۆتۆمارکردن', pendingRegData.name);
        document.getElementById('regStepVerify').style.display = 'none';
        document.getElementById('regStepData').style.display = 'block';
        pendingRegData = null; regVerificationCode = ""; matchedTeacherDocId = null;
        window.switchAuthCard('cardSignIn');
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'خۆتۆمارکردن');
    } finally {
        hideLoading();
    }
};

window.handleSendVerifyCode = async function() {
    let teacherId = document.getElementById('resetTeacherId').value.trim();
    let contact = document.getElementById('resetContact').value.trim();
    if (!teacherId || !contact) {
        window.showToast('تکایە ئای دی و ئیمەیل پڕبکەرەوە!', 'warning', 'گۆڕینی وشەی نهێنی');
        return;
    }
    showLoading();
    try {
        let adminDoc = await getDoc(doc(db, "settings", "adminAccount"));
        let adminData = adminDoc.exists() ? adminDoc.data() : { username: 'admin', password: 'admin123', name: 'بەڕێوەبەر', email: 'admin@system.com', teacherId: 'admin' };
        let teacher = globalTeachersData.find(t => String(t.teacherId) === String(teacherId) && String(t.email) === String(contact));
        if (String(adminData.teacherId || 'admin') === String(teacherId) && adminData.email === contact) {
            targetResetUser = adminData; isResetUserAdmin = true;
        } else if (teacher) {
            targetResetUser = teacher; isResetUserAdmin = false;
        } else {
            hideLoading();
            window.showToast('ئەم ئایدییە یان ئیمەیڵە تۆمار نەکراوە!', 'error', 'گۆڕینی وشەی نهێنی');
            return;
        }
        generatedVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        emailjs.send('service_ok3752i', 'template_jc7u3du', { email: contact, passcode: generatedVerificationCode })
        .then(function(response) {
            hideLoading();
            window.showToast('کۆدی دڵنیایی نێردرا بۆ ئیمەیلەکەت!', 'success', 'گۆڕینی وشەی نهێنی');
            document.getElementById('stepRequestCode').style.display = 'none';
            document.getElementById('stepVerifyAndReset').style.display = 'block';
        }, function(error) {
            hideLoading();
            window.showToast('هەڵەیەک ڕوویدا لە ناردنی ئیمەیلەکە!', 'error', 'گۆڕینی وشەی نهێنی');
        });
    } catch(e) {
        hideLoading();
    }
};

window.handleVerifyAndResetPassword = async function() {
    let enteredCode = document.getElementById('enteredVerifyCode').value.trim();
    let newPassword = document.getElementById('resetNewPassword').value.trim();
    if (!enteredCode || enteredCode !== generatedVerificationCode) {
        window.showToast('کۆدی دڵنیایی هەڵەیە!', 'error', 'گۆڕینی وشەی نهێنی');
        return;
    }
    showLoading();
    try {
        if (isResetUserAdmin) {
            await setDoc(doc(db, "settings", "adminAccount"), { ...targetResetUser, password: newPassword }, { merge: true });
        } else {
            await updateDoc(doc(db, "teachers", targetResetUser.id), { password: newPassword });
        }
        window.showToast('پاسووردەکەت بە سەرکەوتوویی گۆڕدرا!', 'success', 'گۆڕینی وشەی نهێنی', targetResetUser.name);
        document.getElementById('stepVerifyAndReset').style.display = 'none';
        document.getElementById('stepRequestCode').style.display = 'block';
        targetResetUser = null; generatedVerificationCode = "";
        window.switchAuthCard('cardSignIn');
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'گۆڕینی وشەی نهێنی');
    } finally {
        hideLoading();
    }
};

window.saveTeacher = async function() {
    let docId = document.getElementById('teacherDocId').value;
    let name = document.getElementById('teacherNameInput').value.trim();
    let teacherId = document.getElementById('teacherIdInput').value.trim();
    let role = document.getElementById('teacherRoleInput').value;
    if (!name || !teacherId) {
        window.showToast('تکایە ناو و ئای دی پڕبکەرەوە!', 'warning', 'مامۆستایان');
        return;
    }
    showLoading();
    try {
        if (docId) {
            let oldTeacherData = globalTeachersData.find(t => t.id === docId);
            await updateDoc(doc(db, "teachers", docId), { name, teacherId, role });
            
            recordAction('edit_teacher', `دەستکاری مامۆستا: ${name}`, 
                async () => { await updateDoc(doc(db, "teachers", docId), oldTeacherData); },
                async () => { await updateDoc(doc(db, "teachers", docId), { name, teacherId, role }); }
            );

            window.showToast(`دەستکاری زانیاری مامۆستا کرا`, 'success', 'مامۆستایان');
            document.getElementById('teacherDocId').value = '';
            document.getElementById('saveTeacherBtnText').innerText = 'پاشەکەوتکردنی مامۆستا';
        } else {
            let docRef = await addDoc(collection(db, "teachers"), { name, teacherId, role, username: "", password: "", phone: "", email: "", avatar: "", createdAt: serverTimestamp() });
            
            recordAction('add_teacher', `زیادکردنی مامۆستا: ${name}`,
                async () => { await deleteDoc(doc(db, "teachers", docRef.id)); },
                async () => { await setDoc(doc(db, "teachers", docRef.id), { name, teacherId, role, username: "", password: "", phone: "", email: "", avatar: "", createdAt: serverTimestamp() }); }
            );

            window.showToast(`مامۆستا (${name}) تۆمارکرا`, 'success', 'مامۆستایان');
        }
        document.getElementById('teacherNameInput').value = '';
        document.getElementById('teacherIdInput').value = '';
        document.getElementById('teacherRoleInput').value = 'teacher';
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'مامۆستایان');
    } finally {
        hideLoading();
    }
};

window.prepareEditTeacher = function(docId, name, teacherId, role) {
    document.getElementById('teacherDocId').value = docId;
    document.getElementById('teacherNameInput').value = name;
    document.getElementById('teacherIdInput').value = teacherId || '';
    document.getElementById('teacherRoleInput').value = role || 'teacher';
    document.getElementById('saveTeacherBtnText').innerText = 'پاشەکەوتکردنی دەستکاری';
    document.getElementById('teacherFormContainer').classList.add('show');
    window.openTab('teachers', document.getElementById('navTeachers'), false);
};

window.renderTuitionStudentsDropdown = function() {
    let select = document.getElementById('tuitionStudentSelect');
    if(!select) return;
    select.innerHTML = '<option value="" disabled selected>هەڵبژاردنی قوتابی...</option>';
    globalStudentsData.forEach(st => {
        let opt = document.createElement('option');
        opt.value = st.id;
        opt.innerText = `${st.name} (${st.uniqueId || '-'})`;
        select.appendChild(opt);
    });
};

window.saveTuition = async function() {
    let studentId = document.getElementById('tuitionStudentSelect').value;
    let total = parseFloat(document.getElementById('tuitionTotal').value) || 0;
    let paid = parseFloat(document.getElementById('tuitionPaid').value) || 0;
    if (!studentId || total <= 0) {
        window.showToast('تکایە قوتابی و کۆی گشتی پارە دیاری بکە!', 'warning', 'پارەی خوێندن');
        return;
    }
    let remaining = total - paid;
    let status = remaining <= 0 ? 'تەواو دراوە' : 'ماوەی قیست';
    showLoading();
    try {
        let existing = globalTuitionData.find(t => t.studentId === studentId);
        if(existing) {
            await updateDoc(doc(db, "tuition", existing.id), { total, paid, remaining, status });
        } else {
            let st = globalStudentsData.find(s => s.id === studentId);
            await addDoc(collection(db, "tuition"), { studentId, studentName: st ? st.name : '', uniqueId: st ? st.uniqueId : '', total, paid, remaining, status, createdAt: serverTimestamp() });
        }
        window.showToast('پارەی خوێندن بە سەرکەوتوویی پاشەکەوتکرا', 'success', 'پارەی خوێندن');
        document.getElementById('tuitionTotal').value = '';
        document.getElementById('tuitionPaid').value = '';
        document.getElementById('tuitionStudentSelect').value = '';
        renderTuitionTable();
    } catch(e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'پارەی خوێندن');
    } finally {
        hideLoading();
    }
};

window.renderTuitionTable = function() {
    let table = document.getElementById('tuitionTable');
    if(!table) return;
    table.innerHTML = "";
    let searchVal = (document.getElementById('searchTuitionInput')?.value || "").toLowerCase();
    let count = 0;
    globalTuitionData.forEach(item => {
        let nameMatch = (item.studentName || "").toLowerCase().includes(searchVal);
        let idMatch = (item.uniqueId || "").toLowerCase().includes(searchVal);
        if(!searchVal || nameMatch || idMatch) {
            count++;
            let row = table.insertRow();
            row.insertCell(0).innerText = item.studentName;
            row.insertCell(1).innerText = item.uniqueId || '-';
            row.insertCell(2).innerText = item.total;
            row.insertCell(3).innerText = item.paid;
            row.insertCell(4).innerText = item.remaining;
            let badgeClass = item.remaining <= 0 ? 'status-passed' : 'status-failed';
            row.insertCell(5).innerHTML = `<span class="status-badge ${badgeClass}">${item.status}</span>`;
            row.insertCell(6).innerHTML = `<button class="icon-btn delete-icon" onclick="window.openDeleteModal('${item.id}', 'tuition')">${deleteIconSVG}</button>`;
        }
    });
};

onSnapshot(collection(db, "tuition"), (snapshot) => {
    globalTuitionData = [];
    snapshot.forEach(docSnap => {
        globalTuitionData.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderTuitionTable();
});

window.loadProfileData = async function() {
    if (!currentUser) return;
    if (currentUser.role === 'admin' && !globalTeachersData.some(t => t.username === currentUser.username)) {
        document.getElementById('teacherProfileFields').style.display = 'none';
        let adminDoc = await getDoc(doc(db, "settings", "adminAccount"));
        let adminData = adminDoc.exists() ? adminDoc.data() : { username: 'admin', password: 'admin123', name: 'بەڕێوەبەر', avatar: '' };
        document.getElementById('profileName').value = adminData.name || 'بەڕێوەبەر';
        document.getElementById('profileUsername').value = adminData.username || 'admin';
        if (adminData.avatar) document.getElementById('profileAvatarPreview').src = adminData.avatar;
    } else {
        document.getElementById('teacherProfileFields').style.display = 'block';
        let teacher = globalTeachersData.find(t => t.username === currentUser.username);
        if (teacher) {
            document.getElementById('profileName').value = teacher.name || '';
            document.getElementById('profileUsername').value = teacher.username || '';
            document.getElementById('profilePhone').value = teacher.phone || '';
            document.getElementById('profileEmail').value = teacher.email || '';
            if (teacher.avatar) document.getElementById('profileAvatarPreview').src = teacher.avatar;
        }
    }
};

let tempUploadedAvatar = "";
window.previewProfileImage = function(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            tempUploadedAvatar = e.target.result;
            document.getElementById('profileAvatarPreview').src = tempUploadedAvatar;
        };
        reader.readAsDataURL(file);
    }
};

window.saveMyProfile = async function() {
    if (!currentUser) return;
    let name = document.getElementById('profileName').value.trim();
    let username = document.getElementById('profileUsername').value.trim();
    let oldPassInput = document.getElementById('profileOldPassword');
    let newPassInput = document.getElementById('profileNewPassword');
    let confirmPassInput = document.getElementById('profileConfirmPassword');
    let oldPassword = oldPassInput.value.trim();
    let newPassword = newPassInput.value.trim();
    let confirmPassword = confirmPassInput.value.trim();

    if (!name || !username) {
        window.showToast('ناو و ناوی بەکارهێنەر پێویستن!', 'warning', 'پڕۆفایلی من');
        return;
    }
    showLoading();
    try {
        if (currentUser.role === 'admin' && !globalTeachersData.some(t => t.username === currentUser.username)) {
            let adminDoc = await getDoc(doc(db, "settings", "adminAccount"));
            let currentAdminPass = (adminDoc.exists() && adminDoc.data().password) ? adminDoc.data().password : 'admin123';
            let updateAdminData = { name, username, email: currentUser.email || 'admin@system.com', teacherId: currentUser.teacherId || 'admin' };
            if (oldPassword || newPassword || confirmPassword) {
                if (oldPassword !== currentAdminPass) {
                    window.showToast('وشەی نهێنی کۆن هەڵەیە!', 'error', 'پڕۆفایلی من');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    window.showToast('وشەی نهێنی نوێ یەکتر ناگرنەوە!', 'error', 'پڕۆفایلی من');
                    return;
                }
                updateAdminData.password = newPassword;
            } else {
                updateAdminData.password = currentAdminPass;
            }
            if (tempUploadedAvatar) updateAdminData.avatar = tempUploadedAvatar;
            await setDoc(doc(db, "settings", "adminAccount"), updateAdminData, { merge: true });
            currentUser.name = name; currentUser.username = username; currentUser.password = updateAdminData.password;
            if (updateAdminData.avatar) currentUser.avatar = updateAdminData.avatar;
            sessionStorage.setItem('appUser', JSON.stringify(currentUser));
            applyUserPermissions();
            window.showToast('پڕۆفایل نوێکرایەوە!', 'success', 'پڕۆفایلی من');
        } else {
            let teacher = globalTeachersData.find(t => t.username === currentUser.username);
            if (!teacher) return;
            let phone = document.getElementById('profilePhone').value.trim();
            let email = document.getElementById('profileEmail').value.trim();
            let updateData = { name, username, phone, email };
            if (oldPassword || newPassword || confirmPassword) {
                if (oldPassword !== teacher.password) {
                    window.showToast('وشەی نهێنی کۆن هەڵەیە!', 'error', 'پڕۆفایلی من');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    window.showToast('وشەی نهێنی نوێ یەکتر ناگرنەوە!', 'error', 'پڕۆفایلی من');
                    return;
                }
                updateData.password = newPassword;
            }
            if (tempUploadedAvatar) updateData.avatar = tempUploadedAvatar;
            await updateDoc(doc(db, "teachers", teacher.id), updateData);
            currentUser.name = name; currentUser.username = username;
            if (updateData.password) currentUser.password = updateData.password;
            if (updateData.avatar) currentUser.avatar = updateData.avatar;
            sessionStorage.setItem('appUser', JSON.stringify(currentUser));
            applyUserPermissions();
            window.showToast('پڕۆفایل نوێکرایەوە!', 'success', 'پڕۆفایلی من');
        }
    } finally {
        hideLoading();
    }
};

onSnapshot(collection(db, "teachers"), (snapshot) => {
    globalTeachersData = [];
    snapshot.forEach(docSnap => {
        let item = docSnap.data();
        let id = docSnap.id;
        globalTeachersData.push({ id, ...item });
    });
    renderTeachersTable();
    renderTeachersDropdown();
    updateDashboardStats();
    if (currentUser) loadProfileData();
});

function renderTeachersDropdown() {
    let select = document.getElementById('subjectTeacher');
    if(!select) return;
    select.innerHTML = '<option value="" selected id="optSubTeacher">دیاریکردنی مامۆستا</option>';
    globalTeachersData.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.name; 
        opt.innerText = item.name;
        select.appendChild(opt);
    });
}

function renderTeachersTable() {
    let table = document.getElementById('teachersTable');
    if(!table) return;
    table.innerHTML = "";
    let searchVal = (document.getElementById('searchTeachersInput').value || "").toLowerCase();
    let idx = 0;
    globalTeachersData.forEach(item => {
        let nameMatch = (item.name || "").toLowerCase().includes(searchVal);
        let idMatch = (item.teacherId || "").toLowerCase().includes(searchVal);
        if (!searchVal || nameMatch || idMatch) {
            idx++;
            let row = table.insertRow();
            row.insertCell(0).innerHTML = `<strong>${idx}</strong>`;
            row.insertCell(1).innerText = item.name;
            row.insertCell(2).innerText = item.teacherId || '-';
            let roleText = (item.role === 'admin') ? 'بەڕێوەبەر (Admin)' : 'مامۆستای ئاسایی';
            row.insertCell(3).innerHTML = `<span class="status-badge ${item.role === 'admin' ? 'status-passed' : ''}">${roleText}</span>`;
            
            let assignedSubs = globalSubjectsData.filter(s => s.teacherName === item.name).map(s => s.name).join(', ');
            row.insertCell(4).innerText = assignedSubs || '-';

            row.insertCell(5).innerHTML = `
                <button class="icon-btn edit-icon" onclick="window.prepareEditTeacher('${item.id}', '${item.name}', '${item.teacherId || ''}', '${item.role || 'teacher'}')">${editIconSVG}</button>
                <button class="icon-btn delete-icon" onclick="window.openDeleteModal('${item.id}', 'teachers')">${deleteIconSVG}</button>
            `;
        }
    });
}

window.saveStudent = async function() {
    let id = document.getElementById('studentId').value;
    let name = document.getElementById('studentName').value.trim();
    let uniqueId = document.getElementById('studentUniqueId').value.trim();
    let phone = document.getElementById('studentPhone').value.trim();
    let dept = document.getElementById('studentDept').value;
    let grade = document.getElementById('studentGrade').value;
    let spec = document.getElementById('specializationGroup').value;
    let section = document.getElementById('studentSection').value;

    if (!name || !uniqueId || !dept || !grade || !section) {
        window.showToast('تکایە خانە پێویستەکان پڕبکەرەوە!', 'warning', 'تۆمارکردنی قوتابیان');
        return;
    }
    showLoading();
    try {
        if (id) {
            let oldData = globalStudentsData.find(s => s.id === id);
            await updateDoc(doc(db, "students", id), { name, uniqueId, phone, dept, grade, spec, section });
            
            recordAction('edit_student', `دەستکاری قوتابی: ${name}`,
                async () => { await updateDoc(doc(db, "students", id), oldData); },
                async () => { await updateDoc(doc(db, "students", id), { name, uniqueId, phone, dept, grade, spec, section }); }
            );

            window.showToast(`دەستکاری قوتابی کرا`, 'success', 'تۆمارکردنی قوتابیان');
            document.getElementById('studentId').value = '';
            document.getElementById('saveStudentBtn').innerText = 'پاشەکەوتکردنی قوتابی';
        } else {
            let docRef = await addDoc(collection(db, "students"), { name, uniqueId, phone, dept, grade, spec, section, attendanceHistory: [], gradesData: {}, createdAt: serverTimestamp() });
            
            recordAction('add_student', `زیادکردنی قوتابی: ${name}`,
                async () => { await deleteDoc(doc(db, "students", docRef.id)); },
                async () => { await setDoc(doc(db, "students", docRef.id), { name, uniqueId, phone, dept, grade, spec, section, attendanceHistory: [], gradesData: {}, createdAt: serverTimestamp() }); }
            );

            window.showToast(`قوتابی (${name}) زیادکرا`, 'success', 'تۆمارکردنی قوتابیان');
        }
        document.getElementById('studentName').value = '';
        document.getElementById('studentUniqueId').value = '';
        document.getElementById('studentPhone').value = '';
        document.getElementById('studentDept').value = '';
        document.getElementById('studentGrade').value = '';
        document.getElementById('specializationGroup').value = '';
        document.getElementById('studentSection').value = '';
        window.checkSpecialization();
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'تۆمارکردنی قوتابیان');
    } finally {
        hideLoading();
    }
};

window.prepareEdit = function(id, name, uniqueId, phone, dept, grade, spec, section) {
    document.getElementById('studentId').value = id;
    document.getElementById('studentName').value = name;
    document.getElementById('studentUniqueId').value = uniqueId || '';
    document.getElementById('studentPhone').value = phone || '';
    document.getElementById('studentDept').value = dept || '';
    document.getElementById('studentGrade').value = grade;
    window.checkSpecialization();
    document.getElementById('specializationGroup').value = spec || '';
    document.getElementById('studentSection').value = section;
    document.getElementById('saveStudentBtn').innerText = 'پاشەکەوتکردنی دەستکاری';
    document.getElementById('studentFormContainer').classList.add('show');
    window.openTab('students', document.getElementById('navStudents'), false);
};

window.filterStudentsTable = function() {
    let activeTabId = document.querySelector('.tab-content.active').id;
    let searchVal = "";
    let selectedDept = "هەمووان";
    let selectedGradeVal = "هەموو قۆناغەکان";
    let selectedSpec = "";

    if (activeTabId === 'students') {
        searchVal = (document.getElementById('searchStudentsInput').value || "").toLowerCase();
    } else if (activeTabId === 'viewStudents') {
        searchVal = (document.getElementById('searchViewStudentsInput').value || "").toLowerCase();
        selectedDept = document.getElementById('filterDept').value;
        selectedGradeVal = document.getElementById('filterGrade').value;
        selectedSpec = document.getElementById('filterSpec').value;
    }

    let table = (activeTabId === 'students') ? document.getElementById('studentTable') : document.getElementById('filteredStudentTable');
    table.innerHTML = "";
    let count = 0;
    globalStudentsData.forEach(item => {
        let matchesDept = (selectedDept === "هەمووان") ? true : (item.dept === selectedDept);
        let matchesGrade = (selectedGradeVal === "هەموو قۆناغەکان") ? true : (String(item.grade) === String(selectedGradeVal));
        let matchesSpec = true;
        if (item.dept === "زانستی کۆمپیوتەر" && (item.grade == 4 || item.grade == 5)) {
            if (selectedSpec !== "") matchesSpec = (item.spec === selectedSpec);
        }
        let nameMatch = (item.name || "").toLowerCase().includes(searchVal);
        let idMatch = (item.uniqueId || "").toLowerCase().includes(searchVal);
        let phoneMatch = (item.phone || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || nameMatch || idMatch || phoneMatch;

        if (matchesDept && matchesGrade && matchesSpec && matchesSearch) {
            count++;
            let row = table.insertRow();
            row.insertCell(0).innerHTML = `<strong>${count}</strong>`;
            row.insertCell(1).innerText = item.name;
            row.insertCell(2).innerText = item.uniqueId || '-';
            row.insertCell(3).innerText = item.phone || '-';
            row.insertCell(4).innerText = item.dept;
            row.insertCell(5).innerText = item.grade;
            row.insertCell(6).innerText = item.spec || '-';
            row.insertCell(7).innerText = item.section;
            row.insertCell(8).innerHTML = `
                <button class="icon-btn edit-icon" onclick="window.prepareEdit('${item.id}', '${item.name}', '${item.uniqueId || ''}', '${item.phone || ''}', '${item.dept}', '${item.grade}', '${item.spec || ''}', '${item.section}')">${editIconSVG}</button>
                <button class="icon-btn delete-icon" onclick="window.openDeleteModal('${item.id}', 'students')">${deleteIconSVG}</button>
            `;
        }
    });
};

window.saveSubject = async function() {
    let id = document.getElementById('subjectId').value;
    let name = document.getElementById('subjectName').value.trim();
    let dept = document.getElementById('subjectDept').value;
    let grade = document.getElementById('subjectGrade').value;
    let spec = document.getElementById('subjectSpecializationGroup').value;
    let teacherName = document.getElementById('subjectTeacher').value;
    if (!name || !dept || !grade) {
        window.showToast('تکایە خانە سەرەکییەکان پڕبکەرەوە!', 'warning', 'تۆمارکردنی بابەتەکان');
        return;
    }
    showLoading();
    try {
        if (id) {
            let oldSubj = globalSubjectsData.find(s => s.id === id);
            await updateDoc(doc(db, "subjects", id), { name, dept, grade, spec: spec || "", teacherName: teacherName || "" });
            
            recordAction('edit_subject', `دەستکاری بابەت: ${name}`,
                async () => { await updateDoc(doc(db, "subjects", id), oldSubj); },
                async () => { await updateDoc(doc(db, "subjects", id), { name, dept, grade, spec: spec || "", teacherName: teacherName || "" }); }
            );

            window.showToast(`دەستکاری بابەت کرا`, 'success', 'تۆمارکردنی بابەتەکان');
            document.getElementById('subjectId').value = '';
            document.getElementById('saveSubjBtn').innerText = 'پاشەکەوتکردنی بابەت';
        } else {
            let docRef = await addDoc(collection(db, "subjects"), { name, dept, grade, spec: spec || "", teacherName: teacherName || "", createdAt: serverTimestamp() });
            
            recordAction('add_subject', `زیادکردنی بابەت: ${name}`,
                async () => { await deleteDoc(doc(db, "subjects", docRef.id)); },
                async () => { await setDoc(doc(db, "subjects", docRef.id), { name, dept, grade, spec: spec || "", teacherName: teacherName || "", createdAt: serverTimestamp() }); }
            );

            window.showToast(`بابەتی (${name}) زیادکرا`, 'success', 'تۆمارکردنی بابەتەکان');
        }
        document.getElementById('subjectName').value = '';
        document.getElementById('subjectDept').value = '';
        document.getElementById('subjectGrade').value = '';
        document.getElementById('subjectSpecializationGroup').value = '';
        document.getElementById('subjectTeacher').value = '';
        window.checkSubjectSpecialization();
        window.filterSubjectsTable();
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'تۆمارکردنی بابەتەکان');
    } finally {
        hideLoading();
    }
};

window.prepareEditSubject = function(id, name, dept, grade, spec, teacherName) {
    document.getElementById('subjectId').value = id;
    document.getElementById('subjectName').value = name;
    document.getElementById('subjectDept').value = dept || '';
    document.getElementById('subjectGrade').value = grade || '';
    window.checkSubjectSpecialization();
    document.getElementById('subjectSpecializationGroup').value = spec || '';
    document.getElementById('subjectTeacher').value = teacherName || '';
    document.getElementById('saveSubjBtn').innerText = 'پاشەکەوتکردنی دەستکاری';
    document.getElementById('subjectFormContainer').classList.add('show');
    window.openTab('subjects', document.getElementById('navSubjects'), false);
};

window.filterSubjectsTable = function() {
    let filterDept = document.getElementById('subFilterDept').value;
    let filterGrade = document.getElementById('subFilterGrade').value;
    let searchVal = (document.getElementById('searchSubjectsInput').value || "").toLowerCase();
    let table = document.getElementById('subjectsTable');
    table.innerHTML = "";
    globalSubjectsData.forEach(item => {
        let matchesDept = (filterDept === "هەمووان") ? true : (item.dept === filterDept);
        let matchesGrade = filterGrade === "" ? true : String(item.grade) === String(filterGrade);
        let nameMatch = (item.name || "").toLowerCase().includes(searchVal);
        let teacherMatch = (item.teacherName || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || nameMatch || teacherMatch;

        if (matchesDept && matchesGrade && matchesSearch) {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.name;
            row.insertCell(1).innerText = item.dept;
            row.insertCell(2).innerText = item.grade;
            row.insertCell(3).innerText = item.spec || '-';
            row.insertCell(4).innerText = item.teacherName || '-';
            row.insertCell(5).innerHTML = `
                <button class="icon-btn edit-icon" onclick="window.prepareEditSubject('${item.id}', '${item.name}', '${item.dept}', '${item.grade}', '${item.spec || ''}', '${item.teacherName || ''}')">${editIconSVG}</button>
                <button class="icon-btn delete-icon" onclick="window.openDeleteModal('${item.id}', 'subjects')">${deleteIconSVG}</button>
            `;
        }
    });
    renderTeachersTable();
};

onSnapshot(collection(db, "subjects"), (snapshot) => {
    globalSubjectsData = [];
    snapshot.forEach(docSnap => {
        globalSubjectsData.push({ id: docSnap.id, ...docSnap.data() });
    });
    window.filterSubjectsTable();
    updateDashboardStats();
    if (window.updateGradeSubjectsDropdown) window.updateGradeSubjectsDropdown();
});

window.updateGradeSubjectsDropdown = function() {
    let dept = document.getElementById('gradeFilterDept').value;
    let grade = document.getElementById('gradeFilterGrade').value;
    let subjSelect = document.getElementById('gradeSubjectSelect');
    subjSelect.innerHTML = `<option value="">هەڵبژاردنی بابەت...</option>`;
    let matched = globalSubjectsData.filter(s => {
        let matchesDept = (dept === "هەمووان") ? true : (s.dept === dept);
        let matchesGrade = String(s.grade) === String(grade);
        return matchesDept && matchesGrade;
    });
    if (currentUser && currentUser.role === 'teacher') {
        matched = matched.filter(s => s.teacherName === currentUser.name);
    }
    matched.forEach(subj => {
        let opt = document.createElement('option');
        opt.value = subj.name;
        opt.innerText = subj.name + (subj.spec ? ` [${subj.spec}]` : '') + (subj.teacherName ? ` (${subj.teacherName})` : '');
        subjSelect.appendChild(opt);
    });
    window.filterGradesTable();
};

window.calcRowGrades = function(idx) {
    let m1 = parseFloat(document.getElementById(`m1_${idx}`).value) || 0;
    let m2 = parseFloat(document.getElementById(`m2_${idx}`).value) || 0;
    let course = m1 + m2;
    document.getElementById(`course_${idx}`).innerText = course;
    let finalExam = parseFloat(document.getElementById(`fe_${idx}`).value) || 0;
    let total = course + finalExam;
    document.getElementById(`total_${idx}`).innerText = total;
    let statusCell = document.getElementById(`status_${idx}`);
    if (total >= 50) {
        let passText = currentLang === 'en' ? 'Passed' : (currentLang === 'ar' ? 'ناجح' : 'دەرچووە');
        statusCell.innerHTML = `<span class="status-badge status-passed">${passText}</span>`;
    } else {
        let failText = currentLang === 'en' ? 'Failed' : (currentLang === 'ar' ? 'راسب' : 'کەوتووە');
        statusCell.innerHTML = `<span class="status-badge status-failed">${failText}</span>`;
    }
};

window.saveRowGrade = async function(studentId, idx) {
    let subjName = document.getElementById('gradeSubjectSelect').value;
    if (!subjName) {
        window.showToast('تکایە بابەتێک هەڵبژێرە!', 'warning', 'نەتیجە و نمرەکان');
        return;
    }
    let m1 = parseFloat(document.getElementById(`m1_${idx}`).value) || 0;
    let m2 = parseFloat(document.getElementById(`m2_${idx}`).value) || 0;
    let course = m1 + m2;
    let finalExam = parseFloat(document.getElementById(`fe_${idx}`).value) || 0;
    let total = course + finalExam;
    let student = globalStudentsData.find(s => s.id === studentId);
    if (!student) return;
    
    let oldGradesData = JSON.parse(JSON.stringify(student.gradesData || {}));
    let gradesData = student.gradesData || {};
    gradesData[subjName] = { m1, m2, course, finalExam, total };
    showLoading();
    try {
        await updateDoc(doc(db, "students", studentId), { gradesData });
        
        recordAction('edit_grade', `نمرەی قوتابی: ${student.name}`,
            async () => { await updateDoc(doc(db, "students", studentId), { gradesData: oldGradesData }); },
            async () => { await updateDoc(doc(db, "students", studentId), { gradesData }); }
        );

        window.showToast(`نمرە پاشەکەوتکرا [کۆ: ${total}]`, 'success', 'نەتیجە و نمرەکان');
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'نەتیجە و نمرەکان');
    } finally {
        hideLoading();
    }
};

window.filterGradesTable = function() {
    let dept = document.getElementById('gradeFilterDept').value;
    let grade = document.getElementById('gradeFilterGrade').value;
    let spec = document.getElementById('gradeFilterSpec').value;
    let subjName = document.getElementById('gradeSubjectSelect').value;
    let searchVal = (document.getElementById('searchGradesInput').value || "").toLowerCase();
    let table = document.getElementById('gradesTable');
    table.innerHTML = "";
    if (!subjName) return;

    globalStudentsData.forEach((student, idx) => {
        let matchesDept = (dept === "هەمووان") ? true : (student.dept === dept);
        let matchesGrade = String(student.grade) === String(grade);
        let matchesSpec = true;
        if (student.dept === "زانستی کۆمپیوتەر" && (student.grade == 4 || student.grade == 5)) {
            if (spec !== "") matchesSpec = (student.spec === spec);
        }
        let nameMatch = (student.name || "").toLowerCase().includes(searchVal);
        let idMatch = (student.uniqueId || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || nameMatch || idMatch;

        if (matchesDept && matchesGrade && matchesSpec && matchesSearch) {
            let sGrades = (student.gradesData && student.gradesData[subjName]) ? student.gradesData[subjName] : {};
            let m1 = sGrades.m1 || 0;
            let m2 = sGrades.m2 || 0;
            let course = sGrades.course || (m1 + m2);
            let finalExam = sGrades.finalExam || 0;
            let total = sGrades.total || (course + finalExam);
            let passKu = (currentLang === 'en' ? 'Passed' : (currentLang === 'ar' ? 'ناجح' : 'دەرچووە'));
            let failKu = (currentLang === 'en' ? 'Failed' : (currentLang === 'ar' ? 'راسب' : 'کەوتووە'));
            let statusHtml = total >= 50 ? `<span class="status-badge status-passed">${passKu}</span>` : `<span class="status-badge status-failed">${failKu}</span>`;

            let row = table.insertRow();
            row.insertCell(0).innerText = student.name;
            row.insertCell(1).innerText = student.uniqueId || '-';
            row.insertCell(2).innerHTML = `<input type="number" id="m1_${idx}" class="grade-input" min="0" max="20" value="${m1}" oninput="window.calcRowGrades('${idx}')">`;
            row.insertCell(3).innerHTML = `<input type="number" id="m2_${idx}" class="grade-input" min="0" max="20" value="${m2}" oninput="window.calcRowGrades('${idx}')">`;
            row.insertCell(4).innerHTML = `<strong id="course_${idx}">${course}</strong>`;
            row.insertCell(5).innerHTML = `<input type="number" id="fe_${idx}" class="grade-input" min="0" max="60" value="${finalExam}" oninput="window.calcRowGrades('${idx}')">`;
            row.insertCell(6).innerHTML = `<strong id="total_${idx}">${total}</strong>`;
            let sCell = row.insertCell(7);
            sCell.id = `status_${idx}`;
            sCell.innerHTML = statusHtml;
            row.insertCell(8).innerHTML = `<button class="btn-save-grade" onclick="window.saveRowGrade('${student.id}', '${idx}')">پاشەکەوت</button>`;
        }
    });
};

window.calculateOverallAverage = function() {
    let dept = document.getElementById('gradeFilterDept').value;
    let grade = document.getElementById('gradeFilterGrade').value;
    let spec = document.getElementById('gradeFilterSpec').value;
    let matchedStudents = globalStudentsData.filter(student => {
        let matchesDept = (dept === "هەمووان") ? true : (student.dept === dept);
        let matchesGrade = String(student.grade) === String(grade);
        let matchesSpec = true;
        if (student.dept === "زانستی کۆمپیوتەر" && (student.grade == 4 || student.grade == 5)) {
            if (spec !== "") matchesSpec = (student.spec === spec);
        }
        return matchesDept && matchesGrade && matchesSpec;
    });
    if (matchedStudents.length === 0) {
        window.showToast('هیچ قوتابییەک نییە!', 'warning', 'نەتیجە و نمرەکان');
        return;
    }
    let container = document.getElementById('avgSubjectList');
    container.innerHTML = "";
    matchedStudents.forEach(st => {
        let grades = st.gradesData || {};
        let subs = Object.keys(grades);
        let sum = 0;
        subs.forEach(sub => { sum += (grades[sub].total || 0); });
        let avg = subs.length > 0 ? (sum / subs.length).toFixed(2) : 0;
        let li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span><strong>${st.name}:</strong></span> <span>مەعدەل: <strong>${avg}</strong></span>`;
        container.appendChild(li);
    });
    document.getElementById('avgStudentName').innerText = 'تێکڕای مەعدەلی قوتابیانی پۆل';
    document.getElementById('avgModal').style.display = 'flex';
};

window.openAllGradesModal = function() {
    let dept = document.getElementById('gradeFilterDept').value;
    let grade = document.getElementById('gradeFilterGrade').value;
    let spec = document.getElementById('gradeFilterSpec').value;
    let matchedStudents = globalStudentsData.filter(student => {
        let matchesDept = (dept === "هەمووان") ? true : (student.dept === dept);
        let matchesGrade = String(student.grade) === String(grade);
        let matchesSpec = true;
        if (student.dept === "زانستی کۆمپیوتەر" && (student.grade == 4 || student.grade == 5)) {
            if (spec !== "") matchesSpec = (student.spec === spec);
        }
        return matchesDept && matchesGrade && matchesSpec;
    });
    if (matchedStudents.length === 0) {
        window.showToast('هیچ قوتابییەک نییە!', 'warning', 'نەتیجە و نمرەکان');
        return;
    }
    let classSubjects = globalSubjectsData.filter(s => {
        let matchesDept = (dept === "هەمووان") ? true : (s.dept === dept);
        let matchesGrade = String(s.grade) === String(grade);
        return matchesDept && matchesGrade;
    });
    let thead = document.getElementById('allGradesReportHead');
    let tbody = document.getElementById('allGradesReportBody');
    thead.innerHTML = ""; tbody.innerHTML = "";

    let headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')).innerText = 'ناوی قوتابی';
    headerRow.appendChild(document.createElement('th')).innerText = 'ID';
    classSubjects.forEach(sub => {
        let th = document.createElement('th'); th.innerText = sub.name; headerRow.appendChild(th);
    });
    headerRow.appendChild(document.createElement('th')).innerText = 'مەعدەل';
    thead.appendChild(headerRow);

    matchedStudents.forEach(st => {
        let row = document.createElement('tr');
        row.appendChild(document.createElement('td')).innerText = st.name;
        row.appendChild(document.createElement('td')).innerText = st.uniqueId || '-';
        let totalSum = 0, count = 0;
        classSubjects.forEach(sub => {
            let td = document.createElement('td');
            let gradeVal = (st.gradesData && st.gradesData[sub.name]) ? st.gradesData[sub.name].total : '-';
            td.innerText = gradeVal;
            if (typeof gradeVal === 'number') { totalSum += gradeVal; count++; }
            row.appendChild(td);
        });
        let tdAvg = document.createElement('td');
        tdAvg.innerHTML = `<strong>${count > 0 ? (totalSum / count).toFixed(2) : '-'}</strong>`;
        row.appendChild(tdAvg);
        tbody.appendChild(row);
    });
    document.getElementById('allGradesModal').style.display = 'flex';
};

window.markAttendance = async function(studentId, status) {
    let now = new Date();
    let dateStr = now.toLocaleDateString('en-GB');
    let timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let fullDateTime = `${dateStr} - ${timeStr}`;
    let recordObj = { status: status, time: fullDateTime };
    
    let student = globalStudentsData.find(s => s.id === studentId);
    if (!student) return;
    let oldStatus = student.attendanceStatus;
    let oldTime = student.attendanceTime;
    let oldHistory = JSON.parse(JSON.stringify(student.attendanceHistory || []));

    showLoading();
    try {
        await updateDoc(doc(db, "students", studentId), {
            attendanceStatus: status,
            attendanceTime: fullDateTime,
            attendanceHistory: arrayUnion(recordObj)
        });

        recordAction('edit_attendance', `ئامادەبوونی قوتابی: ${student.name}`,
            async () => { 
                await updateDoc(doc(db, "students", studentId), {
                    attendanceStatus: oldStatus,
                    attendanceTime: oldTime,
                    attendanceHistory: oldHistory
                }); 
            },
            async () => { 
                await updateDoc(doc(db, "students", studentId), {
                    attendanceStatus: status,
                    attendanceTime: fullDateTime,
                    attendanceHistory: arrayUnion(recordObj)
                }); 
            }
        );

        window.showToast(`ئامادەبوونی قوتابی تۆمارکرا`, 'success', 'ئامادەبوون');
        updateDashboardStats();
    } catch (e) {
        window.showToast('هەڵەیەک ڕوویدا!', 'error', 'ئامادەبوون');
    } finally {
        hideLoading();
    }
};

window.openAttendanceHistory = function(studentId) {
    let student = globalStudentsData.find(s => s.id === studentId);
    if (!student) return;
    document.getElementById('attHistoryStudentName').innerText = `مێژووی ئامادەبوونی: ${student.name}`;
    let listContainer = document.getElementById('attHistoryListContainer');
    listContainer.innerHTML = "";
    let history = student.attendanceHistory || [];
    let presentCount = 0, absentCount = 0;
    history.forEach(h => {
        if (h.status === 'present') presentCount++;
        if (h.status === 'absent') absentCount++;
    });
    document.getElementById('totalPresentCount').innerText = presentCount;
    document.getElementById('totalAbsentCount').innerText = absentCount;
    if (history.length === 0) {
        listContainer.innerHTML = `<li class="empty-history-li">هیچ تۆمارێک نییە</li>`;
    } else {
        history.forEach(h => {
            let badgeClass = h.status === 'present' ? 'status-present' : 'status-absent';
            let statusLabel = h.status === 'present' ? (currentLang === 'en' ? 'Present' : (currentLang === 'ar' ? 'حاضر' : 'ئامادە')) : (currentLang === 'en' ? 'Absent' : (currentLang === 'ar' ? 'غائب' : 'غائیب'));
            let li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `<span class="status-badge ${badgeClass}">${statusLabel}</span><span class="history-time-span">${h.time}</span>`;
            listContainer.appendChild(li);
        });
    }
    document.getElementById('attendanceHistoryModal').style.display = 'flex';
};

window.filterAttendanceTable = function() {
    let selectedDept = document.getElementById('attFilterDept').value;
    let selectedGrade = document.getElementById('attFilterGrade').value;
    let selectedSpec = document.getElementById('attFilterSpec').value;
    let searchVal = (document.getElementById('searchAttendanceInput').value || "").toLowerCase();
    let table = document.getElementById('attendanceTable');
    table.innerHTML = "";
    globalStudentsData.forEach(item => {
        let matchesDept = (selectedDept === "هەمووان") ? true : (item.dept === selectedDept);
        let matchesGrade = String(item.grade) === String(selectedGrade);
        let matchesSpec = true;
        if (item.dept === "زانستی کۆمپیوتەر" && (item.grade == 4 || item.grade == 5)) {
            if (selectedSpec !== "") matchesSpec = (item.spec === selectedSpec);
        }
        let nameMatch = (item.name || "").toLowerCase().includes(searchVal);
        let idMatch = (item.uniqueId || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || nameMatch || idMatch;

        if (matchesDept && matchesGrade && matchesSpec && matchesSearch) {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.name;
            row.insertCell(1).innerText = item.uniqueId || '-';
            row.insertCell(2).innerText = item.dept;
            row.insertCell(3).innerText = item.grade;
            let tdHist = row.insertCell(4);
            tdHist.innerHTML = `<button class="btn-history" onclick="window.openAttendanceHistory('${item.id}')">بینینی هێستۆری 📋</button>`;
            let statusCell = row.insertCell(5);
            if (item.attendanceStatus === 'present') {
                statusCell.innerHTML = `<span class="status-badge status-present">ئامادەیە</span>`;
            } else if (item.attendanceStatus === 'absent') {
                statusCell.innerHTML = `<span class="status-badge status-absent">ئامادە نییە</span>`;
            } else {
                statusCell.innerText = 'تۆمار نەکراوە';
            }
            row.insertCell(6).innerText = item.attendanceTime || '-';
            row.insertCell(7).innerHTML = `
                <button class="btn-present" onclick="window.markAttendance('${item.id}', 'present')">ئامادە</button>
                <button class="btn-absent" onclick="window.markAttendance('${item.id}', 'absent')">غائیب</button>
            `;
        }
    });
};

window.saveStudentSchedule = async function() {
    let dept = document.getElementById('schedDept').value;
    let grade = document.getElementById('schedGrade').value;
    let section = document.getElementById('schedSection').value;
    let subject = document.getElementById('schedSubject').value.trim();
    let lessonNum = document.getElementById('schedLessonNum').value;
    let day = document.getElementById('schedDay').value.trim();
    let timeStart = document.getElementById('schedTimeStart').value;
    let timeEnd = document.getElementById('schedTimeEnd').value;
    if (!dept || !grade || !section || !subject || !lessonNum || !day) {
        window.showToast('تکایە خانەکان پڕبکەرەوە!', 'warning', 'خشتەی قوتابیان');
        return;
    }
    showLoading();
    try {
        let docRef = await addDoc(collection(db, "studentSchedules"), { dept, grade, section, subject, lessonNum, day, timeStart, timeEnd, createdAt: serverTimestamp() });
        
        recordAction('add_student_schedule', `زیادکردنی خشتەی قوتابی: ${subject}`,
            async () => { await deleteDoc(doc(db, "studentSchedules", docRef.id)); },
            async () => { await setDoc(doc(db, "studentSchedules", docRef.id), { dept, grade, section, subject, lessonNum, day, timeStart, timeEnd, createdAt: serverTimestamp() }); }
        );

        window.showToast('وانە زیادکرا', 'success', 'خشتەی قوتابیان');
    } finally {
        hideLoading();
    }
};

function renderStudentSchedules() {
    let table = document.getElementById('studentScheduleTable');
    table.innerHTML = "";
    let searchVal = (document.getElementById('searchStudentScheduleInput').value || "").toLowerCase();
    globalStudentSchedulesData.forEach(docSnap => {
        let item = docSnap.data ? docSnap.data() : docSnap;
        let id = docSnap.id;
        let subMatch = (item.subject || "").toLowerCase().includes(searchVal);
        let dayMatch = (item.day || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || subMatch || dayMatch;

        if (matchesSearch) {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.dept;
            row.insertCell(1).innerText = item.grade;
            row.insertCell(2).innerText = item.section;
            row.insertCell(3).innerText = item.subject;
            row.insertCell(4).innerText = item.lessonNum;
            row.insertCell(5).innerText = item.day;
            row.insertCell(6).innerText = `${item.timeStart} - ${item.timeEnd}`;
            row.insertCell(7).innerHTML = `<button class="icon-btn delete-icon" onclick="window.openDeleteModal('${id}', 'studentSchedules')">${deleteIconSVG}</button>`;
        }
    });
}

onSnapshot(collection(db, "studentSchedules"), (snapshot) => {
    globalStudentSchedulesData = [];
    snapshot.forEach(docSnap => {
        globalStudentSchedulesData.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderStudentSchedules();
});

window.saveTeacherSchedule = async function() {
    let teacherName = document.getElementById('tSchedName').value.trim();
    let subject = document.getElementById('tSchedSubject').value.trim();
    let dept = document.getElementById('tSchedDept').value;
    let lessonNum = document.getElementById('tSchedLessonNum').value;
    let day = document.getElementById('tSchedDay').value.trim();
    let timeStart = document.getElementById('tSchedTimeStart').value;
    let timeEnd = document.getElementById('tSchedTimeEnd').value;
    if (!teacherName || !subject || !dept || !lessonNum || !day) {
        window.showToast('تکایە خانەکان پڕبکەرەوە!', 'warning', 'خشتەی مامۆستایان');
        return;
    }
    showLoading();
    try {
        let docRef = await addDoc(collection(db, "teacherSchedules"), { teacherName, subject, dept, lessonNum, day, timeStart, timeEnd, createdAt: serverTimestamp() });
        
        recordAction('add_teacher_schedule', `زیادکردنی خشتەی مامۆستا: ${teacherName}`,
            async () => { await deleteDoc(doc(db, "teacherSchedules", docRef.id)); },
            async () => { await setDoc(doc(db, "teacherSchedules", docRef.id), { teacherName, subject, dept, lessonNum, day, timeStart, timeEnd, createdAt: serverTimestamp() }); }
        );

        window.showToast('خشتەی مامۆستا زیادکرا', 'success', 'خشتەی مامۆستایان');
    } finally {
        hideLoading();
    }
};

function renderTeacherSchedules() {
    let table = document.getElementById('teacherScheduleTable');
    table.innerHTML = "";
    let searchVal = (document.getElementById('searchTeacherScheduleInput').value || "").toLowerCase();
    globalTeacherSchedulesData.forEach(docSnap => {
        let item = docSnap.data ? docSnap.data() : docSnap;
        let id = docSnap.id;
        let tNameMatch = (item.teacherName || "").toLowerCase().includes(searchVal);
        let subMatch = (item.subject || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || tNameMatch || subMatch;

        if (matchesSearch) {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.teacherName;
            row.insertCell(1).innerText = item.subject;
            row.insertCell(2).innerText = item.dept;
            row.insertCell(3).innerText = item.lessonNum;
            row.insertCell(4).innerText = item.day;
            row.insertCell(5).innerText = `${item.timeStart} - ${item.timeEnd}`;
            row.insertCell(6).innerHTML = `<button class="icon-btn delete-icon" onclick="window.openDeleteModal('${id}', 'teacherSchedules')">${deleteIconSVG}</button>`;
        }
    });
}

onSnapshot(collection(db, "teacherSchedules"), (snapshot) => {
    globalTeacherSchedulesData = [];
    snapshot.forEach(docSnap => {
        globalTeacherSchedulesData.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderTeacherSchedules();
});

onSnapshot(collection(db, "students"), (snapshot) => {
    globalStudentsData = [];
    let table = document.getElementById('studentTable');
    table.innerHTML = "";
    let index = 0;
    let searchVal = (document.getElementById('searchStudentsInput').value || "").toLowerCase();

    snapshot.forEach(docSnap => {
        let student = docSnap.data();
        let id = docSnap.id;
        globalStudentsData.push({ id, ...student });

        let nameMatch = (student.name || "").toLowerCase().includes(searchVal);
        let idMatch = (student.uniqueId || "").toLowerCase().includes(searchVal);
        let phoneMatch = (student.phone || "").toLowerCase().includes(searchVal);
        let matchesSearch = !searchVal || nameMatch || idMatch || phoneMatch;

        if (matchesSearch) {
            index++;
            let row = table.insertRow();
            row.insertCell(0).innerHTML = `<strong>${index}</strong>`;
            row.insertCell(1).innerText = student.name;
            row.insertCell(2).innerText = student.uniqueId || '-';
            row.insertCell(3).innerText = student.phone || '-';
            row.insertCell(4).innerText = student.dept || '-';
            row.insertCell(5).innerText = student.grade;
            row.insertCell(6).innerText = student.spec || '-';
            row.insertCell(7).innerText = student.section;
            row.insertCell(8).innerHTML = `
                <button class="icon-btn edit-icon" onclick="window.prepareEdit('${id}', '${student.name}', '${student.uniqueId || ''}', '${student.phone || ''}', '${student.dept || ''}', '${student.grade}', '${student.spec || ''}', '${student.section}')">${editIconSVG}</button>
                <button class="icon-btn delete-icon" onclick="window.openDeleteModal('${id}', 'students')">${deleteIconSVG}</button>
            `;
        }
    });
    window.filterStudentsTable();
    window.filterAttendanceTable();
    window.renderTuitionStudentsDropdown();
    updateDashboardStats();
    if (window.updateGradeSubjectsDropdown) window.updateGradeSubjectsDropdown();
});

window.confirmDelete = async function() {
    let id = itemToDeleteId;
    let col = deleteCollectionName;
    window.closeDeleteModal();
    if (id && col) {
        showLoading();
        try {
            let deletedDocRef = doc(db, col, id);
            let docSnap = await getDoc(deletedDocRef);
            let deletedData = docSnap.exists() ? docSnap.data() : null;

            await deleteDoc(deletedDocRef);

            if (deletedData) {
                recordAction('delete_item', `سڕینەوە لە ${col}`,
                    async () => { await setDoc(doc(db, col, id), deletedData); },
                    async () => { await deleteDoc(doc(db, col, id)); }
                );
            }

            window.showToast('داتا سڕایەوە', 'delete', 'سڕینەوە');
            updateDashboardStats();
        } catch (e) {
            window.showToast('هەڵەیەک ڕوویدا!', 'error', 'سڕینەوە');
        } finally {
            hideLoading();
        }
    }
};